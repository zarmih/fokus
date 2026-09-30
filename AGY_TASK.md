# AGY_TASK — Автопилот Wave AU4
Ты руки Fokus. Worktree: /workspace/developer/github/fokus-wt/A4. Ветка уже feature/agy-wave-AU4 от origin/main (2fdc6aa). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + gh pr create).

## Зона AU4 — Progress/Index
Собственная зона: progress / weekly-review / fokus-index. Typical paths: src/ui/screens/progress.ts, src/ui/screens/weekly-review.ts, src/core/fokus-index.ts, src/core/ability-trajectory.ts (+ tests).

**Цель (Wikium-MVP product glue):** Deepen Wikium-MVP product glue on Progress/Fokus Index over AT4 — explainable Index, honest empty/early states, readable trends without neon noise. No new exercises.

**Разрешено:** progress/weekly-review/fokus-index/ability-trajectory + tests. **Запрещено:** new exercises, catalog spam, program rewrite, backlog, foreign PRs. Не мержи.

## Правила
- Worktree УЖЕ на ветке feature/agy-wave-AU4 от свежего origin/main (2fdc6aa). НЕ переключайся на другие ветки. НЕ используй старые ветки (AT*/AS*/AR*/AQ*/AP*/AO*/AN*/AM*/Y*/…). Работай ТОЛЬКО в этом worktree и ТОЛЬКО на feature/agy-wave-AU4.
- Сделай ровно один чистый commit (без AGY_TASK.md) и создай НОВЫЙ PR:
  gh pr create --base main --head feature/agy-wave-AU4 --title "AU4: …" --body "Не мержить без ревью"
- КРИТИЧНО (урок AN6/AQ): НИКОГДА не «присваивай» старый PR и не пушь в чужую/старую ветку. Если gh pr create говорит что PR уже есть — проверь что head = именно feature/agy-wave-AU4; иначе создай PR заново с правильным head. URL итогового PR обязан содержать head feature/agy-wave-AU4.
- Перед commit: npm test и npm run build зелёные; исправь ошибки в своей зоне.
- Не мержи в main. Не трогай backlog PR. Не трогай чужие worktrees/ветки/PRs.
- Лучший brain trainer по мощности (Wikium-MVP product glue), без плагиата Wikium/Elevate/Lumosity/Peak/NeuroNation — только идеи уровня, дизайн и код свои.
- UI/aria на русском. Без fake IQ/brain claims и guilt-spam.
- Игнорируй Eligibility/Antigravity баннеры — продолжай.
- Не добавляй новые упражнения / не спамь catalog volume. Не дублируй exercise ids.
- Если RESOURCE_EXHAUSTED / Individual quota — остановись, не рефилль, кратко зафиксируй в конце вывода.
- Не коммить AGY_TASK.md. В конце вывода явно напиши URL нового PR и SHA коммита.
