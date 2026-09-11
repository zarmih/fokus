# Duel & Retention Intelligence Depth (G15)

Глубина поверх G4 (`DUEL_RETENTION_G4.md`). Чистые модели: вероятность пропуска и оттока, план мягкого возврата со снижением сложности после паузы, готовность к схватке по форме — не по Elo и не по IQ.

Веток G13 (i18n) и G14 (privacy wipe) этот PR не переписывает. `registry.ts` и модули упражнений не трогались.

## Архитектура

```
src/core/retention.ts     ← G4 risk/rhythm + G15 skip/churn + reengagement + floor
src/core/duelIntel.ts     ← G4 match + G15 readiness / spectator chip
src/core/adaptive-plan.ts ← duration after gap; difficultyFor применяет floor
src/core/webrtc.ts        ← контракт: payload без PII (протокол не менялся)
src/ui/screens/today.ts   ← один rhythm-chip
src/ui/screens/duel.ts    ← опциональный badge «К схватке»
```

`core` по-прежнему без DOM. Экраны вызывают модели в try/catch: нет Phase 3 полей, битые данные, private mode — блок просто не рисуется.

```
Today
  assessRetention(...)
    ├── G4: risk, rhythm, band, nudges[0..2]
    ├── G15 riskModel: skipProbability, churnProbability, quality, spacing, continuity
    └── G15 reengagement: steps[1..3] + difficultyFloor
         └── planForNow / difficultyFor  (floor, если движок v2 на месте)

Duel
  assessDuelReadiness(domains + recent RT/accuracy)
    └── spectatorReadyChip  (alias, band, domain — без RT и email)
```

Если PR движка / программы не влит: `applyDifficultyFloor` — чистая функция, `difficultyFor` молча возвращает исходный pick при `multiplier = 1`.

## Retention risk (прозрачные формулы)

G4-смесь четырёх сигналов **не менялась**. G15 считает вероятности отдельно, чтобы не ломать ритм на экране.

### Качество недавних сессий `quality` (0–100)

Последние 4 сессии, веса 1..4 (новее важнее):

```
q_i = 100 · (0.60 · accuracy + 0.25 · rtComfort + 0.15 · loadFit)
rtComfort = clamp(1 − (avgRtMs − 400) / 1400, 0, 1)
loadFit   = clamp(durationSec / max(60, plannedSec · 0.5), 0.35, 1)
quality   = Σ w_i q_i / Σ w_i
```

`rtComfort` — удобство недавней формы, **не** оценка интеллекта. Нет сессий → нейтральные 55, sample = 0.

### Непрерывность серии `continuity` (0–1)

- сыграли сегодня → 1
- серия жива, gap ≤ 1 → `0.55 + 0.03 · min(streak, 10)`
- gap ≥ 2 → `streak / (streak + 3 · gapDays)`
- серии нет → 0

### Интервалы `spacing`

Активные дни за 21 календарный день: средний gap и CV (`irregularity`). `lastGapDays` = G4 `gapDays`.

### P(skip) — пропуск следующего ритуала

Логит (`SKIP_LOGIT` экспортируется из `retention.ts`):

```
z = −1.35
  + 0.55 · clamp(gapDays, 0, 10) / 4
  + 0.90 · (1 − quality / 100)
  + 0.40 · (1 − continuity)
  + 0.25 · clamp(irregularity, 0, 1.5)
  + (−0.55, если сыграли сегодня)
  + 0.35 · fatigue / 100

P_skip = logistic(z) ∈ [0.04, 0.90]
```

Cold start (< 2 активных дней и gap < 3): потолок 0.16. Не раздуваем кризис из пустой истории.

### P(churn) — нет сессии в ближайшие 7 дней

```
independent = 1 − (1 − P_skip)^remainingDays     // 6, если сегодня уже сыграли, иначе 7
gapLift     = clamp((gapDays − 1) · 0.07, 0, 0.38)
qualityLift = 0.10 если quality < 42; 0.04 если < 55; иначе 0

P_churn = 0.50 · independent + 0.30 · P_skip + 0.20 · gapLift + qualityLift
```

После сегодняшней чистой сессии (quality ≥ 60, gap = 0) оценка умножается на 0.55. Cold start: потолок 0.12. Диапазон [0.03, 0.92].

UI **не показывает проценты оттока**. На «Сегодня» — ритм и одна спокойная строка плана.

## Re-engagement plan

1–3 шага (`dayOffset` 0, 1, 2), не стек пуш-карточек:

