#!/usr/bin/env python3
"""Net-diff analysis: what does each PR actually change RELATIVE TO CURRENT MAIN?

Two-dot diff `origin/main..pr/N` = the change that merging this PR would introduce.
If empty -> tree identical -> ALREADY_IN_MAIN.
Also computes per-PR: net files, net lines, and which commits are NOT in main.
"""
import json
import subprocess

REPO = "/workspace/cloud/hermes/fokus"
DATA = "/workspace/cloud/hermes/data/fokus_open_prs.json"


def run(args):
    p = subprocess.run(args, cwd=REPO, capture_output=True, text=True)
    return p.stdout


def main():
    prs = json.load(open(DATA))
    out = []
    for pr in prs:
        n = pr["number"]
        ref = f"refs/remotes/pr/{n}"
        # net diff main -> pr
        d = run(["git", "diff", "--stat", f"origin/main..{ref}"])
        short = run(["git", "diff", "--shortstat", f"origin/main..{ref}"]).strip()
        names = [l for l in run(["git", "diff", "--name-status", f"origin/main..{ref}"]).splitlines() if l.strip()]
        # commits in pr but not in main (cherry-pick aware)
        ch = run(["git", "cherry", "origin/main", ref])
        plus = sum(1 for l in ch.splitlines() if l.startswith("+"))
        minus = sum(1 for l in ch.splitlines() if l.startswith("-"))
        out.append({
            "number": n,
            "net_shortstat": short,
            "net_files": len(names),
            "net_name_status": names,
            "cherry_plus": plus,
            "cherry_minus": minus,
        })
        print(f"#{n}: net=[{short}] files={len(names)} cherry +{plus}/-{minus}", flush=True)
    json.dump(out, open("/tmp/pr_net.json", "w"), indent=1)


if __name__ == "__main__":
    main()