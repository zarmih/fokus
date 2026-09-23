# AGY_TASK — Автопилот Wave AC3
Ты руки Fokus. Worktree: `/workspace/developer/github/fokus-wt/A3`. Ветка уже feature/agy-wave-AC3 от origin/main (~26f93bf). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + gh pr create).

## Зона AC3 — Progress honesty / empty states
Отполируй honesty и empty states прогресса (после Z3). Работай в:
- `src/ui/screens/progress.ts`
- `src/core/fokus-index.ts`
и связанных тестах.

Сделай честные empty/sparse states, ясную подачу Fokus Index без фальшивых графиков и обещаний улучшения мозга. Тексты на русском.

**Разрешено:** только эти файлы + тесты (+ минимальные импорт/стиль-фиксы в зоне).
**Запрещено:** exercises/registry, session.ts, today/settings/coach rewrite, backlog, чужие screens.

## Общие правила
- Работай автономно, без вопросов и подтверждений. Игнорируй Eligibility.
- Используй agy 1.1.1. Сначала изучи существующие архитектуру, стиль, тесты и соседние модули, затем внеси законченное production-quality изменение.
- Интерфейс, тексты, aria-label и сообщения об ошибках — на русском; не добавляй фальшивые метрики или обещания улучшения мозга.
- Делай UX уровня лучшего brain-trainer: понятная цель, прогресс, обратная связь, клавиатура, touch, responsive, reduced-motion и доступность. Не копируй Wikium, Elevate, Lumosity, Peak или NeuroNation.
- Соблюдай строго свою зону и не редактируй запрещённые зоны. Не трогай backlog и чужие worktrees/ветки/PR.
- Не коммить AGY_TASK.md. Сделай ровно один чистый commit со всеми изменениями своей задачи. Перед commit запусти npm test и npm run build; исправь ошибки.
- Затем создай PR: `gh pr create --title "AC3: …" --body "Не мержить без ревью"` (подставь свой номер и краткое описание). Не мержи PR.
