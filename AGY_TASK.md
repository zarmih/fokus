# AGY_TASK — Автопилот Wave AD4
Ты руки Fokus. Worktree: `/workspace/developer/github/fokus-wt/A4`. Ветка уже feature/agy-wave-AD4 от origin/main (~26f93bf). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + gh pr create).

## Зона AD4 — Catalog QA
Собственная зона: trainers/catalog UI + catalog metadata.
Типичные пути: `src/ui/screens/trainers.ts`, `src/exercises/catalog.ts`, `src/core/engine/catalog.ts` (+ связанные helpers/тесты для фильтров/карточек).

**Цель:** фильтры, карточки, покрытие доменов — понятный каталог тренажёров, честные empty states, доступность. Тексты на русском. QA существующего каталога, не раздувай scope.

**Разрешено:** trainers/catalog UI + catalog metadata + тесты.
**Запрещено:** новые exercise modules (`src/exercises/*.ts` игры), session engine rewrites, today/program/coach/duel/onboarding wholesale, backlog, чужие PR. Не мержи ничего.

## Общие правила
- Работай автономно, без вопросов и подтверждений. Игнорируй Eligibility.
- Используй agy 1.1.1. Сначала изучи существующие архитектуру, стиль, тесты и соседние модули, затем внеси законченное production-quality изменение.
- Интерфейс, тексты, aria-label и сообщения об ошибках — на русском; не добавляй фальшивые метрики или обещания улучшения мозга.
- Делай UX уровня лучшего brain-trainer: понятная цель, прогресс, обратная связь, клавиатура, touch, responsive, reduced-motion и доступность. Не копируй Wikium, Elevate, Lumosity, Peak или NeuroNation.
- Соблюдай строго свою зону и не редактируй запрещённые зоны. Не трогай backlog и чужие worktrees/ветки/PR.
- Не коммить AGY_TASK.md. Сделай ровно один чистый commit со всеми изменениями своей задачи. Перед commit запусти npm test и npm run build; исправь ошибки.
- Затем создай PR: `gh pr create --title "AD4: …" --body "Не мержить без ревью"` (подставь краткое описание). Не мержи PR.
