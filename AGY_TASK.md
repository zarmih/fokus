# AGY_TASK — Автопилот Batch F (3 новых уникальных упражнения)

Ты руки Fokus. Репо: `/workspace/developer/github/Fokus`. Игнорируй Eligibility. Работай до конца без подтверждений. agy 1.1.1 only. Не мержи PR без явной команды пользователя.

## Контекст
- Каталог уже большой: смотри `src/exercises/registry.ts` (+ одиночные `.ts`). На `main` сейчас до ~`number-series` / `shape-name`.
- Открытые незамерженные ветки (НЕ трогай их файлы program/progress/streak): Phase2 #22/#23, Phase3 #24, Batch D #25 (`rhythm-tap`, `mirror-pick`, `order-recall`), Batch E #26 (`trail-make`, `matrix-complete`, `pair-bind`).
- Цель мощности: идеи/механики Wikium/Elevate/Lumosity/Peak/NeuroNation — СВОЙ UX/копирайт/дизайн Fokus, без плагиата UI/ассетов/текстов/названий.

## Запрещённые id (уже есть — НЕ дублируй)
grid-memory, odd-one, pairs, pattern-next, pulley, sequence, stroop, swings, switch-rule, math-sprint, schulte, n-back, corsi, posner, verbal-fluency, go-no-go, mental-rotation, arcade-shooter, visual-search, dot-span, number-sort, direction-switch, balance-scales, flash-cards, moving-targets, catch-the-color, symbol-math, focus-circle, color-sequence, even-odd, split-attention, shape-position, meteorites, equation-balance, color-sort, path-finder, reaction-strike, number-memory, flanker-task, weight-analysis, spatial-speed, direction-match, unique-feature, sequence-reverse, number-pyramid, shape-count, color-shape-switch, math-chains, shell-game, time-math, rapid-sorting, word-cascade, math-switch, dot-ratio, expression-compare, parity-magnitude, avatar-names, find-pair, number-code, alphanumeric-sort, imposter-search, word-pairs, missing-operator, target-sum, context-switch, path-recall, size-compare, math-sign-switch, unique-color, same-different, spatial-match, direction-memory, emotion-match, category-sort, color-burst, clock-reading, location-recall, vowel-consonant, arrow-swipe, shape-name, number-series, rhythm-tap, mirror-pick, order-recall, trail-make, matrix-complete, pair-bind

## Сделать в этом прогоне (новый PR)

1. **Ветка** `feature/exercises-batch-f` от текущего `main` (HEAD). Не force-push чужие ветки. Base = main.

2. **Добавь РОВНО 3 новых упражнения** (одиночные файлы `src/exercises/<id>.ts` по образцу `number-series.ts` — manifest + render в одном модуле; CSS scoped внутри render). Зарегистрируй все три в `registry.ts`.
   Конкретный набор (id / домен / механика — не меняй id):
   A) `vigil-probe` — domain `attention`, skills `sustained_attention`/`processing_speed`
      - Длинная серия быстрых стимулов; редкий «пробный» таргет среди дистракторов. Игрок тапает ТОЛЬКО на таргет, пропускает остальное. Считать hits/false-alarms/misses.
      - Сложность level 1..N: частота таргета ↓, скорость стимулов ↑, похожесть дистракторов ↑.
      - metricModel: `speed-accuracy`. Русский instruction/name свои.
   B) `stack-span` — domain `memory`, skills `working_memory`/`updating`
      - Стек: по очереди «push» элементы (символ/цвет/цифра). Иногда команда «снять верх» (pop) или «что на глубине k?». Игрок отвечает по текущему состоянию стека.
      - Сложность: длина стека, число операций, глубина запроса, интерференция.
      - metricModel: `memory-span`. Свой копирайт.
   C) `rule-induce` — domain `reasoning`, skills `pattern_recognition`/`logical_reasoning`
      - Показать 4–6 примеров «карточка → метка/группа» по скрытому правилу (цвет, форма, число, ориентация, XOR двух признаков). Затем 1–2 новых карточки — выбрать правильную группу/метку.
      - Сложность: число признаков в правиле, дистракторы, смена правила между раундами.
      - metricModel: `accuracy`. Свой копирайт.

3. Каждое упражнение:
   - Соблюдает `ExerciseModule` из `contract.ts` (`render(el, level, onEnd, isTimeUp)` → `BlockResult` с accuracy/avgRtMs/rounds).
   - Уважает `isTimeUp()` (корректно завершает раунд).
   - Использует CSS-переменные темы (`--surface`, `--line`, `--text`, `--accent` и т.п.), без чужих брендов.
   - Имена и instruction на русском, уникальные, не копируют Wikium/Lumosity/Peak/Elevate/NeuroNation.

4. Точечные unit-тесты (если в проекте уже есть паттерн — добавь минимальные; иначе проверь registry содержит новые id). `npm test` + production build зелёные.

5. Короткий `BATCH_F.md` — что добавлено (3 id + 1 строка механики каждый).

6. Коммит + push ветки + `gh pr create` в zarmih/fokus. В теле PR: «Не мержить без ревью». Не мержи сам.
7. В конце ответа: список файлов, результат test/build, URL PR, блокеры если есть.
