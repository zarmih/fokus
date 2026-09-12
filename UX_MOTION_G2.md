# UX Motion G2 — ощущение сессии Fokus

Оригинальный язык движения Fokus: короткий ритуал, тактильные плитки, честный фидбек. Не копия Peak / Lumosity / Wikium.

Цель — чтобы 5–12 минут тренировки ощущались собранными: вход в упражнение, удар/промах, праздник результата, прогресс дня.

## Токены

Источник правды: CSS custom properties в `src/styles.css` и зеркало в `src/core/motion.ts` (`MOTION`).

| Токен | Значение | Зачем |
| --- | --- | --- |
| `--motion-instant` | 80ms | смена кадра, тик |
| `--motion-fast` | 150ms | press, hover, countdown |
| `--motion-base` | 240ms | микрофидбек ok/bad |
| `--motion-slow` | 400ms | вход экрана / блока |
| `--motion-ritual` | 640ms | праздник, заполнение квеста |
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | обычные переходы |
| `--ease-enter` | `cubic-bezier(0.16, 1, 0.3, 1)` | появление |
| `--ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | уход |
| `--ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | посадка |
| `--ease-press` | `cubic-bezier(0.22, 0.9, 0.28, 1.18)` | физика нажатия |
| `--motion-travel` | 12px | дистанция входа |
| `--motion-press-y` / `--motion-press-s` | 6px / 0.97 | сжатие плитки |

Только `transform` и `opacity` (плюс inset `box-shadow` для вспышки попадания). Без layout-анимаций ширины в ритуале: `.ritual-fill` растёт через `scaleX`.

## Утилиты

- `.fx-enter` — вход блока / карточки
- `.fx-ok` / `.fx-bad` — микрофидбек (вспышка обода / короткий nudge)
- `.fx-celebrate` — праздник результата (посадка + CSS-искры на `::after`)
- `.press-physics` + `.is-pressed` — физика нажатия
- `.ritual-fill` + `--fill` — прогресс квеста
- `.count-overlay.is-tick` — тик обратного отсчёта

JS: `enterStage`, `applyFeedback`, `celebrate`, `bindPressPhysics`, `replayClass`, `animateCount`, `playSessionCue`, `applyMotionPreference`.

## Жизненный цикл сессии

1. **Intro.** Карточка инструкции `.fx-enter`, `data-session-phase="intro"`.
2. **Countdown.** `3-2-1` через `.is-tick` + cue `tick`.
3. **Enter exercise.** `data-session-phase="play"`, `.play-arena.fx-enter`, cue `enter`.
4. **Hit / miss.** `PlayStage.pulse` внутри упражнения (уже был) + на конце блока `applyFeedback` на `.play-stage` и cue `hit` / `miss`.
5. **Result.** `.result-hero.fx-celebrate`, счётчик XP, cue `ritual` или `celebrate` при уровне / ачивке.

## Каталог и «Сегодня»

- Карточки тренажёров: `.press-physics`, pointer down/up сжимает плитку и тень (как физическая кнопка, не «карточка-приложение»).
- Квесты дня: `.ritual-fill` с `--fill`.
- Серия: `.has-streak` на бейдже и стат-пилле.
- Карточка тренировки входит через `.fx-enter`; после выполнения дня — `.fx-celebrate`.

## Аудио

Слой `src/core/audio.ts` не заменён, к нему добавлен хук:

```ts
playCue(kind: 'hit' | 'miss' | 'combo' | 'tick' | 'enter' | 'celebrate' | 'press' | 'ritual', extra?)
```

`playHit` / `playMiss` / `playCombo` / `playTick` остаются. UI вызывает `playSessionCue` (глушит ошибки, если AudioContext недоступен). `press` по умолчанию не играет на каталоге — слишком шумно. Звук уважает `profile.soundOn`. Reduced-motion **не** выключает звук.

## Reduced-motion

Предпочтительный путь, не «убить всё».

OS: `@media (prefers-reduced-motion: reduce)`.  
JS/тесты: `html[data-motion="reduce"]` через `applyMotionPreference()`.

Что остаётся:

- короткий fade (`fxFade`, ~90ms) вместо travel/scale
- вспышка ok/bad (`fxFlashOk` / `fxFlashBad`) вместо тряски
- мгновенный press (`--motion-press-s: 1`)
- финальные числа без count-up

Что выключается: петли неба/орбов, искры праздника, `scaleX` ритуала, combo pop, countdown tick.

## Производительность

- CSS-first: никаких canvas-конфетти на результате.
- Частицы `PlayStage.burst` уже пропускаются при reduced-motion.
- Press не ставит постоянный `will-change`.
- Анимации не трогают `top/left/width` в новых утилитах.

## Файлы

- `src/styles.css` — токены, утилиты, preferential reduce
- `src/core/motion.ts` — API
- `src/core/audio.ts` — `playCue`
- `src/ui/screens/session.ts`, `result.ts`, `today.ts`, `trainers.ts`
- `src/ui/shell.ts`, `src/main.ts`
- `src/exercises/stage.ts` — тот же `playCue` и `prefersReducedMotion` (без новых упражнений)
- `tests/motion.test.ts`, `tests/audio.test.ts`

Session enter/exit, between-exercise handoff, micro-pulses and the Today ritual halo live in **MOTION_UX_G22.md**. G22 extends these tokens; it does not replace them.
