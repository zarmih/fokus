# Open PR triage — zarmih/fokus

Hermes triage of all 80 open PRs. Local clone `/workspace/cloud/hermes/fokus`,
branch `hermes/pr-triage`, base `origin/main` @ 7b726a2.
No PR was merged, closed or commented on.

## Method (all local, no network)

Every head is fetched as `refs/remotes/pr/<n>`; nothing was pushed.

```
git cherry origin/main refs/remotes/pr/<n>                  # patch-id: '-' = in main
git log --oneline origin/main..refs/remotes/pr/<n>          # commits the PR would add
git diff --stat origin/main...refs/remotes/pr/<n>           # the PR's own change
git merge-tree --write-tree origin/main refs/remotes/pr/<n> # conflict list
git apply --reverse --check <3-dot patch>                  # is main already this?
git rev-list <a> ^origin/main  /  set containment           # stack duplicates
```

Scripts (committed): `scripts/hermes/triage_collect.py` (cherry, merge-tree, diffstat),
`triage_analyze.py` (added-line coverage vs main), `triage_reverse.py` (reverse-apply),
`triage_dupes2.py` (commit-set containment), `triage_digest.py` / `triage_compact.py`
(per-PR diff digest), `triage_net.py`, `triage_render.py` (this document).

## Two headline findings

1. **No PR is wholesale already in main.** Reverse-applying each PR's own 3-dot
   patch onto main failed for all 80 (`triage_reverse.py`: `reverse_all=True` count 0).
   The only files that ever reverse-applied cleanly were `package-lock.json` churn.
   So ALREADY_IN_MAIN below means *the substantive change* is present in main,
   cited by file:line — not that the branch is empty.
