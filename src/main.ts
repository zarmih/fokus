import './styles.css';
import { renderToday } from './ui/screens/today';
import { renderSession } from './ui/screens/session';
import { renderResult } from './ui/screens/result';
import { renderProgress } from './ui/screens/progress';
import { renderSettings } from './ui/screens/settings';
import { renderTrainers } from './ui/screens/trainers';
import { renderOnboarding } from './ui/screens/onboarding';
import { storage } from './core/storage';
import { applyTheme } from './ui/theme';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW reg failed', err));
    });
  }

  try {
    const p = storage.getProfile(); // ensures initialization
    applyTheme(p.theme || 'dark');
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
    else if (screenId === 'session') renderSession(app, params);
    else if (screenId === 'result') renderResult(app, params);
    else if (screenId === 'progress') renderProgress(app);
    else if (screenId === 'settings') renderSettings(app);
    else if (screenId === 'trainers') renderTrainers(app);
  } catch (err: any) {
    app.innerHTML = `<div style="padding: 20px; color: #f44336; text-align: center;">
      <h3>Ошибка навигации</h3>
      <p>${err?.message || err}</p>
    </div>`;
    console.error(err);
  }
});
