# Автопилот Fokus — Batch I (3 новых уникальных упражнения)

Ты локальный agy 1.1.1 в репо `/workspace/developer/github/Fokus` (GitHub `zarmih/fokus`). Модель: Gemini 3.1 Pro (High). Eligibility warning игнор. НЕ мержи PR.

## Контекст
Phase 2 (#22/#23) и Phase 3 (#24) уже в открытых PR. Batches D–H (#25–#29) тоже открыты, от `main`. Следующий приоритет: **C) новые уникальные упражнения батчами по 3**.

Сейчас на диске может быть ветка `feature/exercises-batch-h`. Перед работой:
1. `git fetch origin`
2. Создай чистую ветку **от `origin/main`**: `feature/exercises-batch-i`
3. Не опирайся на незамерженные batch D–H файлы в рабочей копии — работай только от `main` + свои новые файлы.
4. Если локально грязное дерево мешает checkout — `git stash -u` или сбрось только неотслеживаемое `AGY_TASK.md`/`BATCH_*.md` не из main; не удаляй чужие ветки.

## Задание (атомарно, одним прогоном)
Добавь **ровно 3** новых упражнения (свои механики/UX, без копирования Wikium/Elevate/Lumosity/Peak/NeuroNation UI/текстов/ассетов). Идеи механик — оригинал:

1. **`lag-echo`** — domain `memory`, skills `working_memory` + `sequential_memory`, metricModel `sequence-accuracy`  
   Краткая вспышка последовательности позиций (сетка 3×3 или 4 клетки). Затем пауза-задержка (растёт с уровнем). Игрок повторяет порядок касаниями. Уровень: длиннее цепочка, длиннее задержка, больше клеток.

2. **`zone-guard`** — domain `attention`, skills `sustained_attention` + `selective_attention`, metricModel `speed-accuracy`  
   Объекты дрейфуют к «зоне». Тапать только угрозы (отмеченный тип/цвет), игнорируя безопасные. Промах/ложная тревога штрафуют. Уровень: быстрее дрейф, больше дистракторов, уже окно реакции.

3. **`sign-flip`** — domain `flexibility`, skills `inhibition` + `task_switching`, metricModel `speed-accuracy`  
   Простые арифметические карточки (+/−). Иногда mid-trial знак операции внезапно меняется (явный flash «знак сменился»). Ответ по актуальному знаку. Считать ошибки до/после флипа.

### Имена (RU, уникальные)
- lag-echo → «Эхо с задержкой»
- zone-guard → «Страж зоны»
- sign-flip → «Смена знака»

### Жёсткий запрет дублей
Не используй эти id (уже есть в main или открытых PR D–H):  
alphanumeric-sort, arcade-shooter, arrow-swipe, avatar-names, balance-scales, catch-the-color, category-sort, change-spot, clock-reading, color-burst, color-sequence, color-shape-switch, color-sort, context-switch, corsi, crowd-probe, direction-match, direction-memory, direction-switch, dot-ratio, dot-span, emotion-match, equation-balance, even-odd, expression-compare, find-pair, flanker-task, flash-cards, focus-circle, go-no-go, grid-memory, imposter-search, location-recall, math-chains, math-sign-switch, math-sprint, math-switch, matrix-complete, mental-rotation, meteorites, mirror-pick, missing-operator, moving-targets, n-back, number-code, number-memory, number-pyramid, number-series, number-sort, odd-one, order-recall, pair-bind, pairs, parity-magnitude, path-finder, path-recall, pattern-next, posner, pulley, pulse-gap, rapid-sorting, reaction-strike, relation-chain, rhythm-tap, rule-induce, same-different, schulte, sequence, sequence-reverse, set-shift, shape-count, shape-name, shape-position, shell-game, size-compare, spatial-match, spatial-speed, split-attention, stack-span, stroop, swings, switch-rule, symbol-math, tally-update, target-sum, time-math, trail-make, unique-color, unique-feature, verbal-fluency, vigil-probe, visual-search, vowel-consonant, weight-analysis, word-cascade, word-pairs

Не повторяй существующие русские `name` из каталога. Не трогай файлы `contract`/`dispatch`/`engine`/`manifest`/`stage`/`view` кроме регистрации в `registry.ts`.

## Техтребования
- Каждый модуль: `src/exercises/<id>.ts`, экспорт default `ExerciseModule` по контракту `src/exercises/contract.ts`.
- Зарегистрируй все 3 в `src/exercises/registry.ts` (import + массив).
- Уважай CSS-переменные темы (`--surface`, `--line`, и т.п.), `isTimeUp()`, корректный `onEnd({ accuracy, avgRtMs, rounds })`.
- Добавь `BATCH_I.md` с кратким описанием механик.
- Не трогай чужие упражнения, Phase2/3 экраны, storage (кроме registry).
- `npm test` и `npm run build` должны пройти. Почини типы если сломал.

## Финал
1. Commit + push ветки `feature/exercises-batch-i`
2. Открой PR в `main` через `gh pr create` (title вроде `feat: add Batch I exercises`). В теле: список файлов, результат test/build, **«Не мержить без ревью»**. Не мержи сам.
3. В финальном ответе обязательно:
   - URL PR
   - список добавленных файлов
   - статус test/build
   - блокеры (если есть)