2. **The real problem is stack duplication, not conflict.** 14 commits are shared
   across 2-6 PRs (99bdb2b in #83/#100/#105/#107/#108/#115; 7d83ed8 in
   #100/#105/#107/#108/#115; d136f5a in #105/#107/#108/#115; 17d4434 in
   #103/#112/#117). Merging the superset PR of each stack settles the whole stack.

## Summary

| Category | Count |
|----------|-------|
| ALREADY_IN_MAIN | 12 |
| DUPLICATE | 15 |
| STALE | 15 |
| WORTH_FINISHING | 38 |
| **total** | **80** |

Categories - ALREADY_IN_MAIN: substantive change present in main (file:line given).
DUPLICATE: same commits/tree as another named open PR. STALE: superseded, obsolete,
or an unadopted direction. WORTH_FINISHING: unique valuable change, with what remains.

## Per-PR detail

| # | Title | Category | Evidence | Recommendation |
|---|-------|----------|----------|----------------|
| #45 | Не мержить без ревью: UX polish (Peak-level feel) | WORTH_FINISHING | 6 files, +142/-22. Visual polish: `scale-track` on result-block, extra audio cues in src/core/audio.ts, main.ts wiring, styles. main has none of the new class names (`fx-pulse-ok` / `fx-handoff-*` absent from src/styles.css). 4 conflicts (result.ts, today.ts, styles.css) because main rewrote both screens (8e14bea, 29026cd). | Rebase the 3 visual/interaction bits onto today's result.ts/today.ts; drop the .md notes. |
| #46 | Phase 2 Depth F | STALE | 10 files, +93/-22, 19% deletions. Streak/grace mechanics in src/core/streak.ts + a storage field; superseded by main's retention/continuity layer (src/core/retention.ts, src/ui/components/habit-continuity.ts). 9 conflicting files. | Close as superseded by the retention work already in main. |
| #47 | Batch AA: A11Y + PWA polish | DUPLICATE | 26 files, +772/-110. Superset bundle: the chord-tap/lattice-span/dial-flip dirs of #48/#49, the #48 onboarding rewrite, and a11y landmarks already in main (src/ui/shell.ts:94,110, c5aec64). 10 conflicting files. | DUPLICATE of #48/#49 — close #47. |
| #48 | Не мержить без ревью | DUPLICATE | 15 files, +685/-48. Same 3 exercises as #49 — byte-identical (md5 of chord-tap/engine.ts, lattice-span/view.ts, dial-flip/manifest.ts match #49) — plus an onboarding rewrite already in main (src/ui/screens/onboarding.ts:28). | DUPLICATE of #49 — close #48. |
| #49 | Не мержить без ревью | WORTH_FINISHING | 14 files, +646/-2. chord-tap, lattice-span, dial-flip exercises (engine/index/manifest/view + registry). Verified absent from main: `grep -c` for the three ids in src/exercises/registry.ts returns 0. Only 2 conflicts. | Land the 3 exercises: port registry entries + art icons, run vitest. |
| #50 | Не мержить без ревью | WORTH_FINISHING | 5 files, +120/-1. Coach weekly-domain tips + a weekly-review section + audio cue. main has `getWeeklyDomainTips` only inside coach-intel.ts:489 (re-exported at coach.ts:369), not the PR's extra wiring/section. | Re-apply the coach.ts + weekly-review.ts additions; check tip copy against the honesty rules. |
| #51 | Не мержить без ревью | DUPLICATE | 14 files, +539/-1. blaze-tap / hive-span / hinge-swap — identical file contents to #52 (md5 of blaze-tap/view.ts, hive-span/engine.ts, hinge-swap/manifest.ts match). All 3 ids absent from main. | DUPLICATE of #52 — close #51, keep #52. |
| #52 | Не мержить без ревью | WORTH_FINISHING | 19 files, +645/-2. blaze-tap + hive-span + hinge-swap exercises plus Depth-G coach bits. All 3 ids absent from main registry. | Preferred vehicle for the blaze-tap/hive-span/hinge-swap batch; land here and close #51. |
| #53 | Не мержить без ревью | WORTH_FINISHING | 6 files, +538/-1. nova-tap, cellar-span, rudder-flip exercises. All 3 ids absent from main. Only 3 conflicts. | Land the 3 exercises; add the public/art icons the PR omits. |
| #54 | Не мержить без ревью: Phase 3 Depth H | DUPLICATE | 6 files, +253/-89. `git diff refs/remotes/pr/54 refs/remotes/pr/55` is empty — byte-identical trees. Phase 3 Depth H (radar/progress insights + catalog search). | DUPLICATE pair — keep #54, close #55. |
| #55 | Не мержить без ревью | DUPLICATE | 6 files, +253/-89. Identical tree to #54 (`git diff refs/remotes/pr/54 refs/remotes/pr/55` = empty). | DUPLICATE of #54 — close #55. |
| #56 | Не мержить без ревью | WORTH_FINISHING | 5 files, +450/-1. crate-span, ember-tap, lever-flip exercises. All 3 absent from main. | Land the 3 exercises + registry + art icons. |
| #70 | feat(i18n): G13 RU/EN completeness for shell/today/program/settin... | STALE | 24 files, +1451/-215, 20 conflicting files (worst in the set). Old G13 RU/EN dictionary pass; main now has a much larger i18n layer (src/core/i18n.ts `L()`, plus the per-screen EN work 5b5a005 / e2b951d / 1f7487c). | Close as superseded by the incremental i18n work merged in September. |
| #71 | feat(coach): G16 longitudinal metrics — EWMA deltas and focus of ... | WORTH_FINISHING | 13 files, +1266/-2. Adds src/core/coach-longitudinal.ts (625 lines) + coach card + settings toggle. Verified absent from main (`ls src/core/coach-longitudinal.ts` -> none). Only 6 conflicts. | Highest-value unmerged PR. Port coach-longitudinal.ts + card; re-run coach tests. |
| #72 | feat(core): duel readiness and retention depth (G15) | WORTH_FINISHING | 13 files, +1111/-31. G15 duel readiness + retention risk model (`assessDuelReadiness`, `RetentionRiskModel`) — main's src/core/retention.ts has 0 hits for `riskModel` / `assessDuelReadiness`. 7 conflicts. | Port the retention.ts additions + duel.ts readiness; keep the spectator-safe payload rule. |
| #73 | feat: deep focus mode for sessions (G17) — Не мержить без ревью | DUPLICATE | 11 files, +1064/-63. Its single commit 1fbd2f6 (G17 focus mode) is a strict subset of #93 (which adds D5); verified by `git rev-list` set containment. | DUPLICATE of #93 — close #73, review #93. |
| #74 | feat(core): G18 weekly narrative report — Не мержить без ревью | DUPLICATE | 14 files, +1865/-39. Commit d522a7d (G18 weekly report) is a strict subset of #95, which also carries the empty-states/i18n work. | DUPLICATE of #95 — close #74. |
| #75 | feat(exercises): G19 difficulty curves — Не мержить без ревью | WORTH_FINISHING | 21 files, +914/-16. Adds src/core/diff-curves.ts + `diffCurve` manifest metadata and wires 5 engines. Verified absent from main (`ls src/core/diff-curves.ts` -> none; no diffCurve in src/exercises/contract.ts). | Land diff-curves.ts + the 5 engine wirings; the metadata is inert, so low risk. |
| #76 | feat(copy): G20 ritual copy intelligence — Не мержить без ревью | WORTH_FINISHING | 9 files, +1425/-131. Adds src/core/ritual-copy.ts (789 lines) + getDailyRitualCopy. Absent from main. 6 conflicts, all in coach.ts/today.ts. | Port ritual-copy.ts + coach.ts wiring; keep the FORBIDDEN_COPY_RE guard test. |
| #77 | feat(motion): G22 session transitions & ritual halo — Не мержить ... | WORTH_FINISHING | 9 files, +576/-27. G22 motion tokens (pulse/exit/handoff/halo) + session enter/exit classes. main's MOTION const has only instant/fast/base/slow/ritual (src/core/motion.ts:6) — no pulse/exit/handoff/halo. | Land motion.ts tokens + CSS; keep the html[data-motion=reduce] overrides the PR includes. |
| #78 | feat(adaptive): G21 mastery decay + spaced re-probe — Не мержить ... | WORTH_FINISHING | 14 files, +1065/-15. Adds src/core/mastery-decay.ts (507 lines) + applyReprobeBias. Absent from main. 8 conflicts. | Land mastery-decay.ts + the adaptive-depth re-export; add unit tests for the decay windows. |
| #79 | Не мержить без ревью | WORTH_FINISHING | 13 files, +1325/-10. Adds src/core/retention-advisor.ts (582 lines) + load-advisor card. `adviseNextLoad` has 0 hits in main. 7 conflicts. | Land retention-advisor.ts + load-advisor-card; the today.ts wiring needs a rebase. |
| #80 | Углуби статистику/прогресс (Не мержить без ревью) | WORTH_FINISHING | 3 files, +22/-15, 41% deletions. Progress/radar honesty polish: Fokus Index `fi-help` tooltip, quieter radar, honest empty states. main has no `fi-help` (0 hits in src/ui/screens/progress.ts) and no hasData-style radar empty state of this shape. | Re-apply the Fokus Index tooltip + empty-state copy onto current progress.ts. |
| #81 | Не мержить без ревью: A5 PWA and a11y | STALE | 7 files, +73/-59, 45% deletions. PWA caching + ARIA/landmarks. main already has the landmarks (c5aec64) and a full pwa-install module (src/pwa-install.ts: onInstallPrompt, promptInstall, getInstallPathKind). | Close as superseded. |
| #82 | Не мержить без ревью: Углубление экрана Сегодня | WORTH_FINISHING | 3 files, +45/-4. Today hierarchy + `pulse-cta` class + empty states. main has fx-enter/fx-celebrate but no `pulse-cta` (0 hits in src/). | Cherry-pick the pulse-cta + empty-state additions; today.ts needs a manual rebase. |
| #83 | Не мержить без ревью: Onboarding & First Ritual improvements | DUPLICATE | 8 files, +28/-106, 79% deletions. Its only commit 99bdb2b is also in #100/#105/#107/#108/#115, and the onboarding content is already in main (src/ui/screens/onboarding.ts:28). | DUPLICATE of the #100/#105/#107/#108/#115 stack — close #83. |
| #84 | feat: improve session program (Не мержить без ревью) | WORTH_FINISHING | 10 files, +74/-79, 52% deletions. Planner copy + penalty rebalance (diversity -100, repeat -80, plateau -40). main's ritual.ts still returns 'Смена контекста для прорыва' (src/core/engine/ritual.ts:360) and session-builder uses 'Сбалансированная тренировка' (src/core/session-builder.ts:164), so the change is NOT in main. 8 conflicts. | Owner decision: adopt the new reason copy + penalties, or close as an intentional wording choice. |
| #85 | Не мержить без ревью: Добавлены 3 новых упражнения | WORTH_FINISHING | 13 files, +747/-47. rule-slider, symbol-bind, twin-search exercises + engines/tests. All 3 ids absent from main. | Land the 3 exercises + tests + art icons. |
| #86 | Не мержить без ревью: Каталог тренажёров (поиск, фильтры, секции) | ALREADY_IN_MAIN | 2 files, +142/-50. Catalog search + domain filters + empty state. main has all three: `#catalog-search` (src/ui/screens/trainers.ts:196), `.filter-chip` filters (:115-138) and `#catalog-empty-state` (:211), commit 2c70e0e. | Already in main — close. |
| #87 | Не мержить без ревью: B6 Duel UX polish | ALREADY_IN_MAIN | 2 files, +76/-16. Duel fair start / readout / rematch. main has all three: `#countdown-overlay` (src/ui/screens/duel-session.ts:68), `#readout-overlay` (:71), `#btn-rematch` (:223), plus `formatCooldown` in src/ui/screens/duel.ts:105. | Already in main — only the 'Честный старт' caption differs; not worth a PR. |
| #88 | B3 — Result screen & post-session delight (Не мержить без ревью) | STALE | 2 files, +7/-7. Removes `abilityCaption` and the 'не IQ' suffix. main deliberately keeps both: src/ui/screens/result.ts:135 still calls abilityCaption, :373 still renders 'стартовая оценка · не IQ'. | Close — main keeps the explicit not-IQ framing on purpose. |
| #89 | Не мержить без ревью: Settings IA | ALREADY_IN_MAIN | 2 files, +137/-118. Settings IA groups. main groups settings into labelled sections: `section-training` (src/ui/screens/settings.ts:151), `section-interface` (:264), `section-privacy` (:330). | Already in main — close. |
| #90 | Не мержить без ревью - Batch AK | WORTH_FINISHING | 9 files, +458/-1. fractal-symmetry, cyber-swarm, paradox-engine exercises. All 3 absent from main (0 registry hits). Only 3 conflicts. | Land the 3 exercises + tests; verify catalog art. |
| #91 | [Не мержить без ревью] B5 — Navigation shell & wayfinding | STALE | 5 files, +33/-17, 34% deletions. Collapses the bottom nav to 4 tabs and drops program/duel. main still has 6 tabs (today/program/trainers/progress/duel/settings, src/ui/shell.ts:83-89). | Close as an unadopted IA experiment. |
| #92 | Не мержить без ревью: D3 — Session flow friction kill | STALE | 5 files, +49/-132, 73% deletions. flow.ts MutationObserver handoff + removes the lifestyle prompt. main has no flow.ts and keeps the lifestyle modal (src/ui/components/lifestyle-checkin.ts). | Close — superseded by main's session/handoff handling. |
| #93 | Не мержить без ревью | WORTH_FINISHING | 13 files, +1114/-106. G17 focus mode + D5 (checkpoint/resume, wake lock, timer ring). Superset of #73. `src/core/focus-mode.ts` absent from main. 7 conflicts. | Review this (not #73). Split into focus-mode core (clean) + session.ts resume (needs rebase). |
| #94 | feature/agy-wave-D6: Не мержить без ревью | STALE | 3 files, +9/-46, 84% deletions. Adds an honest transfer-guide card to Stats. main already shows that card on Settings (src/ui/screens/settings.ts:340 `transferCardFromStorage({ prefer: 'guide' })`); the 2 session.ts hunks are the plannedDuration→sessionBudget rename main already made (session.ts:526,535). | Close — the guide card exists in main (Settings); the rest is already merged. |
| #95 | feat: Empty states and microcopy polish (Не мержить без ревью) | WORTH_FINISHING | 17 files, +1836/-514. G18 weekly report + i18n helpers (hasI18nKey, t(key,vars,locale)) + empty states. Superset of #74. `src/core/weekly-report.ts` absent from main. 11 conflicting files (tied worst). | High value but the largest rebase. Land in two commits: (1) i18n helpers, (2) weekly-report + view. |
| #96 | Не мержить без ревью: Batch AM | WORTH_FINISHING | 8 files, +477/-47. symbol-recall, dual-match, traffic-light exercises + catalog entries. All 3 absent from main. | Land the 3 exercises + catalog + tests. |
| #98 | E3 — Stats honesty & Index explain | WORTH_FINISHING | 4 files, +42/-10. Fokus Index `<details>` explanation + rhythm empty state + a vite define for plannedDuration. main's progress.ts has no fi-explain block (0 hits). Only 2 conflicts. | Small and self-contained — land it. |
| #99 | feature/agy-wave-E2. Каталог: плотность карточек, фильтры доменов... | WORTH_FINISHING | 2 files, +182/-60. Card density toggle + sections/filters; superset of #86. main has search + empty state but no density toggle (`isDense` has 0 hits in src/ui/screens/trainers.ts). | Land only the density toggle; skip the parts already in main. |
| #100 | feat: opt-in soft return and reminders UX (Не мержить без ревью) | DUPLICATE | 10 files, +36/-114, 76% deletions. Contains 99bdb2b + 7d83ed8, both contained in #105/#107/#108/#115; onboarding changes already in main. | DUPLICATE of #105/#107/#108/#115 — close #100. |
| #102 | feat: Today ritual surface v3 [Не мержить без ревью] | STALE | 5 files, +258/-91. Today v3 rewrite (ritual slots, empty states). main rewrote today.ts again afterwards (29026cd, 6dc0673) and already renders per-item slots (src/ui/screens/today.ts:186 `SLOT_LABEL[item.slot]`), so the rewrite would regress current behaviour. | Close — superseded by main's today.ts. |
| #103 | Не мержить без ревью: Haptics & micro-motion polish | DUPLICATE | 5 files, +50/-47. Haptics — commit 17d4434 is shared by #112 and #117, and #117 is the superset (adds duel). | DUPLICATE of #117 — close #103. |
| #104 | Не мержить без ревью | WORTH_FINISHING | 13 files, +745/-49. cipher-crank, mirror-realm, quantum-sync exercises. All 3 absent from main. | Land the 3 exercises; drop the test-file filter hacks in favour of real catalog entries. |
| #105 | Не мержить без ревью: Settings IA polish | STALE | 12 files, +174/-234, 57% deletions, 12 conflicting files (tied worst). Bundle of 99bdb2b + 7d83ed8 + d136f5a + a null-spark coach change. main has the 3-step onboarding and grouped settings already; the null-spark idea reappears (cleaner) in #139. | Close as a stale bundle; take the null-spark idea from #139 instead. |
| #106 | Не мержить без ревью | WORTH_FINISHING | 6 files, +120/-30. Adds an `awards` route + hall-of-fame screen + quests. main has no awards route (src/main.ts:31-40 screenLoaders lists 9 screens, no awards) and no src/ui/screens/awards.ts; achievements only render inline in progress.ts:103. | Owner decision: land the separate awards screen or close as an unadopted IA direction. Content is unique. |
| #107 | feature/agy-wave-H1: 3 new exercises | WORTH_FINISHING | 17 files, +501/-221, 31% deletions, 11 conflicts. emoji-math / mirror-moves / size-stroop exercises (all 3 absent from main) plus a copy of the 99bdb2b / 7d83ed8 / d136f5a stack. The branch is dominated by old-base settings/onboarding churn. | Salvage only the 3 exercise dirs into a clean branch; do not merge as-is. |
| #108 | feat(a11y): Nav shell a11y pass | STALE | 12 files, +171/-226, 57% deletions, 11 conflicting files. Nav landmarks (already in main, c5aec64) + the same 99bdb2b / 7d83ed8 / d136f5a stack. | Close — landmarks are in main, the rest is stale churn. |
| #109 | Не мержить без ревью: Batch K1 exercises | WORTH_FINISHING | 17 files, +263/-8, 3% deletions. color-path, word-sort, logic-grid exercises (engine/view/index). All 3 absent from main. Only 5 conflicts. | Cleanest exercise PR — land after rebase; restore the 2 catalog tests it weakens. |
| #110 | Не мержить без ревью | ALREADY_IN_MAIN | 3 files, +21/-10. Result next-action CTA. main ships a richer `next-action-card` (src/ui/screens/result.ts:243) whose primary action is already 'Дальше: <ex>' (:195), plus the sessionBudget rename (session.ts:526,535). | Already in main (8e14bea) — close. |
| #111 | feat: catalog polish (filters and cards) | DUPLICATE | 3 files, +127/-90. Catalog polish; commit 3a1565e is a strict subset of #119 (rev-list containment). | DUPLICATE of #119 — close #111. |
| #112 | L6 — Result polish | DUPLICATE | 6 files, +66/-48. Result quality feedback + haptics; both commits (fd95133, 17d4434) are contained in #117. | DUPLICATE of #117 — close #112. |
| #113 | feat(today): CTA and reduce-motion | WORTH_FINISHING | 6 files, +59/-56, 49% deletions. The offline banner is already in main (src/ui/components/offline-banner.ts), but the reduce-motion gating on today's fx-enter/fx-celebrate is not: main calls `enterStage` unconditionally (src/ui/screens/today.ts:636) and today.ts has no prefersReducedMotion check. | Salvage only the reduce-motion gating in today.ts; drop the offline-banner part. |
| #114 | feat: progress empty states and index copy | WORTH_FINISHING | 1 file, +126/-61. Progress empty states + a 'Последние сессии' section. main already has 5 `empty-state` blocks (src/ui/screens/progress.ts:87,108,159,596,615) but no `hasHistory` gating (0 hits), so the gating is the delta. | Cheap, single-file — rebase onto progress.ts and land. |
| #115 | Не мержить без ревью | STALE | 11 files, +202/-232, 53% deletions, 11 conflicting files. A 5-commit stack (99bdb2b, 7d83ed8, d136f5a, 78baf8c, 4dd7147) — superset of #83/#100/#105/#108. main has the 3-step onboarding, grouped settings and reduce-motion helpers, so the bundle is superseded. | Close as a stale stack. If the soft-return copy is wanted, extract just that diff. |
| #117 | M6: Duel UX polish (Fair start/readout/rematch) | WORTH_FINISHING | 7 files, +159/-61. Duel fair start/readout/rematch (already in main) + haptics + result feedback. The unique parts: `triggerHapticFeedback` (0 hits in src/) and the quality-feedback block (0 hits in result.ts). Superset of #103/#112. | Best vehicle for the haptics + quality-feedback work; skip the duel part main already has. |
| #118 | feature/agy-wave-M4: Coach quiet insights | DUPLICATE | 4 files, +12/-22, 65% deletions. Null-spark coach change; same idea as #139 but #139 is fuller (tests + `spark!`). src/core/coach.ts is byte-identical to #139's version. | DUPLICATE of #139 — close #118. |
| #119 | Settings IA polish | WORTH_FINISHING | 4 files, +197/-150. Settings IA groups + catalog filter/card CSS; superset of #111. main already groups settings into sections, so only the CSS additions are new — main has `.filter-chip` but not the trainer-card `::before`/density rules. | Land the CSS polish; skip the settings regrouping that main already has. |
| #120 | Не мержить без ревью: M1 AV Exercises | DUPLICATE | 8 files, +585/-5. Identical commit set and tree to #121 (both are 54f4fbb + dbbf884; `git rev-list` sets equal). | DUPLICATE of #121 — close #120. |
| #121 | feat(a11y): add landmarks and improve focus management | WORTH_FINISHING | 8 files, +585/-5. Same tree as #120 (`git rev-list` commit sets equal: 54f4fbb + dbbf884). Landmarks already in main (src/ui/shell.ts:94,110), so the unique content is 3 AV exercises: neon-spark, parallel-track, symbol-stream — all absent from main (0 registry hits). | Keep #121, close #120; land only the 3 exercises + tests. |
| #123 | feat(ui): Stats radar polish (A3) | STALE | 2 files, +14/-14, 50% deletions. Radar opacity / empty-slice tweak. main's radar already went quieter independently: rings and axes use opacity 0.4 (src/ui/components/charts.ts:22,27, commit 1417ecd) and it has a hasData empty state (:30,55). | Close — main's radar already got the quieting. |
| #124 | feat(catalog): add empty state and enhance microcopy | ALREADY_IN_MAIN | 1 file, +23/-1. Catalog empty state + microcopy. main has `#catalog-empty-state` (src/ui/screens/trainers.ts:211) with `#empty-state-title` = 'Ничего не найдено' (:213), commit 2c70e0e. | Already in main — close. |
| #125 | feat: Exercises Batch AW (3 games) | WORTH_FINISHING | 10 files, +473/-0. aw-color-drift, aw-logic-gate, aw-shape-pulse exercises + tests. All 3 absent from main. Only 3 conflicts, 0 deletions. | Clean 3-exercise PR — land after rebase. |
| #126 | Не мержить без ревью | STALE | 5 files, +13/-34, 72% deletions. Phase 2 Batch B copy ('Дневной ритуал' / 'Начать ритуал') + a domain-level strip. main deliberately kept 'Тренировка дня' (src/ui/screens/today.ts:517); 'Начать сессию' is gone entirely, and domain chips already render elsewhere. | Close — the copy rename was not adopted and the level strip duplicates existing chips. |
| #127 | Не мержить без ревью | DUPLICATE | 5 files, +13/-34. Same 3 commits (6825f1a, 7f6d7ae, 97def5b) as #126 minus one chore commit — strict subset. | DUPLICATE of #126 — close #127. |
| #128 | Не мержить без ревью | ALREADY_IN_MAIN | 1 file, +5/-1. Adds a 'Начать: <ex>' primary CTA to result. main already makes the next exercise the primary action ('Дальше: <ex>', src/ui/screens/result.ts:195, card at :243). | Already in main — close. |
| #130 | Не мержить без ревью | ALREADY_IN_MAIN | 3 files, +9/-85, 90% deletions. 3-step onboarding. main has `const totalSteps = 3` (src/ui/screens/onboarding.ts:28) with a superset (i18n via L(), dayKey first-week plan, isNextDisabled). | Already in main — close. |
| #132 | feat(ui): add catalog cards for Batch Q | WORTH_FINISHING | 3 files, +27/-0. Adds public/art/icon-{wave-lock,grid-stash,rule-pivot}.svg. main has icon-wave-lock.svg but NOT icon-grid-stash.svg or icon-rule-pivot.svg, while both exercises exist in main (src/exercises/grid-stash.ts, rule-pivot.ts) — main currently has missing art. | Small real gap — land the 2 missing icons (drop the duplicate wave-lock one). |
| #133 | feature/agy-wave-Q5: Не мержить без ревью | ALREADY_IN_MAIN | 2 files, +23/-10, 30% deletions. Today ritual progress / resume. main derives resume from the unfinished session: `unfinishedSession` (src/ui/screens/today.ts:83) with remaining duration (:84) and the 'Продолжить с того места' CTA (:447). | Already in main — close. |
| #134 | Не мержить без ревью | WORTH_FINISHING | 7 files, +218/-185, 46% deletions. Refactors src/exercises/wave-lock.ts into a wave-lock/ module + updates the Fokus Index empty-state copy. main still has the single-file src/exercises/wave-lock.ts (no wave-lock/ dir). | Only take the fi-meta copy change (src/ui/screens/progress.ts:320); the module split is churn with no functional gain. |
| #135 | Не мержить без ревью | WORTH_FINISHING | 4 files, +35/-47, 57% deletions. Session recipe diversity (`pickRecipe`, `SessionRecipe`, `RECIPE_LABEL`) in scheduler/ritual. main's scheduler has `slotMix(blockCount)` with no recipe param (src/core/engine/scheduler.ts:115) and `pickRecipe` has 0 hits. | Real feature, moderate size. Port scheduler.ts + ritual.ts + types; add recipe tests. |
| #136 | feat(ui): settings groups polish | ALREADY_IN_MAIN | 2 files, +150/-116. Settings group headers + CSS. main already groups settings into labelled `<section>`s (src/ui/screens/settings.ts:151,264,330); `.settings-group-header` renames that same idea. | Already in main — close; take the CSS only if the class is wanted. |
| #137 | R5: Honest streak/soft-return UI | WORTH_FINISHING | 1 file, +2/-2. Honest-streak copy: drops 'из N дней' in favour of 'N дней (сессии)' in 2 strings. main still says 'из ${weekly.eligibleDays} дней' (src/ui/components/habit-continuity.ts:140,175). | Tiny and self-contained — land the 2 string changes plus the EN equivalents. |
| #138 | Не мержить без ревью | ALREADY_IN_MAIN | 2 files, +29/-13. Nav a11y landmarks (role=banner / role=main). main has both: src/ui/shell.ts:94 and :110, commit c5aec64. | Already in main — close. |
| #139 | feature/agy-wave-R4: Coach quiet insights | WORTH_FINISHING | 5 files, +13/-64, 83% deletions. Coach goes quiet: `getDailySpark` would return `CoachSpark \| null` and the empty-science fallback is removed. main still returns non-null (src/core/coach.ts:166 `): CoachSpark {`) and still has the fallback (src/core/coach-intel.ts:695); today.ts calls `spark.title` unguarded (:296,430). | Real behaviour change; port coach.ts + coach-intel.ts + the today.ts null guards + test updates. |
| #141 | feature/agy-wave-S3 | STALE | 2 files, +4/-4. Radar quieter (0.4/0.5 opacity, accent-glow-light) + remove box-shadow. main already uses opacity 0.4 for rings and axes (src/ui/components/charts.ts:22,27, commit 1417ecd); only stroke-width 2 and the shadow remain — a taste call. | Close — main's radar already got the quieting. |
| #142 | Не мержить без ревью | ALREADY_IN_MAIN | 1 file, +30/-0. Trainers catalog empty states. main has `#catalog-empty-state` + 'Ничего не найдено' (src/ui/screens/trainers.ts:211-213, commit 2c70e0e). | Already in main — close. |
| #161 | Не мержить без ревью | ALREADY_IN_MAIN | 4 files, +166/-2. PWA install/update banners. main has a fuller implementation: src/ui/components/pwa-update-banner.ts (aria-labelled, focus-managed, Escape-dismissable) wired via listenForPwaUpdate (src/main.ts:52) on updatefound (src/main.ts:65). | Already in main — optional extra: port the SKIP_WAITING postMessage for faster activation. |
| #260 | AN6: Batch B UI updates | STALE | 4 files, +22/-38, 63% deletions, oldest branch point (2026-09-29). 'Дневной ритуал' copy + a 5-domain level strip. main kept 'Тренировка дня' (src/ui/screens/today.ts:517) and already renders domain chips; 4 conflicting files. | Close — copy rename not adopted, level strip duplicates existing UI. |

## Suggested order of work

1. Clean additive exercise batches (no design decisions): #109, #125, #132,
   #85, #56, #53, #90, #96, #104, #49, #52.
2. Small self-contained fixes: #137, #98, #114, #80, #82, #134 (copy only),
   #113 (reduce-motion only).
3. Medium features needing a rebase but self-contained: #135 (recipes),
   #117 (haptics + feedback), #139 (quiet coach), #93 (focus mode), #77 (motion).
   (#87 is already in main.)
4. Large unique modules, one PR each: #71 (coach-longitudinal), #78 (mastery decay),
   #79 (load advisor), #72 (duel readiness), #75 (diff curves), #76 (ritual copy),
   #95 (weekly report + i18n helpers).
5. Close outright as duplicates (keep the named one): #127->#126, #55->#54,
   #120->#121, #73->#93, #74->#95, #118->#139, #111->#119, #112->#117, #103->#117,
   #51->#52, #48->#49, #47->#48/#49, #83/#100/#105/#108/#115 (one stack).
6. Owner decision, do not auto-close: #84 (planner copy/penalties), #106 (awards
   screen), #107 (salvage exercises only).

