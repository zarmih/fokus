# Adaptive Engine v2

Original Fokus personalization. Not a clone of Lumosity BPI or Elevate skill ranks.

The engine lives in `src/core/engine/` and is **pure TypeScript** (no DOM). UI screens call it through `src/core/adaptive-plan.ts`.

## Pieces

### 1. Ability vector (EWMA + Bayesian-lite)

Five domains — Memory, Attention, Logic, Speed, Flexibility — each with:

| Field | Meaning |
| --- | --- |
| `theta` | Posterior mean of latent ability on the 1–30 difficulty scale |
| `precision` | Inverse variance τ. Grows with consistent evidence |
| `formEwma` | Short EWMA of performance (recent form) |
| `baseEwma` | Long EWMA of performance (career base) |

Each block is treated as a noisy measurement. The implied ability is the 2PL inversion `θ̂ = β + logit(accuracy) / α`. The posterior is the Gaussian–Gaussian conjugate update. One wild outlier decays precision slightly instead of locking the mean.

Skills (working memory, inhibition, …) update the same way and vote into their parent domain via shared observations.

### 2. Item-response difficulty

2PL: `P(correct) = sigmoid(α (θ − β))`.

Fokus aims for a **confidence-aware challenge zone**:

- Low precision → target P ≈ 0.80 (gentler while the model is learning the person)
- High precision → target P ≈ 0.65 (more information per block)
- A slump (form well below base) raises target P so the ritual does not punish a bad day

Then `β* = θ − logit(P*) / α`, blended with the exercise’s stored rating and clamped to a ±2 step.

Discrimination α depends on the metric family (memory-span is steep, timing-precision is shallow).

### 3. Spaced ritual scheduler

Each exercise is a spacing card (SM-2-like ease + interval). A ~15 minute ritual is 5 blocks with a fixed slot mix:

```
overdue, overdue, due, due, fresh
```

Shorter sessions drop to 3 (`overdue, due, fresh`). Overdue cards that do not exist cascade into due, then fresh, so a brand-new profile still gets a plan.

### 4. Soft recalibration

Triggered when **any** of these hold:

- 14 days since last calibration
- Form/base drift ≥ 22% on at least two mature domains
- Average precision of mature domains collapses

The UI offers a ~90 second probe (weakest + goal/least-observed + strongest). Postpone snoozes for 3 days. Streak is never reset.

## Wiring and fallbacks

`buildAdaptivePlan` is the single entry for Today, Program, Session, Result, Progress.

1. Try the v2 engine.
2. If the catalog is empty or compose throws, fall back to the existing heuristic `buildTrainingPlan` (the Phase 1 recommender). That path keeps closed-loop tests and older profiles working.

Phase 2 program PRs are **not required**. This branch ships its own `program.ts`. If those PRs later merge, they should call `planForNow()` / `buildAdaptivePlan()` instead of duplicating selection logic. Optional `profile.programDay` / `programWeek` are read when present.

## Persistence

Schema v4 adds `abilityModel` on `AppState` and `lastCalibrationAt` / `recalibrationSnoozedUntil` on the profile. Missing snapshots are bootstrapped from the existing domain/skill/exercise indexes, so v2 is live the day it ships.
