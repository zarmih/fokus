# Batch AA: A11Y + PWA Polish

## Сделано:
- **A11Y (Доступность):** 
  - Добавлен `skip-link` для быстрого перехода к основному контенту (main-content).
  - Настроены стили `:focus-visible` для лучшей навигации с клавиатуры.
  - Добавлены `aria-label`, `role` и `tabindex` на ключевые экраны:
    - **Today:** карточки тренировок, радар Fokus Index, квесты и модальное окно.
    - **Catalog (trainers):** карточки тренажеров (role=button, aria-label), кнопки фильтров (aria-pressed).
    - **Session:** aria-label для таймера и заголовка инструкции.
    - **Result:** блоки результатов и радар Fokus Index.
- **PWA:**
  - Проверено и подтверждено наличие `theme-color` в `index.html` и `manifest.webmanifest`.

## Тестирование и Сборка:
- Успешно выполнен прогон тестов (`npm test`).
- Успешно выполнена сборка проекта (`npm run build`).
