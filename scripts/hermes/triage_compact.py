#!/usr/bin/env python3
"""Compact per-PR digest: skip lockfiles, cap hunks, so all 80 fit in a readable file."""
import json
import re
import subprocess

REPO = "/workspace/cloud/hermes/fokus"
DATA = "/workspace/cloud/hermes/data/fokus_open_prs.json"
SKIP = re.compile(r"(package-lock\.json|^docs/|^ARCHITECTURE|^CHANGELOG|\.md$)")


def run(args):
    return subprocess.run(args, cwd=REPO, capture_output=True, text=True).stdout


def digest(n):
    pr = next(p for p in json.load(open(DATA)) if p["number"] == n)
    out = [f"### PR #{n} | {pr['title']} | {pr['headRefName']} | {pr['createdAt'][:10]} | +{pr['additions']}/-{pr['deletions']}"]
    body = (pr.get("body") or "").strip().replace("\n", " ")
    out.append(f"  body: {body[:160]}")
    commits = run(["git", "log", "--no-merges", "--format=%h %s", f"origin/main..refs/remotes/pr/{n}"])
    out.append("  commits: " + " | ".join(l for l in commits.splitlines() if l.strip()))
    d = run(["git", "diff", "--unified=0", f"origin/main...refs/remotes/pr/{n}"])
    cur = None
    hunk = None
    hunks = 0
    keep = []
    for line in d.splitlines():
        if line.startswith("diff --git"):
            cur = line.split(" b/")[-1]
            if SKIP.search(cur):
                cur = None
            continue
        if cur is None:
            continue
        if line.startswith("@@"):
            hunks += 1
            hunk = line[:120]
            keep.append(("H", hunk))
            continue
        if line.startswith(("+", "-")) and not line.startswith(("+++", "---")):
            s = line[1:].strip()
            if s:
                keep.append((line[0], s[:130]))
    # per file: keep at most 3 changed lines per hunk
    out.append(f"  files: {', '.join(f for f in (set() ) )}")
    cur_file = None
    count = 0
    for kind, txt in keep:
        if kind == "H":
            cur_file = None
            count = 0
            out.append("    " + txt)
        else:
            if count < 3:
                out.append("      " + kind + " " + txt)
            count += 1
    return "\n".join(out)


if __name__ == "__main__":
    prs = [p["number"] for p in json.load(open(DATA))]
    with open("/tmp/pr_compact.txt", "w") as f:
        for n in prs:
            f.write(digest(n) + "\n")
    print("ok")