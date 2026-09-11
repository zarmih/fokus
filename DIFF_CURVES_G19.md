# Per-exercise difficulty curves (G19)

Intra-block warmup → plateau → surge around the difficulty Adaptive Engine v2 (and G10, when it lands) already chose. Original Fokus mechanics. Not a new ability score.

## Audit — staircase / adaptive hooks

Three layers already pick **block** difficulty. G19 does not replace them.

| Layer | Where | What it does | G19 |
| --- | --- | --- | --- |
| Staircase | `src/core/adaptive.ts` → `updateExerciseState` | After a block: accuracy/RT → Δdifficulty, plateau counter, mastery | Untouched. Still sees block accuracy vs the **assigned** level. |
| Adaptive Engine v2 | `src/core/engine/` (`selectDifficulty`, IRT 2PL, ±2 step) | Ritual picks the block anchor β* in the challenge zone | Untouched. `catalogFromManifests` still copies id / domain / skills / metricModel / maxLevel. |
| G10 spaced difficulty | `spaced-difficulty.ts` on `feature/grok-adaptive-depth-g10` (unmerged) | Optional 6th arg to `updateExerciseState`; peak cooldown / re-approach | Not imported. G19 does not wrap that signature, so the merge stays a no-op for this PR. |
| Session wiring | `src/ui/screens/session.ts` | `difficultyFor(...)` then `exDispatch.render(..., state.difficulty, ...)` | Still passes the block anchor. Trial shape is inside the engine/view. |

Hot paths **not** rewritten: `registry.ts` (eager test list), `src/core/engine/*` besides reading `DIFFICULTY_MIN/MAX`, G8 recovery, G9 transfer.

If a later PR replaces the planner, engines keep working: they only read the number `render()` already receives.

## Architecture

```
Adaptive Engine v2 / staircase / G10
        │  block anchor β  (1–30)
        ▼
session.ts  render(el, level, onEnd, isTimeUp)
        │
        ▼
src/core/diff-curves.ts     pure  →  warmup / plateau / surge
        │
        ├─ sampleCurve / planCurve / progressDifficulty
        ├─ paramsAlongCurve(getXxxParams, { target, t | index, hold })
        └─ shiftDeadline(baseMs, offset)   when the level table is not monotonic
        │
        ▼
opt-in engines (stroop, switch-rule, posner, grid-memory, n-back)
```

Core does not import the UI. Exercise engines import `src/exercises/diff-curves.ts` (re-export). `src/core/engine/` does **not** import G19.

### Shapes

| Kind | What the block does |
| --- | --- |
| `flat` / `plateau` | Every trial at the anchor |
| `warmup` | Ramp from easy → anchor |
| `surge` | Ramp from anchor → peak |
| `warmup-plateau` | Default for `memory-span` and `logic-correctness` |
| `plateau-surge` | Hold, then a short ceiling probe |
| `warmup-plateau-surge` | Default for speed-accuracy / timing |

Explicit `manifest.diffCurve` wins. Omit it → `defaultCurveKind(metricModel)`. Engines that never call the helper stay **flat** (today’s behaviour).

### Constants (the contract)

| Name | Value | Role |
| --- | --- | --- |
| `WARMUP_DROP` | **1.5** | Subtracted at the start of warmup |
| `SURGE_LIFT` | **1.0** | Added at the surge peak |
| `WARMUP_FLOOR_RATIO` | **0.75** | Warmup never below 75% of the anchor |
| `CALIBRATION_BAND` | **4.0** | Below this, amplitude × `target/4` so a G7 probe stays a mid-item |
| `WARMUP_FRACTION` | **0.20** | Index-based mix |
| `SURGE_FRACTION` | **0.15** | Index-based mix |
| Scale | **1–30** | Same `DIFFICULTY_MIN/MAX` as Adaptive Engine v2 |

Short blocks: 1 trial = plateau (a 90s probe is not a warmup-only sample). 2 = warmup+plateau. 4+ may surge.

Time-boxed engines pass `elapsedProgress(ms, 70_000)` (`BLOCK_SHAPE_MS` matches the existing 70s caps). Planned lists use `planCurve(target, n)`.

Missing progress defaults to **plateau** (`t = 0.5`). An engine that forgets to pass `t` must not accidentally surge.

### Structural vs continuous

The helper returns a **number**. Engines decide what it may change.

- **Stroop / switch-rule / posner** — table or formula is monotonic; `paramsAlongCurve(getXxxParams, …)` is enough.
- **Grid-memory** — hold `grid` so the board size does not jump; cells/showMs may warmup. Kind `warmup-plateau` (no late span spike).
- **N-back** — hold `n`. `getNBackParams` is **not** monotonic across n-bands (delay resets when n steps up). Timing uses `shiftDeadline(anchor.delayMs, sample.offset)` instead of a lower table row.

Block reporting stays `observationDifficulty(target) === target`. Session already records `state.difficulty` from the engine pick, not the surge peak.

## Opt-in engines

| Exercise | Kind | Notes |
| --- | --- | --- |
| Чернила (stroop) | warmup-plateau-surge | deadline / incongruent % follow the table |
| Смена правила (switch-rule) | warmup-plateau-surge | deadline / switchEvery |
| Posner | warmup-plateau-surge | invalidPct / targetDuration (continuous formula) |
| Матрица (grid-memory) | warmup-plateau | hold grid |
| Dual N-Back | warmup-plateau-surge | hold n; delay via offset |

Other modules are unchanged. Adding a curve is one call in the trial loop; `registry.ts` does not need a new import.

## Metadata

Optional `ExerciseManifest.diffCurve`. Set on the five manifests above and mirrored on the matching `catalog.ts` rows so `getManifest` can read it without loading a view.

`registry.ts` is **not** edited. Adaptive Engine v2 does not read this field.

## Storage / UX

No schema bump. No new screen. No second headline score next to Fokus Index.

## What this is not (non-copy)

Shared vocabulary (warmup, staircase, IRT, span) is not ownership. Fokus does not copy product copy, locked mechanics, or scoring brands from:

- **Lumosity** — no BPI / LPI, no “n-back as IQ”
- **Elevate** — no per-skill lesson packs or workout chrome
- **Peak** — no Brain Map / Brain Workout layout
- **Wikium** — no «диагностика → курс» funnel
- **NeuroNation** — no NeuroScore, no brain-age framing

## Never

- Fake IQ, «возраст мозга», medical claims
- Writing surge peak into `ExerciseState.difficulty`
- Importing G19 from `src/core/engine/`
- New exercises or a registry rewrite
