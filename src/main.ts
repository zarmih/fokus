import './styles.css';
import { renderToday } from './ui/screens/today';
import { renderSession } from './ui/screens/session';
import { renderResult } from './ui/screens/result';
import { renderProgress } from './ui/screens/progress';
import { renderSettings } from './ui/screens/settings';
import { renderTrainers } from './ui/screens/trainers';
import { renderOnboarding } from './ui/screens/onboarding';
import { renderProgram } from './ui/screens/program';
import { storage } from './core/storage';
import { applyTheme } from './ui/theme';
import { initI18n } from './core/i18n';
import { scheduleLocalReminder, maybeNotify } from './core/reminders';
import { unlockAudio } from './core/audio';
import { applyMotionPreference } from './core/motion';

export let deferredPrompt: any = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  
  const unlock = () => unlockAudio();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      if (import.meta.env.PROD) {
        navigator.serviceWorker
          .register(`${import.meta.env.BASE_URL}sw.js`)
          .catch((err) => console.error('SW reg failed', err));
      } else {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
    });
  }

  try {
    const p = storage.getProfile(); // ensures initialization
    initI18n(p.language);
    applyTheme(p.theme || 'dark');
    applyMotionPreference();
    try {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => applyMotionPreference());
    } catch { /* ignore */ }
    scheduleLocalReminder();
    maybeNotify();
    if (!p.onboarded) {
      renderOnboarding(app);
    } else {
      renderToday(app);
    }
  } catch (e: any) {
    app.innerHTML = `<div style="padding: 20px; color: #f44336; text-align: center;">
      <h3>Ошибка инициализации</h3>
      <p>${e?.message || e}</p>
    </div>`;
    console.error(e);
  }
});

window.addEventListener('navigate', (e: any) => {
  const app = document.getElementById('app')!;
  const {screenId, params} = e.detail;
  try {
    if (screenId === 'today') renderToday(app);
    else if (screenId === 'program') renderProgram(app);
    else if (screenId === 'session') renderSession(app, params);
    else if (screenId === 'result') renderResult(app, params);
    else if (screenId === 'progress') renderProgress(app);
    else if (screenId === 'duel') {
      import('./ui/screens/duel').then(m => m.renderDuel(app));
    }
    else if (screenId === 'settings') renderSettings(app);
    else if (screenId === 'trainers') renderTrainers(app);
    else if (screenId === 'weekly-review') {
      import('./ui/screens/weekly-review').then(m => m.renderWeeklyReview(app));
    }
  } catch (err: any) {
    app.innerHTML = `<div style="padding: 20px; color: #f44336; text-align: center;">
      <h3>Ошибка навигации</h3>
      <p>${err?.message || err}</p>
    </div>`;
    console.error(err);
  }
});
