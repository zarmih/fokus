import { navigateTo } from '../router';
import { storage } from '../../core/storage';
import { GOAL_COPY } from '../../core/labels';
import { calibrationSessionItems } from '../../core/calibration';
import { buildFirstWeekPlan, firstWeekPreviewLines } from '../../core/onboarding';
import { registry } from '../../exercises/registry';
import { scheduleLocalReminder } from '../../core/reminders';
import { bindPressPhysics, enterStage } from '../../core/motion';

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
  let selectedReminderHour: number | null = null;
  const totalSteps = 3;

  const render = () => {
    const weekPreview = buildFirstWeekPlan({
      primaryGoal: selectedGoal,
      sessionLengthSec: selectedMin * 60,
      startDate: new Date().toISOString()
    });

    const isNextDisabled = step === 3 && displayName.trim().length === 0;

    container.innerHTML = `
      <div class="onboard">
        <div class="sr-only" aria-live="polite">Шаг ${step} из ${totalSteps}</div>
        <div class="onboard-dots" role="progressbar" aria-valuemin="1" aria-valuemax="${totalSteps}" aria-valuenow="${step}" aria-label="Шаг ${step} из ${totalSteps}">
          ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i + 1 <= step ? 'on' : ''}"></span>`).join('')}
        </div>
        ${step === 1 ? `
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
        ${step === 2 ? `
          <h1>Сколько времени в день?</h1>
          <p class="onboard-lead">Для устойчивого эффекта лучше заниматься понемногу, но каждый день.</p>
          <div class="time-stack" role="group" aria-label="Длительность сессии">
            <button class="btn-time ${selectedMin === 5 ? 'btn-primary' : 'btn-secondary'}" data-m="5" type="button" aria-pressed="${selectedMin === 5}">5 минут · ежедневный минимум</button>
            <button class="btn-time ${selectedMin === 8 ? 'btn-primary' : 'btn-secondary'}" data-m="8" type="button" aria-pressed="${selectedMin === 8}">8 минут · сбалансированный темп</button>
            <button class="btn-time ${selectedMin === 12 ? 'btn-primary' : 'btn-secondary'}" data-m="12" type="button" aria-pressed="${selectedMin === 12}">12 минут · глубокое погружение</button>
          </div>
        ` : ''}
        ${step === 3 ? `
          <h1>Как к вам обращаться?</h1>
          <p class="onboard-lead">Имя сохраняется только на вашем устройстве.</p>
          <label class="sr-only" for="onboard-name">Имя или ник</label>
          <input id="onboard-name" class="onboard-input" maxlength="24" placeholder="Введите имя..." autocomplete="nickname" value="${displayName.replace(/"/g, '&quot;')}" />
          
          <h2 style="margin-top: 32px; font-size: 1.25rem;">Напоминания</h2>
          <p class="onboard-lead" style="margin-bottom: 12px;">Fokus работает лучше, если станет ежедневной привычкой. Включить тихие напоминания?</p>
          <div class="time-stack" role="radiogroup" aria-label="Время напоминания">
            <label class="btn-time ${selectedReminderHour === 9 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>В 09:00 (Утро)</span>
              <input type="radio" name="onboard-reminder" value="9" class="sr-only" tabindex="-1" ${selectedReminderHour === 9 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedReminderHour === 20 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>В 20:00 (Вечер)</span>
              <input type="radio" name="onboard-reminder" value="20" class="sr-only" tabindex="-1" ${selectedReminderHour === 20 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedReminderHour === null ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>Не нужно</span>
              <input type="radio" name="onboard-reminder" value="null" class="sr-only" tabindex="-1" ${selectedReminderHour === null ? 'checked' : ''} />
            </label>
          </div>

          <div class="onboard-week-preview" style="margin-top: 24px; font-size: 14px; opacity: 0.8;">
            <strong>План на первую неделю:</strong> мягкий старт, разгон до ${selectedMin} мин в день.
          </div>
        ` : ''}
        <div class="onboard-actions" style="display: flex; gap: 8px;">
          ${step > 1 ? `<button id="btn-back" class="btn-secondary" type="button" aria-label="Назад" style="flex: 0 0 auto; padding: 16px 20px;">←</button>` : ''}
          ${step === 3 ? `<button id="btn-skip" class="btn-secondary" type="button" style="flex: 1;">Пропустить</button>` : ''}
          <button id="btn-next" class="btn-primary" type="button" style="flex: 2;" ${isNextDisabled ? 'disabled' : ''}>${step === 3 ? 'Начать калибровку' : 'Продолжить'}</button>
        </div>
      </div>
    `;

    const root = container.querySelector('.onboard') as HTMLElement | null;
    if (root) enterStage(root);

    const heading = container.querySelector('h1') as HTMLElement | null;
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }

    container.querySelectorAll<HTMLElement>('.goal-card, .btn-time, .btn-primary, .btn-secondary').forEach(btn => {
      bindPressPhysics(btn, { audio: true });
    });

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
      if (btn.querySelector('input[type="radio"]')) return;
      btn.addEventListener('click', (e) => {
        selectedMin = parseInt((e.currentTarget as HTMLElement).dataset.m || '5', 10);
        render();
      });
    });

    container.querySelectorAll('input[name="onboard-reminder"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const val = (e.target as HTMLInputElement).value;
        selectedReminderHour = val === 'null' ? null : parseInt(val, 10);
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
        if (step < 3) {
          step++;
          render();
        } else {
          container.querySelector('#btn-next')?.dispatchEvent(new Event('click'));
        }
      }
    });

    container.querySelector('#btn-skip')?.addEventListener('click', () => {
      displayName = '';
      container.querySelector('#btn-next')?.dispatchEvent(new Event('click'));
    });

    container.querySelector('#btn-next')?.addEventListener('click', () => {
      if (nameInput) displayName = nameInput.value.trim();
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
      p.reminderHour = selectedReminderHour;
      if (displayName) {
        p.displayName = displayName;
        p.name = displayName;
      }
      storage.setProfile(p);

      if (selectedReminderHour !== null && typeof window !== 'undefined' && 'Notification' in window) {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            scheduleLocalReminder();
          }
        }).catch(() => { /* ignore */ });
      }

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
