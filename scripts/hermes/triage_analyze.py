#!/usr/bin/env python3
"""Second pass: for each PR, measure how much of its diff already exists in main.

Method (per PR, against refs/remotes/pr/<n>):
  1. 3-way diff origin/main -> pr; for each changed file compute added-line
     coverage: fraction of the PR's added lines (present in the PR blob) that
     ALSO appear in main's version of that file. High coverage == change is
     already in main (verbatim or textually equivalent).
  2. Patch-id comparison: `git cherry` already done in pass 1.
  3. Directory/file-level overlap: does the PR touch files that no longer
     exist in main? (obsolete PR)
  4. Pairwise duplicate detection: Jaccard similarity of changed-file sets
     and identical added-line ratio between PR pairs.

Writes JSON to /tmp/pr_analysis.json
"""
from triage_paths import REPO, DATA, OUTPUT
import json
import subprocess
from collections import defaultdict

MAIN = "origin/main"


def run(args):
    p = subprocess.run(args, cwd=REPO, capture_output=True, text=True)
    return p.returncode, p.stdout


def blob(ref, path):
    rc, out = run(["git", "show", f"{ref}:{path}"])
    return out if rc == 0 else None


def added_lines(n):
    """Return dict path -> set of added lines (text) from origin/main...pr."""
    rc, out = run(["git", "diff", "--unified=0", f"{MAIN}...refs/remotes/pr/{n}"])
    if rc != 0:
        return {}
    res = defaultdict(set)
    cur = None
    for line in out.splitlines():
        if line.startswith("+++ b/"):
            cur = line[6:]
        elif line.startswith("+++ "):
            cur = None
        elif line.startswith("+") and not line.startswith("+++"):
            if cur:
                res[cur].add(line[1:])
    return res


def main_lines(ref, path):
    c = blob(ref, path)
    if c is None:
        return None
    return set(c.splitlines())


def main():
    prs = json.load(open(DATA))
    ev = {json.loads(l)["number"]: json.loads(l) for l in open(OUTPUT / "pr_evidence.jsonl")}
    out = {}
    for pr in prs:
        n = pr["number"]
        ref = f"refs/remotes/pr/{n}"
        adds = added_lines(n)
        per_file = {}
        total_added = 0
        total_present = 0
        for path, lines in adds.items():
            ml = main_lines(MAIN, path)
            if ml is None:
                per_file[path] = {"added": len(lines), "present_in_main": 0,
                                  "file_missing_in_main": True,
                                  "coverage": 0.0}
                total_added += len(lines)
                continue
            present = sum(1 for l in lines if l in ml)
            per_file[path] = {"added": len(lines), "present_in_main": present,
                              "file_missing_in_main": False,
                              "coverage": round(present / len(lines), 4) if lines else 1.0}
            total_added += len(lines)
            total_present += present
        out[n] = {
            "added_lines_total": total_added,
            "added_lines_in_main": total_present,
            "line_coverage": round(total_present / total_added, 4) if total_added else 1.0,
            "per_file": per_file,
        }
        print(f"#{n}: coverage={out[n]['line_coverage']}", flush=True)
    json.dump(out, open(OUTPUT / "pr_analysis.json", "w"), indent=1)


if __name__ == "__main__":
    main()
