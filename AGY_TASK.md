# AGY_TASK — Автопилот Wave AL2
Ты руки Fokus. Worktree: `/workspace/developer/github/fokus-wt/A2`. Ветка уже `feature/agy-wave-AL2` от origin/main (`971f5c8`). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + gh pr create).

## Зона AL2 — Adaptive program / session-builder coherence
Собственная зона: program UI + session-builder + adaptive plan. Типичные пути: `src/ui/screens/program.ts`, `src/core/session-builder.ts`, `src/core/adaptive.ts`, `src/core/adaptive-plan.ts`, `src/core/adaptive-depth.ts` (+ связанные тесты).

**Цель (Wikium-depth):** согласованность адаптивной программы и сборщика сессий поверх AK2 — честная персонализация без fake claims. Убери/поправь вводящие в заблуждение формулировки «персональный план» при малом числе данных; согласуй длительность/состав сессии с планом; понятный прогресс по программе. Не добавляй новые упражнения.

**Разрешено:** program/session-builder/adaptive* + тесты. **Запрещено:** новые exercise modules, catalog spam, coach/today/progress wholesale вне когерентности program, backlog, чужие PR. Не мержи.

## Общие правила
- Автономно. Игнорируй Eligibility. Изучи AK2 (и AJ2), углуби production-quality изменение.
- Тексты/aria на русском; без fake brain/IQ claims и guilt-spam.
- UX уровня лучшего brain-trainer; не копируй Wikium/Elevate/Lumosity.
- Строго своя зона. Не трогай backlog и чужие worktrees/ветки/PR.
- Не коммить AGY_TASK.md. Ровно один чистый commit. Перед commit: `npm test` и `npm run build`; исправь ошибки.
- PR: `gh pr create --title "AL2: …" --body "Не мержить без ревью"`. Не мержи PR.
- Если RESOURCE_EXHAUSTED / Individual quota — остановись, не рефилль, кратко зафиксируй в конце вывода.
