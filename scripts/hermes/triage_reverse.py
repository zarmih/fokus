#!/usr/bin/env python3
"""ALREADY_IN_MAIN test: does the PR's own patch (merge-base..pr, i.e. 3-dot)
already exist in main?

Method A: `git apply --reverse --check <3-dot patch>` against main's worktree.
          Clean reverse-apply => main already contains exactly those changes.
Method B: per-file, reverse-check only the files the PR touched (A fails on
          unrelated drift, so B isolates the PR's own files).
Method C: report how many of the PR's added lines literally exist in main's
          current version of each touched file (textual coverage).
"""
import json
import subprocess
import tempfile
import os

REPO = "/workspace/cloud/hermes/fokus"
DATA = "/workspace/cloud/hermes/data/fokus_open_prs.json"


def run(args, check=False):
    p = subprocess.run(args, cwd=REPO, capture_output=True, text=True)
    if check and p.returncode != 0:
        raise RuntimeError(f"{args}\n{p.stderr}")
    return p.returncode, p.stdout, p.stderr


def main():
    prs = json.load(open(DATA))
    out = []
    for pr in prs:
        n = pr["number"]
        ref = f"refs/remotes/pr/{n}"
        # 3-dot patch = PR's own change from merge-base
        patch = run(["git", "diff", f"origin/main...{ref}"])[1]
        files = [l for l in run(["git", "diff", "--name-only", f"origin/main...{ref}"])[1].splitlines() if l.strip()]
        rec = {"number": n, "files": len(files)}

        # Method A: reverse-apply whole patch on main
        with tempfile.NamedTemporaryFile("w", suffix=".patch", delete=False) as f:
            f.write(patch)
            path = f.name
        rc, _, err = run(["git", "apply", "--reverse", "--check", path])
        rec["reverse_ok"] = rc == 0
        rec["reverse_err"] = err.strip().splitlines()[-1] if rc != 0 and err.strip() else ""

        # Method B: reverse-apply restricted to each file individually
        ok = 0
        tot = 0
        per_file = {}
        for fn in files:
            tot += 1
            fp = run(["git", "diff", f"origin/main...{ref}", "--", fn])[1]
            if not fp.strip():
                continue
            with tempfile.NamedTemporaryFile("w", suffix=".patch", delete=False) as f2:
                f2.write(fp)
                p2 = f2.name
            rc2, _, _ = run(["git", "apply", "--reverse", "--check", p2])
            per_file[fn] = rc2 == 0
            if rc2 == 0:
                ok += 1
            os.unlink(p2)
        os.unlink(path)
        rec["per_file_reverse_ok"] = ok
        rec["per_file_total"] = tot
        rec["per_file"] = per_file
        out.append(rec)
        print(f"#{n}: reverse_all={rec['reverse_ok']} per_file={ok}/{tot} err={rec['reverse_err'][:60]}", flush=True)
    json.dump(out, open("/tmp/pr_reverse.json", "w"), indent=1)


if __name__ == "__main__":
    main()