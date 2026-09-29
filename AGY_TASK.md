# AGY_TASK — Автопилот Wave AP2
Ты руки Fokus. Worktree: /workspace/developer/github/fokus-wt/A2. Ветка уже feature/agy-wave-AP2 от origin/main (10e7c1e). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + gh pr create).

## Зона AP2 — Program/adaptive
Собственная зона: program UI + session-builder + adaptive plan. Typical paths: src/ui/screens/program.ts, src/core/session-builder.ts, src/core/adaptive.ts, src/core/adaptive-plan.ts, src/core/adaptive-depth.ts (+ related tests).

**Цель (Wikium-MVP product glue):** Program / adaptive week path polish over AO2 — clear weekly structure, honest personalization without fake claims on sparse data, session-builder↔plan coherence. Deepen Wikium-MVP product glue. No new exercises.

**Разрешено:** program/session-builder/adaptive* + tests. **Запрещено:** new exercise modules, catalog spam, today/progress wholesale outside program coherence, backlog, foreign PRs. Не мержи.

## Правила
- Worktree УЖЕ на ветке feature/agy-wave-AP2 от свежего origin/main (10e7c1e). НЕ переключайся на другие ветки. НЕ используй старые ветки (AO*/AN*/AM*/Y*/…).
- Сделай ровно один чистый commit (без AGY_TASK.md) и создай НОВЫЙ PR:
  gh pr create --base main --head feature/agy-wave-AP2 --title "AP2: …" --body "Не мержить без ревью"
- КРИТИЧНО (урок AN6): НИКОГДА не «присваивай» старый PR и не пушь в чужую/старую ветку. Если gh pr create говорит что PR уже есть — проверь что head = именно feature/agy-wave-AP2; иначе создай PR заново с правильным head. URL итогового PR обязан содержать head feature/agy-wave-AP2.
- Перед commit: npm test и npm run build зелёные; исправь ошибки в своей зоне.
- Не мержи в main. Не трогай backlog PR. Не трогай чужие worktrees/ветки/PRs.
- Лучший brain trainer по мощности (Wikium-MVP product glue), без плагиата Wikium/Elevate/Lumosity/Peak/NeuroNation — только идеи уровня, дизайн и код свои.
- UI/aria на русском. Без fake IQ/brain claims и guilt-spam.
- Игнорируй Eligibility/Antigravity баннеры — продолжай.
- Не добавляй новые упражнения / не спамь catalog volume. Не дублируй exercise ids.
- Если RESOURCE_EXHAUSTED / Individual quota — остановись, не рефилль, кратко зафиксируй в конце вывода.
- Не коммить AGY_TASK.md. В конце вывода явно напиши URL нового PR и SHA коммита.
