# Deep Focus Mode (G17)

Full-session focus mode for the daily ritual: hide chrome, larger tap targets, an optional remaining-time ring, DND-ish flags, and resume after an interrupt. It sits on top of session quality & recovery (G8). It does not replace G8 and does not add exercises.

## Architecture

```
profile.focusMode / focusTimerRing / focusDnd / focusCheckpoint
        │
        ▼
src/core/focus-mode.ts     pure  →  prefs, flags, ring math, checkpoint TTL, visit/abandon
        │
        ├─ session.ts      hide chrome, larger targets, ring, pause on hide, save snapshot
        ├─ today.ts        resume card  or  stale → G8 abandoned session
        ├─ settings.ts     explainer + three toggles
        └─ reminders.ts    maybeNotify no-ops while a DND session is live
```

Core does not import the UI, `registry.ts`, or exercise engines. `recovery.ts` and `sessionQuality.ts` are unchanged. A discarded or expired snapshot is turned into the same abandoned `Session` G8 already scores (`interrupted`, `endReason: 'abandoned'`, `finishedAt: null`).

Storage schema stays at **4**. Optional profile fields are read with defaults — no migration.

| Field | Default | Meaning |
| --- | --- | --- |
| `focusMode` | on (`!== false`) | Hide session chrome, enlarge targets |
| `focusTimerRing` | on | SVG remaining-time ring next to the clock |
| `focusDnd` | on | Suppress reminder toasts, wake-lock best-effort, auto-pause when the tab hides |
| `focusCheckpoint` | absent | Ephemeral mid-ritual snapshot |

## Checkpoint / resume

Only a **normal** ritual writes a snapshot (not practice, probe, or duel).

Saved after a finished block, on «Выйти», on `visibilitychange` (hidden), and on `pagehide` — if there is progress (a block, a later index, or play already started). Opening the intro and leaving immediately does not create a snapshot, matching G8’s “no results → no abandoned session”.

`visitCheckpoint` on Today:

- **fresh** (≤ 4 hours, `timeLeft > 0`, valid index) → resume card, plan frozen from the snapshot
- **stale with blocks** → `storage.addSession` with G8 abandoned fields, then drop the snapshot
- **stale empty** → drop

Resume does **not** re-run `planWithRecovery` for the restored block (`skipReplanOnce`). Later blocks still go through the existing mid-session replan, so the recovery gate is not undone.

«Начать заново» writes the abandoned session (if any blocks) and clears the snapshot. Completing the ritual clears the snapshot and writes a finished session as before.

## UX

- **Session** — no tab bar / top bar (already `hideNav`). Focus mode also drops the block recap, «Заново», and the extra block label. Exit is a 48px «Выйти». Play-arena buttons get a 48px minimum via CSS, without touching exercise modules.
- **Timer ring** — optional SVG around the remaining time. `role="timer"` stays on the clock. `prefers-reduced-motion` / `data-motion="reduce"` disable dashoffset animation.
- **DND** — in-session reminders are skipped; hiding the tab pauses and checkpoints; Screen Wake Lock is requested when the API exists. This is not a system-wide Do Not Disturb and not a clinical attention mode.
- **Today** — «Сессия прервана» with Продолжить / Начать заново. Hidden when there is nothing to resume.
- **Settings** — explanation + three toggles, default on.

Copy is Russian, matches the existing coach voice, and never calls this IQ, «режим гения», treatment, or a brain score.

No new exercises. `registry.ts` and exercise modules are untouched.

## Non-copy notes

This is original Fokus session UX. It is not a port of Forest, Freedom, Opal, Focus@Will, Headspace Focus, or the “focus training” marketing of Wikium / Lumosity / Peak / Elevate / NeuroNation.

| Product | What we did **not** take |
| --- | --- |
| **Forest / Freedom / Opal** | App-blocking, planted trees, paid unlocks, lockout timers as the product |
| **Headspace / Calm** | Meditation scripts, “focus journeys”, subscription voice |
| **Wikium / Lumosity** | Brain-age, LPI, “train your brain” overclaim, their game catalogs |
| **Peak / Elevate** | Workout packs, SAT-style skill copy, progress-ring branding as identity |

Fokus Index (ability) and session quality (process, G8) stay separate. Focus mode is **how the ritual looks and pauses**, not a new score.

## Files

| Path | Role |
| --- | --- |
| `src/core/focus-mode.ts` | Pure prefs, flags, ring, checkpoint visit |
| `src/core/types.ts` | Optional profile fields + `FocusCheckpoint` |
| `src/core/reminders.ts` | Skip notify while DND session is live |
| `src/ui/screens/session.ts` | Chrome, ring, pause-on-hide, save/restore |
| `src/ui/screens/today.ts` | Resume card; stale → G8 abandon |
| `src/ui/screens/settings.ts` | Explainer + toggles |
| `src/styles.css` | `.focus-mode` targets, ring, quieter chrome |
| `tests/focus-mode.test.ts` | Prefs, ring, TTL, G8-shaped abandon |
| `tests/focus-mode-ui.test.ts` | Settings, Today, session chrome / resume |

## Hotspots avoided

G8 (`recovery.ts`, `sessionQuality.ts`) is not rewritten. G5 shell landmarks stay (skip link, `main`). G7 onboarding / calibration is unchanged except that a probe does not write a focus checkpoint. Planner scoring in `session-builder.ts` is unchanged.

## Verification

```bash
npm test
npm run build
```
