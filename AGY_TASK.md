# AGY_TASK — Автопилот Batch E (3 новых уникальных упражнения)

Ты руки Fokus. Репо: `/workspace/developer/github/Fokus`. Игнорируй Eligibility. Работай до конца без подтверждений. agy 1.1.1 only. Не мержи PR без явной команды пользователя.

## Контекст
- Каталог уже большой: смотри `src/exercises/registry.ts` (+ одиночные `.ts`). На `main` сейчас ~до `number-series` / `shape-name`; ветка Batch D (`feature/exercises-batch-d`, PR #25) ещё не в main — там уже есть `rhythm-tap`, `mirror-pick`, `order-recall`.
- Phase 2/3 в открытых PR #22/#23/#24 — в этом батче НЕ трогай program/progress/streak/weekly-review/fokus-index.
- Цель мощности: идеи/механики Wikium/Elevate/Lumosity/Peak/NeuroNation — СВОЙ UX/копирайт/дизайн Fokus, без плагиата UI/ассетов/текстов/названий.

## Запрещённые id (уже есть — НЕ дублируй)
grid-memory, odd-one, pairs, pattern-next, pulley, sequence, stroop, swings, switch-rule, math-sprint, schulte, n-back, corsi, posner, verbal-fluency, go-no-go, mental-rotation, arcade-shooter, visual-search, dot-span, number-sort, direction-switch, balance-scales, flash-cards, moving-targets, catch-the-color, symbol-math, focus-circle, color-sequence, even-odd, split-attention, shape-position, meteorites, equation-balance, color-sort, path-finder, reaction-strike, number-memory, flanker-task, weight-analysis, spatial-speed, direction-match, unique-feature, sequence-reverse, number-pyramid, shape-count, color-shape-switch, math-chains, shell-game, time-math, rapid-sorting, word-cascade, math-switch, dot-ratio, expression-compare, parity-magnitude, avatar-names, find-pair, number-code, alphanumeric-sort, imposter-search, word-pairs, missing-operator, target-sum, context-switch, path-recall, size-compare, math-sign-switch, unique-color, same-different, spatial-match, direction-memory, emotion-match, category-sort, color-burst, clock-reading, location-recall, vowel-consonant, arrow-swipe, shape-name, number-series, rhythm-tap, mirror-pick, order-recall

## Сделать в этом прогоне (новый PR)

1. **Ветка** `feature/exercises-batch-e` от текущего `main` (HEAD). Не force-push чужие ветки. Не начинай от Batch D — base = main.

2. **Добавь РОВНО 3 новых упражнения** (одиночные файлы `src/exercises/<id>.ts` по образцу `number-series.ts` — manifest + render в одном модуле; CSS scoped внутри render). Зарегистрируй все три в `registry.ts`.
   Конкретный набор (id / домен / механика — не меняй id):
   A) `trail-make` — domain `attention`, skills `visual_scanning`/`processing_speed`
      - Сетка/поле с узлами, подписанными числами (и на высоких уровнях — чередование числа+буквы). Игрок тапает узлы строго по возрастанию (1→2→3…; или 1→A→2→B…).
      - Сложность level 1..N: число узлов, размер поля, mixed alphanumeric, штраф за промах.
      - metricModel: `speed-accuracy`. Русский instruction/name свои.
   B) `matrix-complete` — domain `reasoning`, skills `pattern_recognition`/`logical_reasoning`
      - Показать матрицу 3×3 с одной пустой клеткой и 3–4 вариантами ответа; выбрать паттерн, который логично заполняет пустоту (ряд/столбец/диагональ правил: цвет, форма, число, ориентация).
      - Сложность: число одновременно действующих правил, похожесть дистракторов.
      - metricModel: `accuracy`. Свой копирайт.
   C) `pair-bind` — domain `memory`, skills `working_memory`/`associative_memory`
      - Фаза кодирования: кратко показать N пар «стимул → метка» (символ/цвет/иконка → короткое слово или число). Затем фаза теста: показать стимул, выбрать правильную метку из вариантов.
      - Сложность: N пар, время показа, похожесть пар, интерференция.
      - metricModel: `memory-span`. Свой копирайт.

3. Каждое упражнение:
   - Соблюдает `ExerciseModule` из `contract.ts` (`render(el, level, onEnd, isTimeUp)` → `BlockResult` с accuracy/avgRtMs/rounds).
   - Уважает `isTimeUp()` (корректно завершает раунд).
   - Использует CSS-переменные темы (`--surface`, `--line`, `--text`, `--accent` и т.п.), без чужих брендов.
   - Имена и instruction на русском, уникальные, не копируют Wikium/Lumosity/Peak/Elevate/NeuroNation.

4. Точечные unit-тесты (если в проекте уже есть паттерн тестов упражнений — добавь минимальные smoke/score helpers; иначе хотя бы проверь что registry содержит новые id через простой тест или обнови существующий catalog-тест). `npm test` + production build зелёные.

5. Короткий `BATCH_E.md` — что добавлено (3 id + 1 строка механики каждый).

6. Commit + push + открой PR в `zarmih/fokus` (base: `main`). В теле: зависит по истории от Phase 2/3 (#23/#24) и рядом с Batch D (#25); не мержить без ревью. Не мержи сам.

7. Финальный отчёт: URL PR, список файлов, результат `npm test` / `npm run build`, блокеры.

Не трогай Phase 2/3 экраны. Не мержи. Не переименовывай старые упражнения. Не тащи коммиты из `feature/exercises-batch-d` — только свои 3 модуля поверх main.
