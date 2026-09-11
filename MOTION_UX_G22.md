# Motion UX G22 — язык движения Fokus

**EN.** Peak-level session motion for Fokus: enter, between-exercise handoff, success/miss pulses, and a quiet Today halo. Original language — not a Peak / Wikium / Lumosity clone. Extends UX Motion G2 and respects Deep Focus Mode G17. No new exercises.

**RU.** Движение сессии Fokus на уровне «собранного ритуала»: вход, передача между блоками, микро-пульс попадания/промаха и спокойный ореол на карточке «Сегодня». Свой язык, не копия Peak / Wikium. Надстройка над G2, уважает режим фокуса G17.

## Зачем / Why

G2 already gives press physics, `.fx-enter` / `.fx-ok` / `.fx-bad` / `.fx-celebrate`, and a preferential reduced-motion path. G22 adds the *session sentence*: settle in, pass the baton, pulse on the hit, breathe out.

It does not add streaks-as-threat, countdown FOMO, IQ fireworks, or a second motion system.

## Non-copy

| Product | What we did **not** take |
| --- | --- |
| **Peak** | Lightning badges, bouncy card stacks, workout-pack chrome, genius labels |
| **Wikium** | Neon IQ bursts, «нейрофитнес» pulses, paywall urgency |
| **Lumosity** | Perfect-Day rings as identity, BPI fireworks |
| **Elevate** | SAT-style skill stamps, “you’re on a roll” bounce |

Fokus motion is short, vertical, and quiet. Handoff travels a few pixels sideways — a page turn, not a carousel.

## Tokens

Source of truth: CSS custom properties in `src/styles.css`, mirrored in `src/core/motion.ts` (`MOTION`, `MOTION_SCALE`).

G2 tokens stay. G22 adds:

| Token | Value | For |
| --- | --- | --- |
| `--motion-pulse` | 180ms | success / miss micro-pulse |
| `--motion-exit` | 240ms | session / block leave |
| `--motion-handoff` | 320ms | between exercises |
| `--motion-halo` | 1600ms | Today rim breathe (optional) |
| `--ease-handoff` | `cubic-bezier(0.33, 1, 0.32, 1)` | breath between blocks |
| `--motion-travel-handoff` | 8px | sideways pass (G2 travel is 12px up) |
| `--motion-scale-pulse` | 1.018 | hit settle |
| `--motion-scale-miss` | 0.985 | miss settle |
| `--motion-scale-enter` | 0.97 | session sit-down |
| `--motion-scale-exit` | 0.98 | session leave |

Only `transform` and `opacity` (plus the existing G2 inset `box-shadow` flash). Halo is a masked conic rim, not a layout width animation.

## Session sentence

1. **Enter.** First intro: `enterSession` → `.fx-session-enter` on the shell (scale + fade). Instruction card still uses G2 `.fx-enter`.
2. **Countdown / play.** Unchanged G2: `.is-tick`, `enterStage`, cue `enter`.
3. **Hit / miss.** G2 `applyFeedback` / `PlayStage.pulse` now compose a G22 scale pulse (`.fx-pulse-ok` / `.fx-pulse-miss` and extra keyframes on `.pulse-ok` / `.fx-ok`). No new shake language.
4. **Handoff.** After a finished block, `data-session-phase="handoff"`, brief wait (`motionMs('handoff')`), then the next intro: recap `.fx-handoff-recap` from above, card `.fx-handoff-enter` from the side.
5. **Exit.** Last block: `data-session-phase="exit"`, `.fx-session-exit`, then the existing result screen (G2 `.fx-celebrate`).

JS: `enterSession`, `handoffStage`, `exitStage`, `applyPulse`, `afterMotion`, `motionMs`, `ritualHaloProgress`. G2 helpers are unchanged.

## Today halo

Optional rim on the ritual card after calibration.

- `--halo` is 0…1 from today’s quest fill, clamped so an untouched day still has a faint presence (~0.1), never an empty “you’re late” ring.
- Done ritual: `--halo: 1`, class `is-settled`, no breathe.
- No time-of-day decay, no streak colour, no red pulse.
- Screen-reader text via `t('today.halo_*')` (RU + EN).
- Off until calibration (the first-step card stays still).

## G2 / G17 integration

- **G2** — tokens, `.fx-*` utilities, press physics, reduced-motion fade/flash path. G22 appends; it does not rename or delete G2 classes.
- **G17** — `html.focus-mode` (and `data-focus`) is *read*, never written here. When G17 is merged, focus mode shortens handoff/exit to `--motion-fast`, swaps travel for `fxFade`, and stops the halo breathe. This branch does not import `focus-mode.ts` and does not edit `registry.ts`.

## Reduced-motion (G5)

OS: `@media (prefers-reduced-motion: reduce)`.  
JS/tests: `html[data-motion="reduce"]` via existing `applyMotionPreference()`.

| Full | Reduce |
| --- | --- |
| session enter/exit travel + scale | `fxFade` ~90ms, scales → 1, JS delay 0 |
| handoff translateX | fade |
| pulse scale | `fxFlashOk` / `fxFlashBad` (same as G2) |
| halo breathe | static rim |
| `prefers-reduced-transparency` | 2px solid accent, no glow mask |

Sound and haptics are unchanged (G12). Reduced-motion does not mute them.

## Files

| Path | Role |
| --- | --- |
| `src/styles.css` | tokens, G22 utilities, reduce + focus-mode composition |
| `src/core/motion.ts` | `MOTION` / `MOTION_SCALE`, session helpers, halo math |
| `src/core/i18n.ts` | RU+EN halo / handoff / closing strings |
| `src/ui/screens/session.ts` | enter, handoff, exit wiring |
| `src/ui/screens/today.ts` | ritual halo on the workout card |
| `tests/motion.test.ts` | token lockstep, helpers, Today, session enter |
| `MOTION_UX_G22.md` | this doc |

Hotspots avoided: `src/exercises/registry.ts`, exercise engines, G17 `focus-mode.ts`, G8 recovery/quality, G12 cue graph.

## Verification

```bash
npm test
npm run build
```

Не мержить без ревью.
