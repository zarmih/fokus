# Duel & Retention Intelligence (G4)

Чистые модели удержания и дуэлей для Fokus. Ветка готовит Фазу 4 (живой матч) **без WebRTC-протокола** и без новых упражнений.

## Архитектура

```
src/core/retention.ts     ← churn-risk, ритм, мягкие nudges
src/core/duelIntel.ts     ← matchmaking stub, bout rules, spectator summary
src/core/coach.ts         ← getDailySpark читает retention с try/catch
src/ui/screens/today.ts   ← строка «Ритм»
src/ui/screens/progress.ts← карточка ритма с 4 сигналами
src/ui/screens/duel.ts    ← билет подбора + last spectator card
src/ui/screens/duel-session.ts ← константы правил + persist summary
```

`core` не знает о DOM. Экраны вызывают модели и **молча пропускают** блок, если вызов бросил исключение (нет Phase 3 полей, битые данные, private mode).

```
Today / Progress / Coach
        │
        ▼
 assessRetention(daySummaries, sessions, domains, streak, …)
        │
        ├── risk 0–100 (внутренний churn score)
        ├── rhythm = 100 − risk  (то, что видит человек)
        ├── band: stable | watch | at_risk | critical
        └── nudges[0..2]  — не push-копирайт

Duel screen
        │
        ▼
 duelantFromLocal(Fokus Index + domainAbility)
 matchQuality / rankOpponents / rematchStatus
 createBout → applyTick / assignPoints / closeOnTime
 spectatorSummary  (без RT, email, WebRTC stats)
```

Phase 3 (`shieldCharges`, weekly tips, program.ts) **не требуется**. Если `profile.shieldCharges` появится после мержа, retention снизит хрупкость серии после прощённого пропуска. Пока поля нет — сигнал просто его игнорирует.

## Retention model

Четыре сигнала, каждый 0–100:

| id | смысл | вес в смеси |
|---|---|---|
| `adherence_gap` | дни с последней активной сессии + покрытие 14 дней | 0.35 |
| `streak_fragility` | длинная живая серия, не сыграно сегодня, вечер | 0.25 |
| `domain_neglect` | `DomainIndex.updatedAt` / `domainDeltas` старше ~8 дней | 0.20 |
| `session_fatigue` | 2+ сессии сегодня, объём ≫ план, падение accuracy, RTV | 0.20 |

Итоговый `risk = max(смесь, пик·коэффициент)`. Один сильный фактор (четыре дня тишины) не растворяется в среднем. Cold start (меньше двух активных дней **и** gap &lt; 3) не раздувает кризис.

Пороги band: 0–24 stable, 25–49 watch, 50–74 at_risk, 75–100 critical.

UI **не пишет «churn risk»**. Показывается ритм (инверсия) и спокойная подпись: «устойчивый / стоит присмотреться / просел / давно не было сессии».

Nudges (макс. 2, без стека карточек):

- `resume` — пауза не обнуляет навык
- `protect_streak` — поздний вечер не провал
- `short_session` — после паузы короче, не «наверстать»
- `rebalance` — названная область ждала, без марафона
- `rest` — ещё один заход сегодня смажет точность

Coach берёт spark из retention только если band высокий **или** отдельный сигнал ≥ 70. Калибровка, «план выполнен» и прощённый пропуск остаются прежними ранними ветками.

## Duel intelligence

Подбор — stub по **Fokus Index (0–999)** и способности домена, не Elo-витрина.

- Честный коридор: разрыв индекса ≤ 80 и близкая доменная способность.
- `playable` до разрыва 280; дальше матч не предлагается.
- Неравный, но playable бой: слабейший **стартует с 1 очка**. Это гандикап счёта, не power-up и не ускорение.
- Предпочитаемый домен — минимальный разрыв среди общих областей.

Правила схватки (то, что уже жило в `duel-session`, теперь канон в `duelIntel`):

- до 3 очков, 60 секунд
- очко при accuracy ≥ 0.8
- равный счёт на таймере = **ничья**, не победа хоста
- реванш через 15 минут

### Spectator-safe summary (заготовка Фазы 4)

В карточке есть: alias, очки, домен, длительность, win/draw, `closeFinish`, `fairMatch | null`.

В карточке **нет**: email, сырые id, массива RT, accuracy по раундам, ICE/WebRTC, устройства.

`fairMatch: null` для комнаты по коду — это не matchmade бой, честность неизвестна.

WebRTC (`src/core/webrtc.ts`, signaling) в этом PR не расширяется. Экран дуэли лениво поднимает P2P только по клику «Получить код» / «Подключиться», чтобы экран билета рендерился без `RTCPeerConnection`.

## Non-copy notes

Fokus соревнуется по **энергии** ритуала, не копируя UX Wikium / Peak.

Отказались сознательно:

| Троп | Откуда | Почему не наш |
|---|---|---|
| «Прокачай мозг» / Train your brain | Peak, Wikium | обещание, которого нет в дисклеймере Fokus |
| «Нейрофитнес», «возраст мозга», IQ | Wikium | псевдомедицина |
| Streak freeze за кристаллы, «не ломай серию!!!» | Peak | FOMO; у нас один пропуск уже прощается в `streak.ts` |
| You’re on fire / combo-duel overlays | Peak | шум, не схватка |
| Турнир + чужие аватарки + live taunt | Wikium duel | Фаза 4 будет без зрительского чата и без PII |
| Push «your workout is waiting» | оба | nudges — in-app, мягкие, не notification copy |

Своё:

- Fokus Index как билет подбора
- ритм вместо «риска оттока» на экране
- ничья как полноценный исход
- гандикап-очко вместо буста
- усталость просит остановиться, а не «ещё одну»

Копирайт экранов — русский, в голосе существующих spark (`Короткий ритуал`, `Вернуться легче, чем начать`).

## Тесты

- `tests/retention.test.ts` — cold start, gap, fragility, shield fallback, neglect, fatigue, anti-spam
- `tests/duel-intel.test.ts` — fairness, handicap, scoring, draw, cooldown, spectator sanitization
- `tests/coach.test.ts` — вечерняя серия даёт мягкий spark
- `tests/today.test.ts` / `progress-retention.test.ts` / `duel-screen.test.ts` — поверхности

`registry.ts` и модули упражнений не трогались.

## Фаза 4 (не здесь)

Живой signaling, выбор домена комнаты, пул соперников, handicap в openingPoints на старте P2P. Контракт summary и `BoutState` уже стабильны, чтобы не ломать зрительский слой потом.
