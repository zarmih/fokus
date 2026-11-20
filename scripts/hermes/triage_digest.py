#!/usr/bin/env python3
"""Compact per-PR diff digest for manual review: commit subject, files, hunk headers,
and added/removed line snippets (truncated). Writes /tmp/pr_digest.txt
"""
import json
import subprocess

REPO = "/workspace/cloud/hermes/fokus"
DATA = "/workspace/cloud/hermes/data/fokus_open_prs.json"


def run(args):
    p = subprocess.run(args, cwd=REPO, capture_output=True, text=True)
    return p.stdout


def digest(n):
    pr = next(p for p in json.load(open(DATA)) if p["number"] == n)
    out = []
    out.append("=" * 100)
    out.append(f"PR #{n} | {pr['title']} | {pr['headRefName']} | {pr['createdAt'][:10]} | +{pr['additions']}/-{pr['deletions']}")
    out.append(f"body: {(pr.get('body') or '').strip()[:200]}")
    commits = run(["git", "log", "--no-merges", "--format=%h %s", f"origin/main..refs/remotes/pr/{n}"])
    out.append("commits: " + " | ".join(l for l in commits.splitlines() if l.strip()))
    d = run(["git", "diff", "--unified=1", f"origin/main...refs/remotes/pr/{n}"])
    cur = None
    for line in d.splitlines():
        if line.startswith("diff --git"):
            cur = line.split(" b/")[-1]
            out.append(f"  --- {cur}")
        elif line.startswith("@@"):
            out.append("    " + line[:160])
        elif line.startswith(("+", "-")) and not line.startswith(("+++", "---")):
            s = line[1:].strip()
            if not s:
                continue
            out.append("    " + line[0] + " " + s[:150])
    return "\n".join(out)


if __name__ == "__main__":
    prs = [p["number"] for p in json.load(open(DATA))]
    with open("/tmp/pr_digest.txt", "w") as f:
        for n in prs:
            f.write(digest(n) + "\n")
            f.flush()
    print("done")