import { navigateTo } from '../router';
import { storage } from '../../core/storage';

export function renderOnboarding(container: HTMLElement) {
  let step = 1;
  let selectedMin = 5;

  const render = () => {
    container.innerHTML = `
      <div style="height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 24px; text-align: center;">
        ${step === 1 ? `
          <h1 style="color: var(--accent); margin-bottom: 16px;">Fokus</h1>
          <p style="font-size: 18px; line-height: 1.5; color: var(--text);">Короткие тренировки внимания и памяти.</p>
          <button id="btn-next" class="btn-primary" style="margin-top: 48px; width: 100%; max-width: 300px;">Продолжить</button>
        ` : ''}
        ${step === 2 ? `
          <h2 style="margin-bottom: 24px;">Длительность сессии</h2>
          <div style="display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 300px;">
            <button class="btn-time ${selectedMin === 5 ? 'btn-primary' : 'btn-secondary'}" data-m="5">5 минут</button>
            <button class="btn-time ${selectedMin === 8 ? 'btn-primary' : 'btn-secondary'}" data-m="8">8 минут</button>
            <button class="btn-time ${selectedMin === 12 ? 'btn-primary' : 'btn-secondary'}" data-m="12">12 минут</button>
          </div>
          <button id="btn-next" class="btn-primary" style="margin-top: 48px; width: 100%; max-width: 300px;">Далее</button>
        ` : ''}
        ${step === 3 ? `
          <h2 style="margin-bottom: 24px;">Всё готово</h2>
          <p style="font-size: 18px; line-height: 1.5; color: var(--text);">Первый раз будет калибровка для определения вашего уровня.</p>
          <button id="btn-start" class="btn-primary" style="margin-top: 48px; width: 100%; max-width: 300px;">Начать</button>
        ` : ''}
      </div>
    `;

    if (step === 1 || step === 2) {
      document.getElementById('btn-next')?.addEventListener('click', () => {
        step++;
        render();
      });
    }

    if (step === 2) {
      container.querySelectorAll('.btn-time').forEach(btn => {
        btn.addEventListener('click', (e) => {
          selectedMin = parseInt((e.target as HTMLElement).dataset.m || '5');
          render();
        });
      });
    }

    if (step === 3) {
      document.getElementById('btn-start')?.addEventListener('click', () => {
        const p = storage.getProfile();
        p.onboarded = true;
        p.sessionLengthSec = selectedMin * 60;
        storage.setProfile(p);
        
        if (!p.calibrated && storage.getHistory().length === 0) {
          navigateTo('session', { mode: 'calibration' });
        } else {
          navigateTo('today');
        }
      });
    }
  };

  render();
}
