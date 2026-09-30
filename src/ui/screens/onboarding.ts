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
      <main class="onboard" aria-labelledby="onboard-heading">
        <div class="sr-only" aria-live="polite">Шаг ${step} из ${totalSteps}</div>
        <div class="onboard-dots" role="progressbar" aria-valuemin="1" aria-valuemax="${totalSteps}" aria-valuenow="${step}" aria-label="Шаг ${step} из ${totalSteps}">
          ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i + 1 <= step ? 'on' : ''}"></span>`).join('')}
        </div>
        ${step === 1 ? `
          <h1 id="onboard-heading">Главная цель</h1>
          <p class="onboard-lead">Выберите фокус ежедневной сессии. Вы сможете изменить цель позже.</p>
          <fieldset class="goal-grid" style="border: none; padding: 0; margin: 0;">
            <legend class="sr-only">Главная цель</legend>
            ${GOAL_COPY.map((g) => `
              <label class="goal-card ${selectedGoal === g.id ? 'active' : ''}" style="cursor: pointer;">
                <input type="radio" name="onboard-goal" value="${g.id}" class="sr-only" ${selectedGoal === g.id ? 'checked' : ''} />
                <div class="goal-title">${g.title}</div>
                <div class="goal-desc">${g.desc}</div>
              </label>
            `).join('')}
          </fieldset>
        ` : ''}
        ${step === 2 ? `
          <h1 id="onboard-heading">Сколько времени в день?</h1>
          <p class="onboard-lead">Для устойчивого эффекта лучше заниматься понемногу, но каждый день.</p>
          <fieldset class="time-stack" style="border: none; padding: 0; margin: 0;">
            <legend class="sr-only">Длительность сессии</legend>
            <label class="btn-time ${selectedMin === 5 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>5 минут · ежедневный минимум</span>
              <input type="radio" name="onboard-time" value="5" class="sr-only" ${selectedMin === 5 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedMin === 8 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>8 минут · сбалансированный темп</span>
              <input type="radio" name="onboard-time" value="8" class="sr-only" ${selectedMin === 8 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedMin === 12 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>12 минут · глубокое погружение</span>
              <input type="radio" name="onboard-time" value="12" class="sr-only" ${selectedMin === 12 ? 'checked' : ''} />
            </label>
          </fieldset>
        ` : ''}
        ${step === 3 ? `
          <h1 id="onboard-heading">Как к вам обращаться?</h1>
          <p class="onboard-lead">Имя сохраняется только на вашем устройстве.</p>
          <label class="sr-only" for="onboard-name">Имя или ник</label>
          <input id="onboard-name" class="onboard-input" maxlength="24" placeholder="Введите имя..." autocomplete="nickname" value="${displayName.replace(/"/g, '&quot;')}" />
          
          <h2 style="margin-top: 32px; font-size: 1.25rem;">Напоминания</h2>
          <p class="onboard-lead" style="margin-bottom: 12px;">Уведомления помогут не забывать о тренировках. Их всегда можно отключить.</p>
          <fieldset class="time-stack" style="border: none; padding: 0; margin: 0;">
            <legend class="sr-only">Время напоминания</legend>
            <label class="btn-time ${selectedReminderHour === 9 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>В 09:00 (Утро)</span>
              <input type="radio" name="onboard-reminder" value="9" class="sr-only" ${selectedReminderHour === 9 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedReminderHour === 20 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>В 20:00 (Вечер)</span>
              <input type="radio" name="onboard-reminder" value="20" class="sr-only" ${selectedReminderHour === 20 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedReminderHour === null ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>Не нужно</span>
              <input type="radio" name="onboard-reminder" value="null" class="sr-only" ${selectedReminderHour === null ? 'checked' : ''} />
            </label>
          </fieldset>

          <div class="onboard-week-preview" style="margin-top: 24px;" aria-live="polite">
            <h2 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">План на первую неделю:</h2>
            <ul style="list-style: none; padding: 0; margin: 0 0 12px; font-size: 14px; opacity: 0.9; display: flex; flex-direction: column; gap: 6px;">
              ${firstWeekPreviewLines(weekPreview).map(line => `<li>${line}</li>`).join('')}
              <li style="opacity: 0.7; margin-top: 8px;">Разгон до ${selectedMin} мин в день.</li>
            </ul>
          </div>
        ` : ''}
        <div class="onboard-actions" style="display: flex; gap: 8px;">
          ${step > 1 ? `<button id="btn-back" class="btn-secondary" type="button" aria-label="Назад" style="flex: 0 0 auto; padding: 16px 20px;">←</button>` : ''}
          ${step === 3 ? `<button id="btn-skip" class="btn-secondary" type="button" style="flex: 1;">Пропустить</button>` : ''}
          <button id="btn-next" class="btn-primary" type="button" style="flex: 2;" ${isNextDisabled ? 'disabled' : ''}>${step === 3 ? 'Начать калибровку' : 'Продолжить'}</button>
        </div>
      </main>
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

    container.querySelectorAll('input[name="onboard-goal"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        selectedGoal = (e.target as HTMLInputElement).value;
        render();
      });
    });

    container.querySelectorAll('input[name="onboard-time"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        selectedMin = parseInt((e.target as HTMLInputElement).value, 10);
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
