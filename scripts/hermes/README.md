# Hermes PR-triage tooling

Read-only helpers used to produce [`docs/PR_TRIAGE.md`](../../docs/PR_TRIAGE.md)
for the 80 open PRs in zarmih/fokus. Nothing here touches the network, pushes,
or modifies PR state — every check runs against local refs
`refs/remotes/pr/<n>` and `origin/main`.

## Scripts

| Script | What it does |
|--------|--------------|
| `triage_collect.py` | Per PR: `git cherry` (+/-), commits ahead, diffstat, `git merge-tree` conflict list, changed files. Writes JSONL to a path you pass (default `/tmp/pr_evidence.jsonl`). |
| `triage_analyze.py` | Per PR: how many of the PR's added lines already exist verbatim in main's version of each touched file (textual coverage). Writes `/tmp/pr_analysis.json`. |
| `triage_net.py` | Per PR: net `origin/main..pr` diffstat — shows how much main has drifted since the branch point. Writes `/tmp/pr_net.json`. |
| `triage_reverse.py` | The ALREADY_IN_MAIN test: `git apply --reverse --check` of each PR's own 3-dot patch, whole and per file. Writes `/tmp/pr_reverse.json`. |
| `triage_dupes.py` | First-pass duplicate detection: identical/near-identical changed-file sets. |
| `triage_dupes2.py` | Duplicate detection by commit-set containment (finds stacked PRs: A's commits ⊂ B's). |
| `triage_digest.py` | Full per-PR diff digest with hunk headers (verbose, ~33k lines). |
| `triage_compact.py` | Same, but lockfiles skipped and hunks capped (readable in one sitting). |
| `triage_render.py` | Renders `docs/PR_TRIAGE.md` from `/tmp/pr_evidence.jsonl` + the hand-written verdict table. Run this after editing verdicts. |

## Reproducing

```sh
cd /workspace/cloud/hermes/fokus
git fetch origin '+refs/heads/*:refs/remotes/origin/*'
for n in $(gh pr list --state open --json number -q '.[].number'); do
  git fetch origin "pull/$n/head:refs/remotes/pr/$n"
done

flock /tmp/heavy-gate.lock python3 scripts/hermes/triage_collect.py /tmp/pr_evidence.jsonl
flock /tmp/heavy-gate.lock python3 scripts/hermes/triage_analyze.py
flock /tmp/heavy-gate.lock python3 scripts/hermes/triage_reverse.py
flock /tmp/heavy-gate.lock python3 scripts/hermes/triage_dupes2.py
flock /tmp/heavy-gate.lock python3 scripts/hermes/triage_compact.py
python3 scripts/hermes/triage_render.py     # rewrites docs/PR_TRIAGE.md
```

Heavy steps are wrapped in `flock /tmp/heavy-gate.lock` so they never overlap
with other test runs on this host.

## Note on categories

`ALREADY_IN_MAIN` is a judgement about the *substantive* change, evidenced by a
file:line in main — not a claim that the branch tree is empty. Reverse-applying
every PR's patch onto main failed for all 80 (only `package-lock.json` churn ever
applied cleanly), so no branch is literally empty.