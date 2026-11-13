import { navigateTo } from '../router';
import { initialZones } from '../../core/time-zone-choice';
import { deviceTimeZone } from '../../core/streak';
import { storage } from '../../core/storage';
import { goalCopy } from '../../core/labels';
import { L, getLocale, setLocale } from '../../core/i18n';
import { applyDocumentLang } from '../a11y';
import { calibrationSessionItems } from '../../core/calibration';
import { buildFirstWeekPlan, firstWeekPreviewLines, gentleDayNote } from '../../core/onboarding';
import { registry } from '../../exercises/manifest-registry';
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
        <div class="sr-only" aria-live="polite">${L(`Шаг ${step} из ${totalSteps}`, `Step ${step} of ${totalSteps}`)}</div>
        <div class="onboard-dots" role="progressbar" aria-valuemin="1" aria-valuemax="${totalSteps}" aria-valuenow="${step}" aria-label="${L(`Шаг ${step} из ${totalSteps}`, `Step ${step} of ${totalSteps}`)}">
          ${Array.from({ length: totalSteps }, (_, i) => `<span class="${i + 1 <= step ? 'on' : ''}"></span>`).join('')}
        </div>
        ${step === 1 ? `
          <div class="segmented onboard-lang" role="group" aria-label="Язык / Language" style="margin-bottom: 16px;">
            <button type="button" data-lang="ru" aria-pressed="${getLocale() === 'ru'}" class="${getLocale() === 'ru' ? 'active' : ''}">Русский</button>
            <button type="button" data-lang="en" aria-pressed="${getLocale() === 'en'}" class="${getLocale() === 'en' ? 'active' : ''}">English</button>
          </div>
          <h1 id="onboard-heading">${L('Главная цель', 'Your main goal')}</h1>
          <p class="onboard-lead">${L('Выберите фокус ежедневной сессии. Вы сможете изменить цель позже.', 'Pick the focus of your daily session. You can change it later.')}</p>
          <fieldset class="goal-grid" style="border: none; padding: 0; margin: 0;">
            <legend class="sr-only">${L('Главная цель', 'Main goal')}</legend>
            ${goalCopy().map((g) => `
              <label class="goal-card ${selectedGoal === g.id ? 'active' : ''}" style="cursor: pointer;">
                <input type="radio" name="onboard-goal" value="${g.id}" class="sr-only" ${selectedGoal === g.id ? 'checked' : ''} aria-describedby="desc-${g.id}" />
                <div class="goal-title">${g.title}</div>
                <div class="goal-desc" id="desc-${g.id}">${g.desc}</div>
              </label>
            `).join('')}
          </fieldset>
        ` : ''}
        ${step === 2 ? `
          <h1 id="onboard-heading">${L('Сколько времени в день?', 'How much time per day?')}</h1>
          <p class="onboard-lead">${L('Для устойчивого эффекта лучше заниматься понемногу, но каждый день.', 'A little every day works better than a lot once in a while.')}</p>
          <fieldset class="time-stack" style="border: none; padding: 0; margin: 0;">
            <legend class="sr-only">${L('Длительность сессии', 'Session length')}</legend>
            <label class="btn-time ${selectedMin === 5 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>${L('5 минут · ежедневный минимум', '5 minutes · daily minimum')}</span>
              <input type="radio" name="onboard-time" value="5" class="sr-only" ${selectedMin === 5 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedMin === 8 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>${L('8 минут · сбалансированный темп', '8 minutes · balanced pace')}</span>
              <input type="radio" name="onboard-time" value="8" class="sr-only" ${selectedMin === 8 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedMin === 12 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>${L('12 минут · глубокое погружение', '12 minutes · deep practice')}</span>
              <input type="radio" name="onboard-time" value="12" class="sr-only" ${selectedMin === 12 ? 'checked' : ''} />
            </label>
          </fieldset>
        ` : ''}
        ${step === 3 ? `
          <h1 id="onboard-heading">${L('Как к вам обращаться?', 'What should we call you?')}</h1>
          <p class="onboard-lead">${L('Имя сохраняется только на вашем устройстве.', 'Your name stays on this device only.')}</p>
          <label class="sr-only" for="onboard-name">${L('Имя или ник', 'Name or nickname')}</label>
          <input id="onboard-name" class="onboard-input" maxlength="24" placeholder="${L('Введите имя...', 'Enter a name...')}" autocomplete="nickname" aria-required="true" value="${displayName.replace(/"/g, '&quot;')}" />
          
          <h2 style="margin-top: 32px; font-size: 1.25rem;">${L('Напоминания', 'Reminders')}</h2>
          <p class="onboard-lead" style="margin-bottom: 12px;">${L('Уведомления помогут не забывать о тренировках. Их всегда можно отключить.', 'Notifications help you keep the habit. You can turn them off any time.')}</p>
          <fieldset class="time-stack" style="border: none; padding: 0; margin: 0;">
            <legend class="sr-only">${L('Время напоминания', 'Reminder time')}</legend>
            <label class="btn-time ${selectedReminderHour === 9 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>${L('В 09:00 (Утро)', 'At 09:00 (morning)')}</span>
              <input type="radio" name="onboard-reminder" value="9" class="sr-only" ${selectedReminderHour === 9 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedReminderHour === 20 ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>${L('В 20:00 (Вечер)', 'At 20:00 (evening)')}</span>
              <input type="radio" name="onboard-reminder" value="20" class="sr-only" ${selectedReminderHour === 20 ? 'checked' : ''} />
            </label>
            <label class="btn-time ${selectedReminderHour === null ? 'btn-primary' : 'btn-secondary'}" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
              <span>${L('Не нужно', 'No reminders')}</span>
              <input type="radio" name="onboard-reminder" value="null" class="sr-only" ${selectedReminderHour === null ? 'checked' : ''} />
            </label>
          </fieldset>

          <div class="onboard-week-preview" style="margin-top: 24px;" aria-live="polite">
            <h2 style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">${L('План на первую неделю:', 'Your first week:')}</h2>
            <ul style="list-style: none; padding: 0; margin: 0 0 12px; font-size: 14px; opacity: 0.9; display: flex; flex-direction: column; gap: 6px;">
              ${firstWeekPreviewLines(weekPreview).map(line => `<li>${line}</li>`).join('')}
              <li style="opacity: 0.7; margin-top: 8px;">${L(`Разгон до ${selectedMin} мин в день.`, `Building up to ${selectedMin} min a day.`)}</li>
              ${gentleDayNote(weekPreview) ? `<li style="opacity: 0.7; margin-top: 8px;" data-gentle-day="1">${gentleDayNote(weekPreview)}</li>` : ''}
            </ul>
          </div>
        ` : ''}
        <div class="onboard-actions" style="display: flex; gap: 8px;">
          ${step > 1 ? `<button id="btn-back" class="btn-secondary" type="button" aria-label="${L('Назад', 'Back')}" style="flex: 0 0 auto; padding: 16px 20px;">←</button>` : ''}
          ${step === 3 ? `<button id="btn-skip" class="btn-secondary" type="button" style="flex: 1;">${L('Пропустить', 'Skip')}</button>` : ''}
          <button id="btn-next" class="btn-primary" type="button" style="flex: 2;" ${isNextDisabled ? 'disabled' : ''}>${step === 3 ? L('Начать калибровку', 'Start calibration') : L('Продолжить', 'Continue')}</button>
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

    container.querySelectorAll<HTMLButtonElement>('.onboard-lang [data-lang]').forEach((b) => b.addEventListener('click', () => {
      const lang = b.dataset.lang === 'en' ? 'en' : 'ru';
      setLocale(lang);
      applyDocumentLang(lang);
      const p = storage.getProfile();
      p.language = lang;
      storage.setProfile(p);
      render();
    }));

    container.querySelector('#btn-back')?.addEventListener('click', () => {
      step--;
      render();
    });

    container.querySelectorAll('input[name="onboard-time"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        selectedMin = parseInt((e.target as HTMLInputElement).value, 10);
        render();
      });
      radio.addEventListener('focus', (e) => {
        (e.target as HTMLInputElement).closest('label')?.classList.add('focused');
      });
      radio.addEventListener('blur', (e) => {
        (e.target as HTMLInputElement).closest('label')?.classList.remove('focused');
      });
    });

    container.querySelectorAll('input[name="onboard-goal"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        selectedGoal = (e.target as HTMLInputElement).value;
        render();
      });
      radio.addEventListener('focus', (e) => {
        (e.target as HTMLInputElement).closest('label')?.classList.add('focused');
      });
      radio.addEventListener('blur', (e) => {
        (e.target as HTMLInputElement).closest('label')?.classList.remove('focused');
      });
    });

    container.querySelectorAll('input[name="onboard-reminder"]').forEach((radio) => {
      radio.addEventListener('change', (e) => {
        const val = (e.target as HTMLInputElement).value;
        selectedReminderHour = val === 'null' ? null : parseInt(val, 10);
        render();
      });
      radio.addEventListener('focus', (e) => {
        (e.target as HTMLInputElement).closest('label')?.classList.add('focused');
      });
      radio.addEventListener('blur', (e) => {
        (e.target as HTMLInputElement).closest('label')?.classList.remove('focused');
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
      // A new profile has no days to re-date: start in the device zone (changeable in Settings).
      if (!storage.getSessions().length && !storage.getDaySummaries().length) p.timeZones = initialZones(deviceTimeZone());
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
