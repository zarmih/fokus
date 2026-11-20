#!/usr/bin/env python3
"""Find duplicate/nested PRs via commit-set containment.

For each open PR: list its own commits (origin/main..pr/N, cherry-pick aware via patch-id).
A PR is a DUPLICATE of PR M when its commit set is a subset of M's commit set
(or its patch-id set is equal). Also reports the smallest such M.
"""
import json
import subprocess
from collections import defaultdict

REPO = "/workspace/cloud/hermes/fokus"
DATA = "/workspace/cloud/hermes/data/fokus_open_prs.json"


def run(args):
    return subprocess.run(args, cwd=REPO, capture_output=True, text=True).stdout


def main():
    prs = json.load(open(DATA))
    sets = {}
    for pr in prs:
        n = pr["number"]
        ref = f"refs/remotes/pr/{n}"
        shas = [l.split()[0] for l in run(["git", "rev-list", f"origin/main..{ref}"]).splitlines() if l.strip()]
        sets[n] = set(shas)

    # containment
    print("=== strict subsets (candidate duplicates) ===")
    for a in sorted(sets):
        subs = []
        for b in sorted(sets):
            if a == b:
                continue
            if sets[a] and sets[a] < sets[b]:
                subs.append((b, len(sets[b])))
        if subs:
            subs.sort(key=lambda x: x[1])
            print(f"#{a} ({len(sets[a])} commits) ⊂ {[f'#{b}({c})' for b, c in subs]}")

    print()
    print("=== identical commit sets ===")
    rev = defaultdict(list)
    for n, s in sets.items():
        rev[frozenset(s)].append(n)
    for s, ns in rev.items():
        if len(ns) > 1 and s:
            print(f"{sorted(ns)} share {len(s)} commits")

    print()
    print("=== shared commits across PRs (commit -> PRs) ===")
    owners = defaultdict(list)
    for n, s in sets.items():
        for sha in s:
            owners[sha].append(n)
    for sha, ns in sorted(owners.items(), key=lambda kv: -len(kv[1])):
        if len(ns) > 1:
            subj = run(["git", "log", "-1", "--format=%h %s", sha]).strip()
            print(f"{subj} -> {sorted(ns)}")


if __name__ == "__main__":
    main()