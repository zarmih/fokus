# SOUNDSCAPE G12 — Web Audio cue graph

Архитектура звука и тактильной обратной связи Fokus. Без новых упражнений, без сэмплов, без сети.

Цель: один именованный граф сигналов, который можно планировать без `AudioContext`, воспроизводить через Web Audio и опционально дублировать коротким `navigator.vibrate`. Громкость, mute и `prefers-reduced-motion` применяются в одном месте.

## Зачем граф, а не набор `beep()`

До G12 `src/core/audio.ts` создавал осцилляторы напрямую из `playHit` / `playMiss` / `playCombo` / `playTick`. Это работало, но:

- mute жил только как `profile.soundOn`; громкости не было;
- вибрация была зашита в `stage.burst` и игнорировала настройки;
- `prefers-reduced-motion` гасил частицы, но не фанфары;
- countdown, блок и экран результата звучали одним и тем же `playBeep`.

Граф разделяет **что сыграть** (`soundscape.ts`) и **как вывести** (`audio.ts`, `haptics.ts`).

```
prefs (mute, volume, haptics, reduced-motion)
        │
        ▼
 scheduleCue(id)  ──►  partials + duck list + haptic | skip
        │                         │
        ▼                         ▼
  master GainNode           vibrateForCue()
  (Web Audio graph)         (optional, no-op if API missing)
```

## Узлы

| id | kind | voice | Когда | Характер |
|---|---|---|---|---|
| `tap` | feedback | ui | countdown tick, лёгкий UI | короткий square 620 Hz |
| `hit` | feedback | trial | верный ответ | triangle + октава, высота растёт с combo 1–10 |
| `miss` | feedback | trial | ошибка | нисходящий square 240→90 Hz |
| `combo` | flourish | phrase | вехи 3 / 5 / 8 / 12 | мажорное трезвучие от 392 Hz |
| `ritual` | flourish | phrase | старт блока (после 3-2-1) | восходящая квинта |
| `celebrate` | flourish | phrase | экран результата сессии | короткий мажорный арпеджио |

`playBeep(ok)` остаётся совместимым алиасом: `hit` / `miss`. `playTick()` = `tap`.

## Рёбра (ducking)

У каждого узла есть `ducks: CueId[]`. Рендерер держит живые voice-gain ноды и за 30 мс уводит их в тишину.

```
tap  ──ducked by──► ritual
hit  ──ducked by──► miss
tap, hit, miss, combo, ritual  ──ducked by──► celebrate
```

Combo **не** давит hit: веха должна лечь поверх атаки попадания, как раньше. Miss давит хвост hit, если они пересеклись. Celebrate глушит всё — это конец сессии, не ещё один trial.

Голоса (`ui` / `trial` / `phrase`) документируют роль; ducking идёт по id, не по шине, чтобы hit и miss на одном `trial` не глушили сами себя.

## Шина Web Audio

```
Oscillator → envelope Gain → voice Gain → master Gain → destination
```

- Envelope: 12 мс attack, экспоненциальный release на длительности партиала.
- Voice gain: цель ducking.
- Master gain: `0` при mute, иначе `soundVolume` ∈ [0, 1]. Живой слайдер вызывает `applyMasterGain()` без пересоздания контекста.

Контекст один на вкладку, создаётся лениво, `resume()` на первом жесте (`unlockAudio` в `main.ts` и при включении звука в настройках). Сэмплов нет: PWA остаётся автономным.

Планирование (`scheduleCue`) **не** умножает gain партиалов на volume — это делает master, чтобы смена громкости действовала на уже звучащий хвост.

## Prefs

Поля профиля (без bump `schemaVersion`: `getProfile()` мержит дефолты):

| поле | тип | default | роль |
|---|---|---|---|
| `soundOn` | boolean | `true` | mute. `false` ⇒ master 0, партиалы не создаются |
| `soundVolume` | 0..1 | `1` | громкость. `0` эквивалентен mute по аудио |
| `hapticsOn` | boolean | `true` | опциональные vibrate-хуки. Не зависит от mute |

Чтение: `readSoundPrefs(profile, reducedMotion?)`. Невалидный volume сжимается в `[0, 1]`, `NaN` → `1`. `hapticsOn !== false` — чтобы старые профили без поля остались с вибрацией.

Настройки: чекбокс mute, range 0–100 (disabled при mute), чекбокс вибрации.

## Reduce-motion sync

Источник: `window.matchMedia('(prefers-reduced-motion: reduce)')`, тот же сигнал, что уже гасит CSS и частицы стейджа. Отдельного пользовательского тоггла нет — OS accessibility setting.

