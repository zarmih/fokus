# Adaptive Engine Depth G10

Fokus already stores accuracy, reaction time and difficulty on every block. This layer turns that archive into a **multi-session ability trajectory**, **spaced difficulty**, and a **ritual targeter** — original Fokus mechanics, not a port of another brain-trainer.

## Architecture

```
sessions + exerciseStates + domains     (already persisted, schema unchanged)
        │
        ├── ability-trajectory.ts       θ per domain (EWMA + Bayesian)
        ├── spaced-difficulty.ts        peak cooldown / gentle re-approach
        └── ritual-targeter.ts          next 3–5 catalog slots
                │
                └── adaptive-depth.ts   thin façade for Today / Settings
```

Core stays in `src/core/`. UI only reads the façade from Today and Settings. `registry.ts`, exercise modules, G8 session-quality/recovery and G9 transfer/insights are not part of this loop.

If the live catalog is empty (program / adaptive PR not merged), `targetRitual` returns `null` and Today falls back to the existing `buildTrainingPlan`. No invented numbers, no crash.

### Ability trajectory (`ability-trajectory.ts`)

Latent ability **θ ∈ [0, 1]** per domain (`attention`, `memory`, `speed`, `flexibility`, `logic`).

1. Each stored block becomes evidence  
   `e = 0.55·accuracy + 0.20·speed + 0.25·difficultyNorm`  
   Speed is `targetMs / avgRtMs` clamped to `[0.6, 1.25]`, then scaled to `[0, 1]`. Default target is 1500 ms — the same reference the current performance model uses.
2. Blocks in one session for one domain are averaged.
3. **Bayesian update**: Gaussian with prior `μ = 0.5`, precision `2` (or a weak prior from the stored `DomainIndex.value / 1200`). Likelihood precision `3` per session mean. Posterior μ is clamped to `[0, 1]`.
4. **EWMA** (`α = 0.28`) of session means supplies the slope. Trend is `rising` / `stable` / `falling` from that slope, and only after **≥ 2 sessions** and **≥ 3 observations**.

θ is **internal**. The product never prints θ, never maps it to IQ, BPI, NeuroScore, or a 100-point “intelligence” scale. The only surface is a qualitative chip (“Память растёт”).

### Spaced difficulty (`spaced-difficulty.ts`)

Explicit rules, not a hidden black box:

| Event | Condition | What happens |
| --- | --- | --- |
| Hard success | accuracy ≥ **0.90** and difficulty ≥ max(**6.0**, 85 % of personal peak) | Step down by **0.45**. Do not re-hit that peak for **2 sessions**. |
| Failure | accuracy < **0.65** | Drop at most **0.5** (gentler than the raw staircase −0.8). |
| Re-approach | after a failure | Cap below `failedHeight − 0.25` until **2** solid successes (accuracy ≥ 0.75). Then the staircase is open again. |
| Calibration band | difficulty < 6 | Spacing is a no-op so early levels still climb. |

`updateExerciseState` applies this **only** when the caller passes a spacing context (session finish path). Callers that omit it keep the historical staircase — safe next to unmerged program PRs.

The ritual targeter uses the same snapshot: cooldown exercises lose score, due / re-approach exercises gain a little.

### Ritual targeter (`ritual-targeter.ts`)

Picks **3 / 4 / 5** unique slots for 5 / 8 / 12 minute sessions from the **live catalog** (injected, never hard-coded IDs).

Score (highest first):

- weakest domain on θ (or stored domain value if θ is not ready)
- freshness (hours since last play)
- primary goal
- re-approach bonus / peak-cooldown penalty
- domain balance inside the ritual
- **exploration budget 12 %**: after the first slot, a draw may take 2nd or 3rd instead of greedy-1

Returns `null` on an empty catalog. Copy is Russian and names the domain, never a fake index.

## UX

**Today** (after calibration): one `ability-trend-chip` on the ritual card + optional one-liner `ritual-why`. Hidden until the trajectory is ready. `role="status"` for the chip. No extra motion; `prefers-reduced-motion` already zeros animations globally and is restated on these nodes.

**Settings**: short “Как подстраивается сложность” note and the same chip when ready. Disclaimer: not IQ, not a diagnosis.

No new exercises. No changes to `registry.ts`.

## Storage

No schema bump. Everything is derived from `sessions`, `exerciseStates` and `domains` already written by the session loop.

## What this is not (non-copy)

This work is **original Fokus ritual depth**. It does not copy product copy, visuals, IA, scoring brands, or locked mechanics from:

- **Wikium** — no “диагностика → курс → навык” funnel, no Wikium skill tree or coach scripts.
- **Elevate** — no Elevate workout-of-the-day chrome, streak-prose, or per-skill lesson packs.
- **Lumosity** — no Brain Performance Index / LPI, no Lumosity game set, no “n-back as IQ” framing.
- **Peak** — no Peak Brain Map, no Peak Brain Workout layout, no character/coach skins.
- **NeuroNation** — no NeuroScore, no course-upsell coach, no NeuroNation exercise clones.

Shared *scientific vocabulary* (accuracy, RT, domains, spacing) is not ownership. Fokus keeps its own five domains, Fokus Index (already shipped, 0–999, not IQ), Russian adult voice, and the existing daily ritual card.

## Never

- Fake IQ or “intelligence age”
- Medical / diagnostic claims
- New exercises or registry edits
- Competing headline score next to Fokus Index
