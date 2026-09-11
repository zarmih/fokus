import { storage } from '../core/storage';
import { navigateTo } from './router';
import { t } from '../core/i18n';
import { focusMain, setScreenTitle } from './a11y';

export function renderShell(container: HTMLElement, params: {active: 'today' | 'trainers' | 'progress' | 'duel' | 'settings', hideNav?: boolean}): HTMLElement {
  const summaries = storage.getDaySummaries();
  let streak = 0;
  if (summaries.length > 0) {
    const last = summaries[summaries.length - 1];
    const todayStr = new Date().toISOString().split('T')[0];
    if (last.date.startsWith(todayStr)) {
      streak = last.streak;
    } else {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
      if (last.date.startsWith(yesterdayStr)) streak = last.streak;
    }
  }

  const titles: Record<typeof params.active, string> = {
    today: t('today.title'),
    trainers: t('trainers.title'),
    progress: t('analytics.title'),
    duel: t('duel.title'),
    settings: t('settings.title')
  };
  if (!params.hideNav) setScreenTitle(titles[params.active]);

  const tab = (id: typeof params.active, label: string, path: string) => {
    const active = params.active === id;
    return `
      <button type="button" class="tab-item ${active ? 'active' : ''}" id="tab-${id}" ${active ? 'aria-current="page"' : ''}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"/></svg>
        <span>${label}</span>
      </button>
    `;
  };

  const navHtml = params.hideNav ? '' : `
    <nav class="tab-bar" aria-label="${t('a11y.nav')}">
      ${tab('today', t('today.title'), 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z')}
      ${tab('trainers', t('trainers.title'), 'M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z')}
      ${tab('progress', t('analytics.title'), 'M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z')}
      ${tab('duel', t('duel.title'), 'M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12.99H5V6.3l7-2.62v9.31z')}
      ${tab('settings', t('settings.title'), 'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z')}
    </nav>
  `;

  const headerHtml = params.hideNav ? '' : `
    <header class="top-bar">
      <div class="brand">
        <img src="${import.meta.env.BASE_URL}art/logo-fokus.svg" width="24" height="24" alt="">
        Fokus
      </div>
      <div class="streak-badge" aria-label="${t('a11y.streak', { n: streak })}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 2C12 2 7 7 7 13C7 15.76 9.24 18 12 18C14.76 18 17 15.76 17 13C17 7 12 2 12 2ZM12 16C10.34 16 9 14.66 9 13C9 10.74 12 6.54 12 6.54C12 6.54 15 10.74 15 13C15 14.66 13.66 16 12 16Z"/></svg>
        ${streak}
      </div>
    </header>
  `;

  container.innerHTML = `
    <a class="skip-link" href="#main-content">${t('a11y.skip')}</a>
    ${headerHtml}
    <main id="main-content" class="shell-content ${params.hideNav ? 'no-nav' : ''}" tabindex="-1"></main>
    ${navHtml}
  `;

  if (!params.hideNav) {
    container.querySelector('#tab-today')?.addEventListener('click', () => navigateTo('today'));
    container.querySelector('#tab-trainers')?.addEventListener('click', () => navigateTo('trainers'));
    container.querySelector('#tab-progress')?.addEventListener('click', () => navigateTo('progress'));
    container.querySelector('#tab-duel')?.addEventListener('click', () => navigateTo('duel'));
    container.querySelector('#tab-settings')?.addEventListener('click', () => navigateTo('settings'));
  }

  queueMicrotask(() => focusMain());
  return container.querySelector('.shell-content') as HTMLElement;
}
