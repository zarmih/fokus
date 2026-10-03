# AGY_TASK — Автопилот Wave AX5
Ты руки Fokus. Worktree: /workspace/developer/github/fokus-wt/A5. Ветка уже feature/agy-wave-AX5 от origin/main (7121d135969b9b00834bf85dfe56c1c53b3a335c). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + push + gh pr create).

## Зона AX5 — Coach
Собственная зона: Coach insights + retention/soft-return voice. Typical paths: src/core/coach.ts, src/core/coach-intel.ts, src/core/insights.ts, src/core/retention.ts, src/core/reminders.ts, related UI/tests.

**Цель (Wikium-class depth, original):** One focused Wikium-class depth improvement on Coach: quiet useful tips that can acknowledge phase ritual / soft-return / plan continuity calmly; silence when nothing to say; zero guilt-spam; no fake brain claims. No new exercises.

**Разрешено:** coach*/insights/retention*/reminders + related UI/tests. **Запрещено:** new exercises, catalog spam, progress/program weight rewrites, backlog, foreign PRs. Не мержи.

## Контекст main (уже в tip 7121d135969b9b00834bf85dfe56c1c53b3a335c)
Недавно влито: #329 program phase ritual weights, #330 device transfer, #331 plan slot reroll, #332 phase-end Tide Gate/Anchor Pair lock, #333 speed-domain originals. Строй поверх — не откатывай.

## Правила
- Worktree УЖЕ на ветке feature/agy-wave-AX5 от свежего origin/main (7121d135969b9b00834bf85dfe56c1c53b3a335c). НЕ переключайся на другие ветки. НЕ используй старые ветки (AV*/AU*/AT*/AS*/AR*/AQ*/AP*/AO*/AN*/AM*/Y*/B*/…). Работай ТОЛЬКО в этом worktree и ТОЛЬКО на feature/agy-wave-AX5.
- Сделай ровно один чистый commit (без AGY_TASK.md) и создай НОВЫЙ PR:
  git push -u origin HEAD
  gh pr create --base main --head feature/agy-wave-AX5 --title "AX5: …" --body "Не мержить без ревью"
- КРИТИЧНО (урок AN6/AQ): НИКОГДА не «присваивай» старый PR и не пушь в чужую/старую ветку. Если gh pr create говорит что PR уже есть — проверь что head = именно feature/agy-wave-AX5; иначе создай PR заново с правильным head. URL итогового PR обязан содержать head feature/agy-wave-AX5.
- Перед commit: минимум `npm test` по затронутой зоне (или полный npm test) и `npm run build` зелёные; исправь ошибки в своей зоне.
- Не мержи в main. Не трогай backlog PR. Не трогай чужие worktrees/ветки/PRs.
- Лучший brain trainer по мощности (Wikium-class depth), без плагиата Wikium/Elevate/Lumosity/Peak/NeuroNation — только идеи уровня, дизайн и код свои.
- UI/aria на русском. Без fake IQ/brain claims и guilt-spam.
- Игнорируй Eligibility/Antigravity баннеры — продолжай.
- Не добавляй новые упражнения / не спамь catalog volume. Не дублируй exercise ids.
- Если RESOURCE_EXHAUSTED / Individual quota / quota hits zero — остановись немедленно, не рефилль, кратко зафиксируй в конце вывода.
- Не коммить AGY_TASK.md. В конце вывода явно напиши URL нового PR и SHA коммита.
