# Session quality & recovery (G8)

Fokus already stores per-block accuracy, reaction time, difficulty/level, duration and whether a session finished. This module turns those signals into two **process** metrics — session quality and short-horizon load — then optionally biases the Today ritual. It is not a third ability index and not a medical score.

## Architecture

```
session (accuracy, RT, level, duration, finishedAt, endReason)
        │
        ▼
src/core/sessionQuality.ts     pure  →  0–100 quality + breakdown
        │
        ▼
src/core/recovery.ts           pure  →  EWMA load, rest-light | steady | push-hard
        │
        ├─ applyRecoveryGate()     no-op unless the gate is active
        └─ planWithRecovery()      shorter duration + domain swap, then buildTrainingPlan
        │
        ▼
Today / Stats / Settings       thin read-only UI (Russian product voice)
```

Core does not import the UI, `registry.ts`, or exercise engines. `planWithRecovery` calls the existing `buildTrainingPlan` and then a **post-processor**. If a later program/adaptive PR replaces the planner, the gate still no-ops when inactive, when the catalog is empty, or when there is nothing eligible to swap.

Storage schema stays at v3. Optional fields (`Session.interrupted`, `endReason`, `plannedDurationSec`, `Profile.recoveryHints`) are read with defaults — no migration.

### Quality — `scoreSessionQuality`

Transparent weights (sum = 1):

| Component | Weight | What it measures |
| --- | --- | --- |
| Accuracy | 0.30 | Mean block accuracy |
| RT stability | 0.20 | Coefficient of variation of `avgRtMs` (plus lapse / slowing penalties). Neutral 50 if fewer than two RTs |
| Difficulty fit | 0.15 | Accuracy near ~0.80 **and** a real level — ceiling-smashing level 1 is not “better” |
| Completion | 0.25 | Finished vs planned blocks. A fatigue stop gets partial credit; an abandon does not |
| Interruptions | 0.10 | `finishedAt === null`, `endReason === 'abandoned'`, or a 3× RT lapse |

Score is the rounded weighted sum of the five 0–100 components. Confidence is `low` / `medium` / `high` from sample size and whether the session finished. This is **how cleanly the ritual went**, not how smart the person is. Fokus Index remains the domain-coverage ability estimate.

Interruptions are inferred from existing fields when the optional flags are absent, so historical sessions still score.

### Load / recovery — `estimateRecovery`

Horizon: last 8 sessions, EWMA α = 0.40 (load) and 0.35 (quality).

Per-session load (0–100) uses duration, mean level, extra same-day volume, low quality (struggle), abandoned sessions, and the matching day’s sleep/stress if present. A gap longer than 36 hours decays load toward a rested baseline so a hard week does not lock “rest-light” forever.

Recommendation:

- **rest-light** — high load, quality drop vs EWMA, two weak sessions, 5+ consecutive days under load, or strained sleep/stress
- **push-hard** — low load, high quality EWMA, short consecutive streak
- **steady** — default, and always when fewer than two sessions (no fake alarm)

Fewer than two sessions → low confidence, gate off.

### Recovery gate

When rest-light **and** `profile.recoveryHints !== false`:

1. Next ritual duration is capped at 5 minutes (user setting is not overwritten).
2. `applyRecoveryGate` prefers other domains than the last session and lower stored difficulty.
3. Today labels the card «Сегодня легче» and starts the session with `durationSec`.
4. Mid-session replan in `session.ts` uses the same helper so the gate is not undone after block 1.

If hints are off, catalog is empty, or no alternative exists, the plan is returned unchanged.

A user leaving after at least one block writes an `abandoned` session (no day summary, no XP). That feeds quality/load without marking the day as played.

## UX

- **Today** — quality trend + one recovery hint; shorter/easier composition when the gate is on. Hidden until there is a scored session.
- **Stats** — same card with the five-component breakdown and weights.
- **Settings** — explanation + «Подсказывать восстановление» (default on).

Copy is Russian, matches the existing coach voice, and never calls the number IQ, «возраст мозга», or a brain score. Reduced-motion: the sparkline is a static SVG; existing `@media (prefers-reduced-motion: reduce)` already disables decorative animation. The card is a `region` with an `aria-label`.

No new exercises. `registry.ts` and exercise modules are untouched.

## Non-copy notes

This is original Fokus load management. It is not a port of Wikium, Peak, Elevate, Lumosity, or NeuroNation.

| Product | What we did **not** take |
| --- | --- |
| **Wikium** | Their game names, “energy” meters, brain-age framing, coach scripts, visual language |
| **Lumosity** | LPI / Lumosity points, “train your brain like a muscle” overclaim, their game catalog or session flow |
| **Peak** | Pack / workout copy, monster mascots, their specific drill set |
| **Elevate** | Pro/SAT-style skill copy, writing/listening product voice, their progress rings |
| **NeuroNation** | Neuro points, brainage, their method-branding and course structure |

Fokus Index (ability, domains) and session quality (process, this ritual) stay separate on purpose. Recovery is a **load hint** (“today, shorter”), not a diagnosis and not a rest-day lockout.

## Files

| Path | Role |
| --- | --- |
| `src/core/sessionQuality.ts` | Pure quality model |
| `src/core/recovery.ts` | EWMA load, gate, `planWithRecovery` |
| `src/ui/components/quality-card.ts` | Shared Today/Stats markup |
| `src/ui/screens/today.ts` | Thin hook: duration + card |
| `src/ui/screens/progress.ts` | Stats breakdown |
| `src/ui/screens/settings.ts` | Explainer + toggle |
| `src/ui/screens/session.ts` | Optional `durationSec`, abandon persist, replan through the gate |
| `tests/session-quality.test.ts` | Quality unit tests |
| `tests/recovery.test.ts` | Load, gate no-op, domain swap |
| `tests/session-recovery-ui.test.ts` | Settings + Stats |
| `tests/today.test.ts` | Today recovery card |

## Hotspots avoided

G5 (shell / PWA / a11y split) and G7 (onboarding / calibration) are not in this diff. Planner scoring in `session-builder.ts` is unchanged; recovery is a wrapper.
