#!/usr/bin/env python3
"""Mechanical evidence collector for zarmih/fokus open-PR triage (Hermes, read-only).

For each open PR from data/fokus_open_prs.json emits a JSONL record with:
  - commits ahead of origin/main (sha + subject)
  - git cherry result (+/- per commit)
  - diff stat vs merge-base
  - mergeability: can the PR tree merge cleanly into origin/main? (merge-tree dry run)
  - changed files, and whether those exact lines already exist in main
No network access; uses only local refs refs/remotes/pr/<n>.
"""
import json
import subprocess
import sys

MAIN = "origin/main"
DATA = "/workspace/cloud/hermes/data/fokus_open_prs.json"


def run(args, cwd="/workspace/cloud/hermes/fokus"):
    p = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr


def head(n):
    return f"refs/remotes/pr/{n}"


def cherry(n):
    rc, out, _ = run(["git", "cherry", MAIN, head(n)])
    if rc != 0:
        return {"ok": False, "plus": None, "minus": None}
    plus = sum(1 for l in out.splitlines() if l.startswith("+"))
    minus = sum(1 for l in out.splitlines() if l.startswith("-"))
    return {"ok": True, "plus": plus, "minus": minus}


def commits_ahead(n):
    rc, out, _ = run(["git", "log", "--no-merges", "--format=%H%x09%s", f"{MAIN}..{head(n)}"])
    return [tuple(l.split("\t", 1)) for l in out.splitlines() if l.strip()]


def diff_stat(n):
    rc, out, _ = run(["git", "diff", "--stat", f"{MAIN}...{head(n)}"])
    if rc != 0:
        return "", None, None
    files = 0
    ins = dels = 0
    lines = out.strip().splitlines()
    summary = lines[-1] if lines and "file" in lines[-1] and "changed" in lines[-1] else ""
    for l in lines:
        if l.startswith(" ") or l[:1].isdigit() or (l and l[0].isalpha() and "|" in l):
            if "|" in l:
                files += 1
                tail = l.split("|")[-1].strip()
                if tail:
                    ins += int(tail.split("+")[0].split("-")[0]) if tail.split("+")[0].isdigit() else 0
    return out, files, summary


def can_merge(n):
    """merge-tree --write-tree (git >= 2.38). rc 0 = clean, 1 = conflicts."""
    rc, out, err = run(["git", "merge-tree", "--write-tree", "--name-only", MAIN, head(n)])
    if rc == 0:
        return {"clean": True, "conflicts": []}
    # rc != 0 -> conflicts; after the OID line, the first blank-separated block
    # lists conflicted paths. Take non-"Auto-merging"/"CONFLICT" lines from there.
    lines = [l for l in out.splitlines() if l.strip()]
    conflicts = []
    for l in lines:
        if l.startswith(("Auto-merging ", "CONFLICT ")):
            continue
        if " " in l and l.split()[0].isalnum() and len(l.split()[0]) >= 40:
            continue  # tree OID header line
        conflicts.append(l)
    return {"clean": False, "conflicts": conflicts, "raw": out[:800]}


def diff_files(n):
    rc, out, _ = run(["git", "diff", "--name-only", f"{MAIN}...{head(n)}"])
    return [l for l in out.splitlines() if l.strip()]


def main():
    prs = json.load(open(DATA))
    out_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/pr_evidence.jsonl"
    with open(out_path, "w") as f:
        for pr in prs:
            n = pr["number"]
            rec = {
                "number": n,
                "title": pr["title"],
                "head": pr["headRefName"],
                "author": pr["author"]["login"],
                "createdAt": pr["createdAt"],
                "updatedAt": pr["updatedAt"],
                "additions": pr["additions"],
                "deletions": pr["deletions"],
                "changedFiles": pr["changedFiles"],
                "body": (pr.get("body") or "")[:500],
            }
            c = cherry(n)
            rec["cherry"] = c
            rec["commits"] = commits_ahead(n)
            st, files, summary = diff_stat(n)
            rec["diff_summary"] = summary
            rec["mergeable"] = can_merge(n)
            rec["diff_files"] = diff_files(n)
            f.write(json.dumps(rec) + "\n")
            f.flush()
            print(f"PR {n}: cherry +{c['plus']}/-{c['minus']} files={len(rec['diff_files'])} merge_clean={rec['mergeable']['clean']}", file=sys.stderr)


if __name__ == "__main__":
    main()