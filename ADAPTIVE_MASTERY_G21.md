# Adaptive Mastery Decay + Spaced Re-probe (G21)

Fokus already knows *how hard* a block should be (staircase, IRT, G10 spaced-difficulty). This layer answers a different question: **when should we check again**, after a skill has sat idle.

It is original Fokus ritual hygiene, not a port of another brain-trainer. Confidence here is “how fresh is the evidence”, not a new headline score and not a claim that the person got worse.

## Architecture

```
sessions + exerciseStates + catalog     (already persisted, schema unchanged)
        │
        └── mastery-decay.ts            EWMA form + calendar-day decay
                │
                ├── scheduleReprobes()  at most one due card
                └── applyReprobeBias()  soft last-slot swap
                        │
                        └── adaptive-depth.ts façade
                                │
                                ├── Today  — one “re-probe due” line
                                ├── Coach  — spark after recovery / chronotype
                                └── Settings — extra sentence under G10 note
```

Core stays in `src/core/`. UI only reads the snapshot. `registry.ts`, exercise modules, G10 `spaced-difficulty.ts` / `ritual-targeter.ts`, G16-style longitudinal series and G18 weekly review are **not** rewritten.

If the catalog is empty, the snapshot is empty and Today is a no-op. No invented numbers, no crash.

### What this is not

| Layer | Still the source of truth |
| --- | --- |
| Staircase (`adaptive.ts`) | Next difficulty after a block |
| IRT (`engine/irt.ts`) | Challenge-zone β* |
| G10 spaced-difficulty | Peak cooldown / re-approach cap |
| Engine SM-2 scheduler | Ritual slot mix overdue / due / fresh |
| G10 ritual targeter | Which domains fill the 3–5 slots |

G21 **proposes** a re-test. It does not change height, does not grow the ritual, does not replace the first slot, and does not run during G11 gentle-return or G8 rest-light.

G16 longitudinal charts and G18 weekly review are left alone: no extra series, no weekly rewrite. The only surfaces are a small Today hint and an optional Coach spark.

## Confidence model (`mastery-decay.ts`)

Per-exercise, derived on read. No schema bump.

1. Each stored block becomes evidence  
   `e = 0.70·accuracy + 0.30·speed`  
   Speed is `targetMs / avgRtMs` clamped to `[0.6, 1.25]`, then scaled to `[0, 1]`. Default target is **1500 ms** — the same reference G10 uses. **Difficulty is omitted** so this layer cannot argue with the staircase.
2. **EWMA** (`α = 0.35`) of evidence is recent form on that trainer.
3. **Base confidence** blends form with evidence mass:  
   `0.35 · (1 − e^{−n/4}) + 0.65 · ewma`.
4. **Calendar-day decay.** Idle days use the G11 civil clock (`Europe/Moscow`, UTC fallback), not raw 24-hour buckets.  
   `confidence = base · ½^(idleDays / 8)`  
   Half-life is **8** days. We decay *confidence*, not θ.

A skill rollup (mean of source trainers, idle = min of sources) exists for tests and docs. The UI names a concrete trainer, never a fake skill tree.

### Bands (the contract)

| Band | Condition | What happens |
| --- | --- | --- |
| `sparse` | &lt; **2** observations | No re-probe. Scheduler still handles “fresh”. |
| `held` | confidence ≥ **0.62**, or idle too short | Silence. |
| `watch` | idle ≥ **3** days and confidence &lt; 0.62 | Internal only. |
| `due` | idle ≥ **4** days and confidence &lt; **0.42** | Soft re-probe. |

Played yesterday with a slump is **not** due — that is G10 re-approach / the staircase. Due means “we have not checked lately”.

## Soft schedule

`scheduleReprobes` returns at most **one** due card, lowest confidence first.

`applyReprobeBias` is a post-hoc hook in the G11 `applyGentleReturnBias` style:

- already in the plan → only retag the reason
- otherwise swap the **last** slot
- never replace index 0
- never grow the plan
- `allow: false` (gentle return / rest-light) → no-op

Difficulty of the inserted block is whatever staircase / IRT / G10 would have picked. G21 does not pass a special level.

## UX

**Today** (after calibration, not yet played, not a gentle return): one `reprobe-hint` under the ritual why. `role="status"`. Copy names the trainer, not a score. Hidden when nothing is due.

**Coach**: spark *«Пора освежить»* / *«Time to re-check»* only after calibration, rest, recovery, retention and chronotype-in-window. It yields to those. Body says the staircase stays put.

**Settings**: extra `mastery-note` under the G10 “Как подстраивается сложность” paragraph. Disclaimer: not IQ, not a rival score next to Fokus Index.

No extra motion. `prefers-reduced-motion` already zeros animations globally and is restated on `.reprobe-hint`.

Copy is **RU + EN**, Fokus adult voice: regularity over intensity, modest transfer, mistakes are normal. No FOMO, no “don’t break your streak”, no brain-age.

## Storage

No schema bump. Everything is derived from `sessions`, `exerciseStates` and the live catalog already written by the session loop. Privacy inventory is unchanged: no new `fokus.*` keys.

## Tests

`tests/mastery-decay.test.ts` — evidence, EWMA, civil idle, bands, decay into due, skill rollup, schedule cap, last-slot bias, RU/EN copy, coach priority, G10 numbers untouched, sparse legacy states.

`tests/today.test.ts` — re-probe hint on Today, no IQ / weekly-review rewrite.

`tests/settings-adaptive-depth.test.ts` — mastery note next to the G10 explanation.

## What this is not (non-copy)

This work is **original Fokus mastery hygiene**. It does not copy product copy, visuals, IA, scoring brands, or locked mechanics from:

- **Wikium** — no “диагностика → курс → навык” funnel, no Wikium skill tree or coach scripts.
- **Elevate** — no Elevate workout-of-the-day chrome, streak-prose, or per-skill lesson packs.
- **Lumosity** — no Brain Performance Index / LPI, no “n-back as IQ” framing.
- **Peak** — no Peak Brain Map, no Peak Brain Workout layout.
- **NeuroNation** — no NeuroScore, no course-upsell coach, no “brain age”.

Shared *scientific vocabulary* (accuracy, RT, spacing, decay) is not ownership. Fokus keeps its own five domains, Fokus Index (already shipped, 0–999, not IQ), bilingual adult voice, and the existing daily ritual card.

## Never

- Fake IQ, intelligence age, or a competing headline next to Fokus Index
- Medical / diagnostic claims
- New exercises or `registry.ts` edits
- Rewriting G10 spaced-difficulty, G16 longitudinal, or G18 weekly
- Changing difficulty because a re-probe is due
