import './styles.css';
import { renderToday } from './ui/screens/today';
import { storage } from './core/storage';
import { applyTheme } from './ui/theme';
import { initI18n } from './core/i18n';
import { scheduleLocalReminder, maybeNotify } from './core/reminders';
import { unlockAudio } from './core/audio';
import { initInstallPrompt } from './pwa-install';
import { applyDocumentLang } from './ui/a11y';

initInstallPrompt();

type ScreenFn = (el: HTMLElement, params?: any) => void;

const screenLoaders: Record<string, () => Promise<ScreenFn>> = {
  session: () => import('./ui/screens/session').then((m) => m.renderSession),
  result: () => import('./ui/screens/result').then((m) => m.renderResult),
  progress: () => import('./ui/screens/progress').then((m) => m.renderProgress),
  duel: () => import('./ui/screens/duel').then((m) => m.renderDuel),
  settings: () => import('./ui/screens/settings').then((m) => m.renderSettings),
  trainers: () => import('./ui/screens/trainers').then((m) => m.renderTrainers),
  'weekly-review': () => import('./ui/screens/weekly-review').then((m) => m.renderWeeklyReview)
};

function showFatal(app: HTMLElement, title: string, err: unknown) {
  const message = err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : String(err);
  app.innerHTML = `<div style="padding: 20px; color: #f44336; text-align: center;">
    <h3>${title}</h3>
    <p>${message}</p>
  </div>`;
  console.error(err);
}

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
    const p = storage.getProfile();
    initI18n(p.language);
    applyDocumentLang(p.language);
    applyTheme(p.theme || 'dark');
    scheduleLocalReminder();
    maybeNotify();
    if (!p.onboarded) {
      import('./ui/screens/onboarding').then((m) => m.renderOnboarding(app));
    } else {
      renderToday(app);
    }
  } catch (e: any) {
    showFatal(app, 'Ошибка инициализации', e);
  }
});

window.addEventListener('navigate', (e: any) => {
  const app = document.getElementById('app');
  if (!app) return;
  const { screenId, params } = e.detail;
  try {
    if (screenId === 'today') {
      renderToday(app);
      return;
    }
    const loader = screenLoaders[screenId];
    if (!loader) return;
    app.setAttribute('aria-busy', 'true');
    loader()
      .then((render) => {
        app.removeAttribute('aria-busy');
        render(app, params);
      })
      .catch((err) => {
        app.removeAttribute('aria-busy');
        showFatal(app, 'Ошибка навигации', err);
      });
  } catch (err: any) {
    showFatal(app, 'Ошибка навигации', err);
  }
});
