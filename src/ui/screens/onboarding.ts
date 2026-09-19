import { navigateTo } from '../router';
import { storage } from '../../core/storage';
import { GOAL_COPY } from '../../core/labels';
import { calibrationSessionItems } from '../../core/calibration';
import { buildFirstWeekPlan, firstWeekPreviewLines } from '../../core/onboarding';
import { registry } from '../../exercises/registry';

function catalog() {
  return registry.map((r) => ({
    id: r.manifest.id,
    domain: r.manifest.domain,
    skills: [...r.manifest.skills]
  }));
}

export function renderOnboarding(container: HTMLElement) {
  let step = 1;
  let selectedMin = 5;
  let selectedGoal = 'balance';
  let displayName = '';
  const totalSteps = 5;

  const render = () => {
    const weekPreview = buildFirstWeekPlan({
      primaryGoal: selectedGoal,
      sessionLengthSec: selectedMin * 60,
      startDate: new Date().toISOString()
    });

    const isNextDisabled = step === 4 && displayName.trim().length === 0;

    container.innerHTML = `
      <div class="onboard">
        <div class="sr-only" aria-live="polite">Шаг ${step} из ${totalSteps}</div>
        <div class="onboard-dots" role="progressbar" aria-valuemin="1" aria-valuemax="${totalSteps}" aria-valuenow="${step}" aria-label="Шаг ${step} из ${totalSteps}">
          ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i + 1 <= step ? 'on' : ''}"></span>`).join('')}
        </div>
        ${step === 1 ? `
          <div class="onboard-mark">Fokus</div>
          <h1>Пять минут для ясного ума</h1>
          <p class="onboard-lead">Короткий ритуал, адаптивная сложность и честный прогресс — без пустых обещаний.</p>
          <ul class="onboard-points">
            <li><strong>Научный фундамент</strong> — проверенные когнитивные задачи вместо казуальных аркад.</li>
            <li><strong>Сложность под вас</strong> — алгоритм подстраивается под ваши успехи в реальном времени.</li>
            <li><strong>Честная аналитика</strong> — точный профиль по 5 когнитивным областям без иллюзий «прокачки IQ».</li>
          </ul>
        ` : ''}
        ${step === 2 ? `
          <h1>Главная цель</h1>
          <p class="onboard-lead">Выберите фокус ежедневной сессии. Вы сможете изменить цель позже.</p>
          <div class="goal-grid" role="group" aria-label="Главная цель">
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
          <p class="onboard-lead">Для устойчивого эффекта лучше заниматься понемногу, но каждый день.</p>
          <div class="time-stack" role="group" aria-label="Длительность сессии">
            <button class="btn-time ${selectedMin === 5 ? 'btn-primary' : 'btn-secondary'}" data-m="5" type="button" aria-pressed="${selectedMin === 5}">5 минут · ежедневный минимум</button>
            <button class="btn-time ${selectedMin === 8 ? 'btn-primary' : 'btn-secondary'}" data-m="8" type="button" aria-pressed="${selectedMin === 8}">8 минут · сбалансированный темп</button>
            <button class="btn-time ${selectedMin === 12 ? 'btn-primary' : 'btn-secondary'}" data-m="12" type="button" aria-pressed="${selectedMin === 12}">12 минут · глубокое погружение</button>
          </div>
        ` : ''}
        ${step === 4 ? `
          <h1>Как к вам обращаться?</h1>
          <p class="onboard-lead">Имя сохраняется только на вашем устройстве.</p>
          <label class="sr-only" for="onboard-name">Имя или ник</label>
          <input id="onboard-name" class="onboard-input" maxlength="24" placeholder="Введите имя..." autocomplete="nickname" value="${displayName.replace(/"/g, '&quot;')}" />
        ` : ''}
        ${step === 5 ? `
          <h1>Как это работает</h1>
          <ol class="onboard-steps">
            <li><strong>Калибровка (60–90 сек).</strong> Узнаем ваш стартовый уровень в памяти, внимании, логике, скорости и гибкости.</li>
            <li><strong>Первая неделя.</strong> Мягкий старт. Постепенный разгон до ${selectedMin} минут в день. Один пропуск прощается.</li>
            <li><strong>Честный подход.</strong> Мы тренируем конкретные навыки. Никакой магии, это не медицинское изделие.</li>
          </ol>
          <div class="onboard-week" aria-label="План первой недели">
            ${weekPreview.days.map((d) => `<span class="week-pill ${d.day === 1 ? 'on' : ''}">${d.day}</span>`).join('')}
          </div>
          <p class="onboard-week-caption">${firstWeekPreviewLines(weekPreview)[0]} → ${firstWeekPreviewLines(weekPreview)[6]}</p>
        ` : ''}
        <div class="onboard-actions" style="display: flex; gap: 8px;">
          ${step > 1 ? `<button id="btn-back" class="btn-secondary" type="button" aria-label="Назад" style="flex: 0 0 auto; padding: 16px 20px;">←</button>` : ''}
          ${step === 4 ? `<button id="btn-skip" class="btn-secondary" type="button" style="flex: 1;">Пропустить</button>` : ''}
          <button id="btn-next" class="btn-primary" type="button" style="flex: 2;" ${isNextDisabled ? 'disabled' : ''}>${step === 5 ? 'Начать калибровку' : 'Продолжить'}</button>
        </div>
      </div>
    `;

    const heading = container.querySelector('h1') as HTMLElement | null;
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }

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
      const nextBtn = container.querySelector('#btn-next') as HTMLButtonElement | null;
      if (nextBtn) {
        nextBtn.disabled = displayName.length === 0;
      }
    });

    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && displayName.trim().length > 0) {
        step++;
        render();
      }
    });

    container.querySelector('#btn-skip')?.addEventListener('click', () => {
      displayName = '';
      step++;
      render();
    });

    container.querySelector('#btn-next')?.addEventListener('click', () => {
      if (nameInput) displayName = nameInput.value.trim();
      if (step < 5) {
        step++;
        render();
        return;
      }
      const p = storage.getProfile();
      p.onboarded = true;
      p.onboardingCompletedAt = new Date().toISOString();
      p.sessionLengthSec = selectedMin * 60;
      p.primaryGoal = selectedGoal;
      p.firstWeekPlan = buildFirstWeekPlan({
        primaryGoal: selectedGoal,
        sessionLengthSec: selectedMin * 60,
        startDate: new Date().toISOString()
      });
      if (displayName) {
        p.displayName = displayName;
        p.name = displayName;
      }
      storage.setProfile(p);

      if (!p.calibrated && storage.getHistory().length === 0) {
        navigateTo('session', {
          mode: 'calibration',
          items: calibrationSessionItems({ primaryGoal: selectedGoal, catalog: catalog() })
        });
      } else {
        navigateTo('today');
      }
    });
  };

  render();
}
