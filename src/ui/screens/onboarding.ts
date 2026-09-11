import { navigateTo } from '../router';
import { storage } from '../../core/storage';
import { GOAL_COPY } from '../../core/labels';

export function renderOnboarding(container: HTMLElement) {
  let step = 1;
  let selectedMin = 5;
  let selectedGoal = 'balance';
  let displayName = '';
  const totalSteps = 5;

  const render = () => {
    container.innerHTML = `
      <div class="onboard">
        <div class="sr-only" aria-live="polite">Шаг ${step} из ${totalSteps}</div>
        <div class="onboard-dots" aria-hidden="true">
          ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i + 1 <= step ? 'on' : ''}"></span>`).join('')}
        </div>
        ${step === 1 ? `
          <div class="onboard-mark">Fokus</div>
          <h1>Пять минут для внимания и памяти</h1>
          <p class="onboard-lead">Короткий ритуал, адаптивная сложность и честный прогресс — без обещаний «прокачать IQ».</p>
          <ul class="onboard-points">
            <li><strong>Научные задачи</strong> — Строп, n-back, Корси, Познер, а не только аркады.</li>
            <li><strong>Сложность под вас</strong> — растёт, когда получается, и мягко сдаёт, когда нет.</li>
            <li><strong>Честная аналитика</strong> — Fokus Index, профиль по 5 областям, без фейковых процентилей.</li>
          </ul>
        ` : ''}
        ${step === 2 ? `
          <h1>Что хотите прокачать?</h1>
          <p class="onboard-lead">Это задаёт фокус ежедневной сессии. Можно сменить в настройках.</p>
          <div class="goal-grid">
            ${GOAL_COPY.map((g) => `
              <button class="goal-card ${selectedGoal === g.id ? 'active' : ''}" data-goal="${g.id}" type="button" aria-pressed="${selectedGoal === g.id ? 'true' : 'false'}">
                <div class="goal-title">${g.title}</div>
                <div class="goal-desc">${g.desc}</div>
              </button>
            `).join('')}
          </div>
        ` : ''}
        ${step === 3 ? `
          <h1>Сколько времени в день?</h1>
          <p class="onboard-lead">Лучше короткий ритуал каждый день, чем длинная сессия раз в неделю.</p>
          <div class="time-stack">
            <button class="btn-time ${selectedMin === 5 ? 'btn-primary' : 'btn-secondary'}" data-m="5" type="button">5 минут · ежедневный минимум</button>
            <button class="btn-time ${selectedMin === 8 ? 'btn-primary' : 'btn-secondary'}" data-m="8" type="button">8 минут · полный цикл</button>
            <button class="btn-time ${selectedMin === 12 ? 'btn-primary' : 'btn-secondary'}" data-m="12" type="button">12 минут · глубокая сессия</button>
          </div>
        ` : ''}
        ${step === 4 ? `
          <h1>Как к вам обращаться?</h1>
          <p class="onboard-lead">Необязательно. Имя остаётся только на этом устройстве.</p>
          <label class="sr-only" for="onboard-name">Имя или ник</label>
          <input id="onboard-name" class="onboard-input" maxlength="24" placeholder="Имя или ник" autocomplete="nickname" value="${displayName.replace(/"/g, '&quot;')}" />
        ` : ''}
        ${step === 5 ? `
          <h1>Как это работает</h1>
          <ol class="onboard-steps">
            <li><strong>Калибровка ~90 сек.</strong> Три коротких блока зададут стартовый уровень.</li>
            <li><strong>Ежедневная сессия.</strong> Fokus сам соберёт упражнения под цель и слабые области.</li>
            <li><strong>Fokus Index.</strong> Один показатель по пяти доменам — внимание, память, скорость, гибкость, логика.</li>
          </ol>
          <p class="onboard-note">Fokus тренирует эти задачи. Перенос на повседневную жизнь скромный. Не медицинское изделие.</p>
        ` : ''}
        <div class="onboard-actions">
          ${step > 1 ? `<button id="btn-back" class="btn-secondary" type="button">Назад</button>` : ''}
          <button id="btn-next" class="btn-primary" type="button">${step === 5 ? 'Начать калибровку' : 'Продолжить'}</button>
        </div>
      </div>
    `;

    container.querySelector('#btn-back')?.addEventListener('click', () => {
      step--;
      render();
    });

    container.querySelectorAll('.goal-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedGoal = (btn as HTMLElement).dataset.goal || 'balance';
        render();
      });
    });

    container.querySelectorAll('.btn-time').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        selectedMin = parseInt((e.currentTarget as HTMLElement).dataset.m || '5', 10);
        render();
      });
    });

    const nameInput = container.querySelector('#onboard-name') as HTMLInputElement | null;
    nameInput?.addEventListener('input', () => {
      displayName = nameInput.value.trim();
    });

    const heading = container.querySelector('h1') as HTMLElement | null;
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }

    container.querySelector('#btn-next')?.addEventListener('click', () => {
      if (nameInput) displayName = nameInput.value.trim();
      if (step < 5) {
        step++;
        render();
        return;
      }
      const p = storage.getProfile();
      p.onboarded = true;
      p.sessionLengthSec = selectedMin * 60;
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
