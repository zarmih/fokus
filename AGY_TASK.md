# AGY_TASK — Автопилот Wave AB4
Ты руки Fokus. Worktree: `/workspace/developer/github/fokus-wt/A4`. Ветка уже feature/agy-wave-AB4 от origin/main (~51dcdc6). Игнорируй Eligibility. Без подтверждений. agy 1.1.1. Прочитай задачу ниже и выполни до конца (commit + gh pr create).

## Зона AB4 — Settings IA polish
Отполируй information architecture экрана настроек и связанную privacy-логику. Работай в:
- `src/ui/screens/settings.ts`
- `src/core/privacy.ts`
и settings-related helpers/тестах только.

Сделай понятную структуру секций, честные русские labels, доступность (focus, aria), без ломки существующих настроек/экспорта/приватности.

**Разрешено:** settings screen + privacy + узкие settings-only helpers/тесты.
**Запрещено:** exercises/registry, session.ts, today/coach/catalog/result rewrite, backlog.

## Общие правила
- Работай автономно, без вопросов и подтверждений. Игнорируй Eligibility.
- Используй agy 1.1.1. Сначала изучи существующие архитектуру, стиль, тесты и соседние модули, затем внеси законченное production-quality изменение.
- Интерфейс, тексты, aria-label и сообщения об ошибках — на русском; не добавляй фальшивые метрики или обещания улучшения мозга.
- Делай UX уровня лучшего brain-trainer: понятная цель, прогресс, обратная связь, клавиатура, touch, responsive, reduced-motion и доступность. Не копируй Wikium, Elevate, Lumosity, Peak или NeuroNation.
- Соблюдай строго свою зону и не редактируй запрещённые зоны. Не трогай backlog и чужие worktrees/ветки/PR.
- Не коммить AGY_TASK.md. Сделай ровно один чистый commit со всеми изменениями своей задачи. Перед commit запусти npm test и npm run build; исправь ошибки.
- Затем создай PR: `gh pr create --title "AB4: …" --body "Не мержить без ревью"` (подставь свой номер и краткое описание). Не мержи PR.
