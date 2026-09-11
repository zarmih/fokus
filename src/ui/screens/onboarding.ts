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
  const totalSteps = 3;

  const render = () => {
    const weekPreview = buildFirstWeekPlan({
      primaryGoal: selectedGoal,
      sessionLengthSec: selectedMin * 60,
      startDate: new Date().toISOString()
    });

    container.innerHTML = `
      <div class="onboard">
        <div class="sr-only" aria-live="polite">Шаг ${step} из ${totalSteps}</div>
        <div class="onboard-dots" role="progressbar" aria-valuemin="1" aria-valuemax="${totalSteps}" aria-valuenow="${step}" aria-label="Шаг ${step} из ${totalSteps}">
          ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i + 1 <= step ? 'on' : ''}"></span>`).join('')}
        </div>
        ${step === 1 ? `
          <div class="onboard-mark">Fokus</div>
          <h1>Что для вас важнее?</h1>
          <p class="onboard-lead">Без обещаний прокачать IQ — только честный прогресс и адаптивная сложность.</p>
          <div class="goal-grid" role="group" aria-label="Главная цель">
            ${GOAL_COPY.map((g) => `
              <button class="goal-card ${selectedGoal === g.id ? 'active' : ''}" data-goal="${g.id}" type="button" aria-pressed="${selectedGoal === g.id ? 'true' : 'false'}">
                <div class="goal-title">${g.title}</div>
                <div class="goal-desc">${g.desc}</div>
              </button>
            `).join('')}
          </div>
        ` : ''}
        ${step === 2 ? `
          <h1>Сколько времени в день?</h1>
          <p class="onboard-lead">Регулярность важнее длительности. Выберите комфортный темп.</p>
          <div class="time-stack" role="group" aria-label="Длительность сессии">
            <button class="btn-time ${selectedMin === 5 ? 'btn-primary' : 'btn-secondary'}" data-m="5" type="button" aria-pressed="${selectedMin === 5}">5 минут · ежедневный минимум</button>
            <button class="btn-time ${selectedMin === 8 ? 'btn-primary' : 'btn-secondary'}" data-m="8" type="button" aria-pressed="${selectedMin === 8}">8 минут · полный цикл</button>
            <button class="btn-time ${selectedMin === 12 ? 'btn-primary' : 'btn-secondary'}" data-m="12" type="button" aria-pressed="${selectedMin === 12}">12 минут · глубокая сессия</button>
          </div>
        ` : ''}
        ${step === 3 ? `
          <h1>Ваша первая неделя</h1>
          <p class="onboard-lead">Мягкий старт без перегруза. Сегодня — первый ритуал для знакомства с задачами.</p>
          <div class="onboard-week" aria-label="План первой недели">
            ${weekPreview.days.map((d) => `<span class="week-pill ${d.day === 1 ? 'on' : ''}">${d.day}</span>`).join('')}
          </div>
          <p class="onboard-week-caption">${firstWeekPreviewLines(weekPreview)[0]} → ${firstWeekPreviewLines(weekPreview)[6]}</p>
          <ul class="onboard-points" style="margin-top: 24px;">
            <li><strong>Сегодня: Первый ритуал.</strong> Несколько коротких задач, чтобы настроить начальную сложность под вас.</li>
            <li><strong>Дальше:</strong> Постепенный разгон до ${selectedMin} минут. Один пропуск прощается.</li>
            <li><strong>Честно:</strong> Тренируем конкретные навыки. Перенос на жизнь скромный. Не медицина.</li>
          </ul>
        ` : ''}
        <div class="onboard-actions">
          ${step > 1 ? `<button id="btn-back" class="btn-secondary" type="button">Назад</button>` : ''}
          <button id="btn-next" class="btn-primary" type="button">${step === 3 ? 'Начать первый ритуал' : 'Продолжить'}</button>
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

    container.querySelector('#btn-next')?.addEventListener('click', () => {
      if (step < 3) {
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
