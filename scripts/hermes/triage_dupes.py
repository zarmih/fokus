#!/usr/bin/env python3
"""Third pass: duplicate clustering + per-PR summary for manual judgement.

Duplicate signal: for each PR pair compute
  - changed-file Jaccard
  - tree similarity: PR_A tree vs PR_B tree via `git diff --shortstat` between the
    two PR heads restricted to files A touches. Identical or near-identical
    resulting trees => duplicate work.
Also: which PRs touch exactly the same single file set.
"""
import json
import subprocess
import itertools

REPO = "/workspace/cloud/hermes/fokus"
DATA = "/workspace/cloud/hermes/data/fokus_open_prs.json"


def run(args):
    p = subprocess.run(args, cwd=REPO, capture_output=True, text=True)
    return p.returncode, p.stdout


def tree_diff(a, b):
    rc, out = run(["git", "diff", "--shortstat", f"refs/remotes/pr/{a}", f"refs/remotes/pr/{b}"])
    return out.strip()


def main():
    prs = {p["number"]: p for p in json.load(open(DATA))}
    ev = {json.loads(l)["number"]: json.loads(l) for l in open("/tmp/pr_evidence.jsonl")}

    # save full trees list for pairwise
    pairs = []
    for a, b in itertools.combinations(sorted(prs), 2):
        fa = set(ev[a]["diff_files"])
        fb = set(ev[b]["diff_files"])
        if not fa or not fb:
            continue
        jac = len(fa & fb) / len(fa | fb)
        if jac >= 0.99:
            pairs.append((jac, a, b, tree_diff(a, b)))
    pairs.sort(reverse=True)
    print("=== identical file-set pairs (Jaccard=1.0) ===")
    for jac, a, b, td in pairs:
        print(f"#{a} <-> #{b}  jaccard={jac:.2f}  tree-diff[{a}..{b}]={td or 'IDENTICAL'}")

    # also: same single-file change
    print()
    print("=== PRs touching exactly one file, grouped by file ===")
    from collections import defaultdict
    g = defaultdict(list)
    for n, e in ev.items():
        if len(e["diff_files"]) == 1:
            g[e["diff_files"][0]].append(n)
    for f, ns in sorted(g.items()):
        if len(ns) > 1:
            print(f"{f}: {sorted(ns)}")


if __name__ == "__main__":
    main()