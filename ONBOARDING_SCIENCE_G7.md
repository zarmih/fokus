# Onboarding Science G7

First-session calibration and first-week ritual for Fokus. The model lives in `src/core/` so it can be tested without DOM. Screens only call it.

## Architecture

```
src/core/calibration.ts   adaptive 60–90s probe, θ + precision, bootstrap
src/core/onboarding.ts    first-week plan, skip policy, transfer tips
src/core/types.ts         ProbeSnapshot, FirstWeekPlan on Profile
src/core/storage.ts       schema v4 (additive)

thin hooks:
  ui/screens/onboarding.ts  stores week plan, starts probe
  ui/screens/today.ts       week strip, duration ramp, transfer disclosure
  ui/screens/session.ts     collect outcomes → bootstrap snapshot
  ui/screens/result.ts      start levels, not IQ
  ui/screens/settings.ts    snapshot + recalibrate
```

Phase 2 program PRs (`programPhase`, `programStartDate`, Program tab) are optional. G7 does not require them and does not write those fields. If they land later, first-week plan stays a separate calendar from `firstWeekPlan.startDate`.

`registry.ts` is not modified. The probe picks existing exercises from a preferred list, filtered by whatever catalog the UI passes.

## Probe (60–90s)

- Budget 90s, ~18s per block, 3–5 blocks.
- One domain per block. Goal domain first, then uncovered domains.
- 4th block is added when time remains (coverage without a second pass).
- 5th block only if the profile is surprising (`|θ| ≥ 1.15`) or the goal is «баланс».
- Each block is a mid-difficulty item (b ≈ 0), which is the most informative single shot.

### Ability model

1PL / Rasch with a Gaussian prior `θ ~ N(0, 1)`.

- Item difficulty `b = clamp((difficulty − 3) × 0.35, −2, 2)`.
- Fisher information `n · p · (1 − p)` updates precision.
- Start level `3 + 2θ`, clamped to `[1.5, 8]`.
- Domain value `500 + 200θ`, clamped to `[150, 1100]`.

This is a **starting difficulty**, not an IQ, not a percentile, not a comparison with other people. Precision after a 90s probe stays in the «черновик / предварительно» band on purpose.

## First-week ritual

- Gentle ramp toward the duration chosen in onboarding (5 → stay 5; 8 → 5 then 8; 12 → 5 then 8 then 12).
- Day 4 is a light day. Day 5 leans on the weaker probed domain.
- **One skip forgiven.** Calendar days are not shifted. Missed days are not appended as makeup sessions.
- Copy never asks the user to «наверстать» or «отработать» missed days.

Streak grace of one skipped day already exists in `nextStreak` (`diffDays === 2`). G7 documents it in the first-week copy instead of inventing a second streak system.

## Transfer framing

Tips in `TRANSFER_TIPS` are modest and task-specific:

- memory: repeating a short list aloud
- attention: returning after an interruption
- speed: speed helps when the decision is already known
- flexibility: switching a rule is not «гибкость характера»
- logic: seeing a pattern in a short series does not make you a chess player
- general: transfer to work / study / daily life is modest and uneven; not a medical device

Progressive disclosure on Today: title visible, body behind a toggle.

## Storage

Schema **4**. New optional profile fields:

- `onboardingCompletedAt`
- `probeSnapshot` (`disclaimer: 'not-iq'`)
- `firstWeekPlan`
- `transferTipCursor`

v3 profiles migrate by version bump only. Missing snapshot is a valid state (uncalibrated or imported old data).

## Accessibility

- Onboarding step dots are a `progressbar`.
- Goal / time controls use `aria-pressed`.
- After each step the heading is focused (`tabindex="-1"`).
- Transfer toggle uses `aria-expanded` / `aria-controls`.
- Focus rings are scoped to onboarding / week / transfer / probe — not a global a11y rewrite.
- Motion: existing `prefers-reduced-motion` rules apply; no new animations on these screens.

## Non-copy notes

This work is original Fokus science and copy. It does **not** reproduce:

| Product | What we did not take |
| --- | --- |
| **Wikium** | Course-tree onboarding, «диагностика мозга», certificate-style IQ, long multi-screen diagnostics, their illustrations or slogans |
| **Elevate** | Daily goal streaks as a skill-pro score, their workout names, «personalized training plan» marketing, iOS-style onboarding cards |
| **Lumosity** | BPI / Lumosity Performance Index as a population percentile, «train your brain» miracle claims, their game set as a placement test |
| **Peak** | Coach character, league-onboarding, their lightning-round placement |
| **NeuroNation** | Long scientific questionnaire, age-norm graphs, «brain age» |

Shared scientific *paradigms* (Stroop, n-back, Corsi, Posner) are public methods already in Fokus. The probe uses existing Fokus exercises as short blocks; it does not reimplement rival games.

What we do instead:

- θ + precision, shown as a start level and a confidence label
- 60–90s cap, 3–5 blocks, stop early if the profile is unsurprising
- First week as a gentle ramp with one forgiven skip and no makeup
- Transfer text that under-claims

## Out of scope

- No new exercise modules, no `registry.ts` edits
- No Program tab (Phase 2)
- No offline-sync or global a11y/perf pass (G5/G6)
- No fake population norms
