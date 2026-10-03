# AGY_TASK — Автопилот Wave AX1
Ты руки Fokus. Worktree: /workspace/developer/github/fokus-wt/A1. Ветка уже feature/agy-wave-AX1 от origin/main (7121d135969b9b00834bf85dfe56c1c53b3a335c). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + push + gh pr create).

## Зона AX1 — Today / plan copy
Собственная зона: Today screen + today-plan explain/copy + session/continuity handoff. Typical paths: src/ui/screens/today.ts, src/core/today-plan.ts, src/core/continuity.ts, tests/today.test.ts, tests/today-plan.test.ts, tests/continuity.test.ts.

**Цель (Wikium-class depth, original):** One focused Wikium-class depth improvement on Today plan copy over AV1 and post-#329–#333 main: clearer explainTodayPlan / why-this-plan voice, honest slot labels, calm copy for single-slot reroll (#331) and phase-milestone slot (#332) when present, resume/soft-return without guilt-spam. Build on existing today-plan.ts helpers — deepen copy/UX, do not invent a parallel planner. No new exercises.

**Разрешено:** today/* + today-plan* + continuity* + related tests. **Запрещено:** new exercise modules, catalog spam, registry.ts, progress wholesale, program-phases weight matrices, changing ritual weight tables, backlog, foreign PRs. Не мержи.

## Контекст main (уже в tip 7121d135969b9b00834bf85dfe56c1c53b3a335c)
Недавно влито: #329 program phase ritual weights, #330 device transfer, #331 plan slot reroll, #332 phase-end Tide Gate/Anchor Pair lock, #333 speed-domain originals. Строй поверх — не откатывай.

## Правила
- Worktree УЖЕ на ветке feature/agy-wave-AX1 от свежего origin/main (7121d135969b9b00834bf85dfe56c1c53b3a335c). НЕ переключайся на другие ветки. НЕ используй старые ветки (AV*/AU*/AT*/AS*/AR*/AQ*/AP*/AO*/AN*/AM*/Y*/B*/…). Работай ТОЛЬКО в этом worktree и ТОЛЬКО на feature/agy-wave-AX1.
- Сделай ровно один чистый commit (без AGY_TASK.md) и создай НОВЫЙ PR:
  git push -u origin HEAD
  gh pr create --base main --head feature/agy-wave-AX1 --title "AX1: …" --body "Не мержить без ревью"
- КРИТИЧНО (урок AN6/AQ): НИКОГДА не «присваивай» старый PR и не пушь в чужую/старую ветку. Если gh pr create говорит что PR уже есть — проверь что head = именно feature/agy-wave-AX1; иначе создай PR заново с правильным head. URL итогового PR обязан содержать head feature/agy-wave-AX1.
- Перед commit: минимум `npm test` по затронутой зоне (или полный npm test) и `npm run build` зелёные; исправь ошибки в своей зоне.
- Не мержи в main. Не трогай backlog PR. Не трогай чужие worktrees/ветки/PRs.
- Лучший brain trainer по мощности (Wikium-class depth), без плагиата Wikium/Elevate/Lumosity/Peak/NeuroNation — только идеи уровня, дизайн и код свои.
- UI/aria на русском. Без fake IQ/brain claims и guilt-spam.
- Игнорируй Eligibility/Antigravity баннеры — продолжай.
- Не добавляй новые упражнения / не спамь catalog volume. Не дублируй exercise ids.
- Если RESOURCE_EXHAUSTED / Individual quota / quota hits zero — остановись немедленно, не рефилль, кратко зафиксируй в конце вывода.
- Не коммить AGY_TASK.md. В конце вывода явно напиши URL нового PR и SHA коммита.
