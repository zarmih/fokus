# AGY_TASK — Автопилот Wave AS1
Ты руки Fokus. Worktree: /workspace/developer/github/fokus-wt/A1. Ветка уже feature/agy-wave-AS1 от origin/main (576b1d7). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + gh pr create).

## Зона AS1 — Today/session
Собственная зона: Today screen + session flow / continuity. Typical paths: src/ui/screens/today.ts, src/core/continuity.ts, tests/today.test.ts, tests/continuity.test.ts.

**Цель (Wikium-MVP product glue):** Deepen Wikium-MVP product glue on Today hub over AR1 — ritual CTA clarity, session start/resume/soft-return coherence, zero guilt-spam. No new exercises.

**Разрешено:** today/* + continuity* + related tests. **Запрещено:** new exercise modules, catalog spam, registry.ts, progress wholesale, program rewrite, backlog, foreign PRs. Не мержи.

## Правила
- Worktree УЖЕ на ветке feature/agy-wave-AS1 от свежего origin/main (576b1d7). НЕ переключайся на другие ветки. НЕ используй старые ветки (AR*/AQ*/AP*/AO*/AN*/AM*/Y*/…). Работай ТОЛЬКО в этом worktree и ТОЛЬКО на feature/agy-wave-AS1.
- Сделай ровно один чистый commit (без AGY_TASK.md) и создай НОВЫЙ PR:
  gh pr create --base main --head feature/agy-wave-AS1 --title "AS1: …" --body "Не мержить без ревью"
- КРИТИЧНО (урок AN6/AQ): НИКОГДА не «присваивай» старый PR и не пушь в чужую/старую ветку. Если gh pr create говорит что PR уже есть — проверь что head = именно feature/agy-wave-AS1; иначе создай PR заново с правильным head. URL итогового PR обязан содержать head feature/agy-wave-AS1.
- Перед commit: npm test и npm run build зелёные; исправь ошибки в своей зоне.
- Не мержи в main. Не трогай backlog PR. Не трогай чужие worktrees/ветки/PRs.
- Лучший brain trainer по мощности (Wikium-MVP product glue), без плагиата Wikium/Elevate/Lumosity/Peak/NeuroNation — только идеи уровня, дизайн и код свои.
- UI/aria на русском. Без fake IQ/brain claims и guilt-spam.
- Игнорируй Eligibility/Antigravity баннеры — продолжай.
- Не добавляй новые упражнения / не спамь catalog volume. Не дублируй exercise ids.
- Если RESOURCE_EXHAUSTED / Individual quota — остановись, не рефилль, кратко зафиксируй в конце вывода.
- Не коммить AGY_TASK.md. В конце вывода явно напиши URL нового PR и SHA коммита.
