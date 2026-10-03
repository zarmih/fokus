# AGY_TASK — one slice only: program phase changes the ritual

You are the coder for zarmih/fokus. Work ONLY in /workspace/fokus-phase-wt.
Branch feature/program-phase-ritual is already checked out from origin/main @ 6744a03.
Do not switch branches. Do not touch other worktrees. Do not start any other improvement.
Ignore Antigravity Eligibility banners and keep going. No confirmations.

## Goal
Program phase (orient / balance / focus / sustain in src/core/program-phases.ts) must change the actual training ritual, not only the Program screen label.

Wire the phase id into plan building so scoring and block count differ by phase. Today must show the effect (plan items and/or copy), which means the LIVE path must change too:

- src/core/session-builder.ts `buildTrainingPlan` (legacy scorer — required)
- src/core/engine/bridge.ts `AdaptivePlanParams` + src/core/engine/ritual.ts `composeRitual` / `scoreCatalog` (this is what `planForNow` → `buildAdaptivePlan` uses for Today; changing only the legacy scorer is NOT enough)
- src/core/adaptive-plan.ts `planForNow` passes the phase id (and fatigue/churn flag) through
- src/core/today-plan.ts copy, and the Today screen call site (src/ui/screens/today.ts) if needed, so the explanation mentions the phase effect

Do not add new screens, exercises, metrics, or features beyond this wiring.

## Phase rules (same fixture must change order and/or length)
Resolve phase as `params.programPhase ?? phaseForWeek(params.programWeek ?? 1).id`.
Add optional `programPhase?: ProgramPhaseId` and `fatigueOrChurn?: boolean` on `buildTrainingPlan` params and `AdaptivePlanParams` / `ComposeRitualParams`. Thread them through `buildAdaptivePlan` in session-builder.ts.

1. orient — shorter AND familiar
   - Cap target blocks at 3 (a 900s plan that would be 5 blocks becomes 3).
   - Prefer exercises that already have play state: add a familiarity bonus when `state` exists; do not give the usual novelty bonus to never-played exercises in this phase.
   - Do not zero out weak-domain scoring. Existing test "sufficient history triggers normal weak-domain bias copy" must stay valid (reason still matches Отстающий навык when weakness wins).

2. balance — weight weak domains
   - Boost weakness priority so the weakest domain outranks the onboarding goal domain.
   - Reduce goal-alignment points versus the default/focus phase.
   - Same catalog + primaryGoal ≠ weakest domain: first chosen exercise domain is the weakest, not the goal.

3. focus — weight the goal domain
   - Boost goal-alignment so primaryGoal domain outranks a weaker non-goal domain.
   - Same catalog as the balance case: first chosen exercise domain is primaryGoal, not the weakest.

4. sustain — shorter only when fatigue / churn risk
   - Without `fatigueOrChurn`, block count stays the normal duration-based count (not the orient cap).
   - With `fatigueOrChurn === true`, cap target blocks at 2.
   - `planForNow` sets `fatigueOrChurn` from existing signals only: continuity workload `fatigued.length > 0` OR retention band `at_risk` or `critical` if that snapshot is already in hand. Do not invent a new retention model. If retention is not loaded inside planForNow, fatigued domains are enough there; still accept the boolean on the pure builders so tests can force it.

## Today copy
Pass phase id into `explainTodayPlan` (optional field, default unchanged). When set, one short Russian clause in `whyExercises` or `body` (no guilt, no IQ claims):
- orient: familiar and shorter
- balance: weak domains
- focus: the goal domain (use domainLabel when primary goal is known)
- sustain + fatigue/churn: shorter because of fatigue
Wire it from src/ui/screens/today.ts using `phaseForWeek` and the same inputs the plan used, so Today text matches the ritual. Do not rewrite the whole Today screen.

## Tests
Add tests (new file tests/program-phase-plan.test.ts is fine) that use ONE shared fixture and assert scoring/order/length differences:
- orient has fewer items than balance/focus/sustain for durationSec 900
- orient ranks a previously played exercise above a never-played one when other factors are equal
- balance first item is the weak domain; focus first item is the goal domain (same domains, skills, states, catalog)
- sustain + fatigueOrChurn has fewer items than sustain without the flag (durationSec 900)
- omitting programPhase but setting programWeek to 5 behaves as focus; programWeek 3 behaves as balance
Also cover the engine path (`composeRitual` or `buildAdaptivePlan`) with `rng: () => 1` so explore-noise cannot flip order: focus vs balance order differs on the same model/catalog.

Keep npm test and npm run build green. Update an existing assertion only if a phase rule truly changes it; do not weaken unrelated tests.

## Git
- One commit. Do NOT commit AGY_TASK.md.
- Author can stay as the repo default.
- Push origin feature/program-phase-ritual
- Open ONE PR to main:
  gh pr create --base main --head feature/program-phase-ritual --title "Program phase changes the training ritual" --body "..."
- Do NOT merge. Stop after the PR URL.
- In the final message print: PR URL, commit SHA, test count (vitest files/tests), and one line what changed.

If quota / RESOURCE_EXHAUSTED: stop and say so. Do not start a second task.