| Когда | Шаги |
|---|---|
| Пауза ≥ 2 дней | мягкий вход → короткий шаг → вернуть обычную длину / область |
| Усталость сегодня | остановиться → завтра как обычно |
| Ритм тонкий, gap 0–1 | один короткий ритуал |

### Difficulty floor после паузы

Никогда не повышает сложность. Шкала движка 1–30:

| gapDays | multiplier | delta | durationSec |
|---|---|---|---|
| 0–1 | 1.00 | 0 | как в профиле |
| 2 | 0.92 | 1 | min(план, 300) |
| 3–4 | 0.85 | 2 | min(план, 300) |
| 5–7 | 0.78 | 3 | min(план, 300) |
| ≥ 8 | 0.70 | 4 | min(план, 240) |

Если quality < 40 и gap ≥ 2: ещё −0.05 к multiplier и +1 к delta, multiplier ≥ 0.60.

```
applyDifficultyFloor(stored, floor) = clamp(round(stored · multiplier − delta), 1, stored)
```

Проводка: `difficultyFor` (сессия) и укорочение `durationSec` в `planForNow` / Today. Нет движка — floor остаётся данными.

## Duel readiness

Matchmaking-agnostic fairness **этого** игрока, не пары:

```
abilityNorm = clamp(mean(ready domain values) / 900, 0, 1)
rtScore     = clamp(1 − (recentRtMs − 400) / 1500, 0, 1)
stability   = 1 − CV(accuracy) по последним блокам

fairness = 100 · (0.40 · abilityNorm + 0.30 · accuracy + 0.20 · rtScore + 0.10 · stability)
```

Меньше 2 сессий → × 0.55; меньше 2 доменов → × 0.85.

Полосы: &lt; 35 `not_ready` · &lt; 55 `warming` · &lt; 80 `ready` · иначе `sharp`.

`fairForSelf` — зеркальный билет был бы честным (fairness ≥ 55, 2+ сессии, 2+ домена).

Парный `matchQuality` G4 **не сломан**: форма (RT/accuracy) подмешивается, только если у **обоих** `formSample ≥ 2`. Иначе веса 0.65 / 0.35 как в G4.

### Spectator-safe

В chip / summary есть: alias (через `safeAlias`), band, domain, очки, win/draw.

Нет: email, сырых id, RT, accuracy, ICE/WebRTC, устройств.

`SpectatorSummary.readinessBand` опционален; старые JSON без поля читаются как `null`.

## UX (тонкий слой)

- **Сегодня**: один `rhythm-chip` (`role="status"`, `data-rhythm`, `data-skip`). Текст — ритм + полоса + заголовок шага плана. Не «churn 41%».
- **Дуэль**: badge `К схватке` / `Форма греется` / `Пока рано` / `Форма собрана`, если Fokus Index уже есть.
- `prefers-reduced-motion`: chip и badge без анимации.
- Цвет не единственный сигнал — есть текст полосы.

Настройки / wipe G14 не трогались. Новых ключей i18n нет: копирайт русский, как у G4 spark.

## Non-copy notes

Соревнуемся энергией ритуала, не копируя Wikium / Peak / Elevate / Lumosity / NeuroNation.

| Троп | Откуда | Почему не наш |
|---|---|---|
| «Прокачай мозг», Train your brain | Peak, Wikium | обещание вне дисклеймера Fokus |
| Нейрофитнес, возраст мозга, IQ | Wikium | псевдомедицина; формулы G15 это прямо отрицают |
| Streak freeze / «не ломай серию» | Peak | FOMO; один пропуск уже прощается |
| You’re on fire / combo overlays | Peak | шум, не готовность |
| Турнир, чужие аватарки, taunt | Wikium duel | chip без PII, без чата |
| Push «workout is waiting» | оба | in-app, 1–3 шага, не notification copy |
| Brain age / percentile IQ | Lumosity / Elevate | Fokus Index 0–999 — билет, не диагноз |

Своё:

- P(skip) / P(churn) как честные вероятности, на экране — ритм
- floor сложности после паузы, не «наверстать»
- fairness готовности из формы, не лига
- ничья и гандикап-очко остаются каноном G4

## Тесты

- `tests/retention.test.ts` — G4 + skip/churn, quality, floor, anti-spam плана
- `tests/duel-intel.test.ts` — G4 + readiness, spectator chip, backward-compatible matchQuality
- `tests/today.test.ts` / `tests/duel-screen.test.ts` — chip и badge

`npm test` и `npm run build` зелёные.
