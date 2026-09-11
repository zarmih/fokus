# Phase 2 — Personal program (engine-backed)

Phase 2 on this branch is the **Adaptive Engine v2 ritual**, not a hard dependency on unmerged Phase 2 PRs (`feature/phase2-program-skeleton`, `feature/phase2-adapt-week`, …).

## What this PR adds on top of main

- Pure engine under `src/core/engine/` (ability, IRT, spacing, recalibration, ritual).
- `src/ui/screens/program.ts` — personal plan (ability vector + ritual slots + soft recalibration).
- Today / Session / Result consume the same planner.
- Schema v4 for the ability snapshot.

## Graceful fallbacks

| If… | Then… |
| --- | --- |
| Phase 2 program PRs are not merged | This branch still has Program + Today ritual |
| `abilityModel` is missing | Bootstrap from `domains` / `skills` / `exerciseStates` |
| Engine throws or catalog is empty | `buildAdaptivePlan` uses legacy `buildTrainingPlan` |
| `profile.programDay` is absent | Week/day label is derived from day-summary count |
| User postpones recalibration | Snooze 3 days, streak untouched |

## Out of scope

Exercise modules are not modified. Calibration’s three-block onboarding on Today is unchanged (`odd-one`, `grid-memory`, `stroop`).