| cue | normal | reduced-motion |
|---|---|---|
| tap / hit / miss | полный envelope, sweep у hit/miss | ≤ 80 мс, без sweep, gain × 0.7, square→sine |
| combo | трезвучие | **skip** (hit уже подтвердил успех) |
| ritual / celebrate | фраза из 3–4 партиалов | один sine ≤ 80 мс, gain × 0.55 |
| haptic flourish | combo / ritual / celebrate | **skip** |
| haptic feedback | 8 / 12 / 28 мс | остаётся (это не motion) |

Визуальный burst по-прежнему не запускает rAF при reduced-motion. `pulse()` не дублирует haptic: звук+вибрация идут из `playCue`, burst только рисует частицы (`{ haptic: false }`). Одиночный `stage.burst()` (verbal-fluency) по-прежнему зовёт `vibrateForCue('hit'|'miss')`.

## Optional vibrate hooks

`src/core/haptics.ts`:

- `vibrateForCue(id, prefs)` — смотрит тот же `scheduleCue`, что и аудио.
- `vibratePattern(pattern)` — тонкая обёртка Vibration API.
- `canVibrate(prefs?)` — false, если API нет или `hapticsOn === false`.
- Нет API / отказ / исключение → `false`, без throw.

Паттерны:

| cue | pattern (ms) |
|---|---|
| tap | `8` |
| hit | `12` |
| miss | `28` |
| combo | `[12, 40, 12]` |
| ritual | `[10, 30, 16]` |
| celebrate | `[20, 40, 20, 40, 40]` |

Вибрация не подменяет звук и не включается «сама»: хук опционален. На десктопе без Vibration API всё молча no-op.

## Публичный API (`src/core/audio.ts`)

Совместимость:

- `unlockAudio()`
- `playHit(combo?)` / `playMiss()` / `playCombo(combo)` / `playBeep(ok)` / `playTick()`
- `nextCombo(combo, ok)`

Новое:

- `playCue(id, ctx?, prefs?)` → `ScheduledCue`
- `playTap()` / `playRitual()` / `playCelebrate()`
- `applyMasterGain()`
- `scheduleCue` / `readSoundPrefs` / `clampVolume` / `detectReducedMotion` / `CUE_GRAPH` / `COMBO_MILESTONES`

Тестовые швы (не для продакшена): `__setAudioContextForTests`, `__resetAudioForTests`, `__setVibrateForTests`.

## Точки врезки

| место | cue |
|---|---|
| `main.ts` pointer/key | `unlockAudio` |
| countdown tick (`session`, `duel-session`) | `tap` |
| countdown 0 — старт блока | `ritual` |
| `stage.pulse(ok)` | `hit` / `miss`, плюс `combo` на вехах |
| конец блока, accuracy ≷ 0.8 | `playBeep` → hit/miss |
| `result.ts` mount | `celebrate` |
| arcade-shooter hit | `playBeep(true)` → hit |
| settings mute/volume | `unlockAudio` + `applyMasterGain` |

Новых упражнений нет. Движки игр не знают о графе: они зовут `stage.pulse` / старые хелперы.

## Тестирование без AudioContext

`scheduleCue` чистый: jsdom не нужен для графа, mute, volume, reduce-motion и haptic-skip. Рендерер проверяется фейковым контекстом (счётчик `createOscillator`) и тестами «не бросает», как раньше.

## Не-цели G12

- Новые упражнения или смена правил существующих.
- Загрузка WAV/MP3, пространственное аудио, музыкальный bed.
- Серверный синтез, Web MIDI.
- Отдельный in-app тоггл reduced-motion (синхронизируемся с OS).
- Обязательная вибрация: хуки strictly optional.

## Key decisions

1. **Граф отдельно от рендерера.** Планирование тестируется в Node/jsdom; Web Audio — деталь вывода.
2. **Синтез осцилляторами, без ассетов.** Совместимо с офлайн-PWA и текущим бандлом.
3. **Master gain, не bake volume в партиалы.** Слайдер действует на хвост.
4. **Mute ≠ haptics.** Можно играть молча с вибрацией и наоборот.
5. **Reduce-motion режет flourish, оставляет короткий feedback.** Функциональный hit/miss не пропадает.
6. **Обратная совместимость `playHit`/`playMiss`/`playTick`/`playBeep`.** Вызовы в упражнениях не трогаем, кроме стейджа (вехи через `COMBO_MILESTONES`) и countdown→ritual / result→celebrate.
