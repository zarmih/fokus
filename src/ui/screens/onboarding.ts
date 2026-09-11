import { navigateTo } from '../router';
import { storage } from '../../core/storage';
import { GOAL_COPY } from '../../core/labels';

export function renderOnboarding(container: HTMLElement) {
  let step = 1;
  let selectedGoal = 'balance';
  let displayName = '';
  const totalSteps = 3;

  const render = () => {
    container.innerHTML = `
      <style>
        .onboard-custom-name { margin-top: 24px; }
        .onboard-custom-name label { display: block; font-size: 14px; margin-bottom: 8px; color: var(--muted); }
      </style>
      <div class="onboard">
        <div class="onboard-dots" aria-hidden="true">
          ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i + 1 <= step ? 'on' : ''}"></span>`).join('')}
        </div>
        ${step === 1 ? `
          <div class="onboard-mark">Fokus</div>
          <h1>Честный тренажёр фокуса</h1>
          <p class="onboard-lead">Никакой магии и обещаний повысить IQ. Только строгие когнитивные задачи для тренировки внимания и рабочей памяти.</p>
          <ul class="onboard-points">
            <li><strong>Только наука</strong> — проверенные методики (Строп, N-back, Корси) вместо аркадных игр.</li>
            <li><strong>Адаптивность</strong> — сложность растёт вместе с вашими успехами.</li>
            <li><strong>Короткий ритуал</strong> — 5 минут в день для поддержания ясности ума.</li>
          </ul>
        ` : ''}
        ${step === 2 ? `
          <h1>На чём сфокусируемся?</h1>
          <p class="onboard-lead">Выберите главную цель. Это определит приоритет в ежедневных тренировках. Настройки можно будет изменить позже.</p>
          <div class="goal-grid">
            ${GOAL_COPY.map((g) => `
              <button class="goal-card ${selectedGoal === g.id ? 'active' : ''}" data-goal="${g.id}" type="button">
                <div class="goal-title">${g.title}</div>
                <div class="goal-desc">${g.desc}</div>
              </button>
            `).join('')}
          </div>
          <div class="onboard-custom-name">
            <label for="onboard-name">Как к вам обращаться? (опционально)</label>
            <input id="onboard-name" class="onboard-input" maxlength="24" placeholder="Имя или ник" value="${displayName.replace(/"/g, '&quot;')}" />
          </div>
        ` : ''}
        ${step === 3 ? `
          <h1>Первый ритуал</h1>
          <p class="onboard-lead">Чтобы составить программу, нам нужно понять ваш текущий уровень.</p>
          <ol class="onboard-steps">
            <li><strong>Калибровка (~90 сек)</strong>. Три коротких теста для оценки ваших базовых навыков.</li>
            <li><strong>Без стресса</strong>. Ошибаться — нормально, это поможет подобрать идеальную сложность.</li>
            <li><strong>Fokus Index</strong>. После калибровки вы получите свой первый профиль по 5 областям.</li>
          </ol>
          <p class="onboard-note">Готовы? Постарайтесь не отвлекаться.</p>
        ` : ''}
        <div class="onboard-actions">
          ${step > 1 ? `<button id="btn-back" class="btn-secondary" type="button">Назад</button>` : ''}
          <button id="btn-next" class="btn-primary" type="button">${step === 3 ? 'Начать калибровку' : 'Продолжить'}</button>
        </div>
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', () => {
      if (step === 2) {
        const nameInput = container.querySelector('#onboard-name') as HTMLInputElement | null;
        if (nameInput) displayName = nameInput.value.trim();
      }
      step--;
      render();
    });

    container.querySelectorAll('.goal-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedGoal = (btn as HTMLElement).dataset.goal || 'balance';
        render();
      });
    });

    const nameInput = container.querySelector('#onboard-name') as HTMLInputElement | null;
    nameInput?.addEventListener('input', () => {
      displayName = nameInput.value.trim();
    });

    container.querySelector('#btn-next')?.addEventListener('click', () => {
      if (step === 2) {
        const nameInput = container.querySelector('#onboard-name') as HTMLInputElement | null;
        if (nameInput) displayName = nameInput.value.trim();
      }
      if (step < totalSteps) {
        step++;
        render();
        return;
      }
      const p = storage.getProfile();
      p.onboarded = true;
      p.sessionLengthSec = 5 * 60; // 5 минут по умолчанию
      p.primaryGoal = selectedGoal;
      if (displayName) {
        p.displayName = displayName;
        p.name = displayName;
      }
      storage.setProfile(p);

      if (!p.calibrated && storage.getHistory().length === 0) {
        navigateTo('session', {
          mode: 'calibration',
          items: [{ exerciseId: 'odd-one' }, { exerciseId: 'grid-memory' }, { exerciseId: 'stroop' }]
        });
      } else {
        navigateTo('today');
      }
    });
  };

  render();
}
