import { storage } from '../core/storage';
import { navigateTo } from './router';

export function renderShell(container: HTMLElement, params: {active: 'today' | 'trainers' | 'progress' | 'settings', hideNav?: boolean}): HTMLElement {
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

  const navHtml = params.hideNav ? '' : `
    <div class="tab-bar">
      <div class="tab-item ${params.active === 'today' ? 'active' : ''}" id="tab-today">
        <svg viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
        <span>Сегодня</span>
      </div>
      <div class="tab-item ${params.active === 'trainers' ? 'active' : ''}" id="tab-trainers">
        <svg viewBox="0 0 24 24"><path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43L16.29 22l2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43L22 16.29z"/></svg>
        <span>Тренажёры</span>
      </div>
      <div class="tab-item ${params.active === 'progress' ? 'active' : ''}" id="tab-progress">
        <svg viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
        <span>Прогресс</span>
      </div>
      <div class="tab-item ${params.active === 'settings' ? 'active' : ''}" id="tab-settings">
        <svg viewBox="0 0 24 24"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
        <span>Настройки</span>
      </div>
    </div>
  `;

  const headerHtml = params.hideNav ? '' : `
    <div class="top-bar">
      <div class="brand" style="display: flex; align-items: center; gap: 8px;"><img src="${import.meta.env.BASE_URL}art/logo-fokus.svg" width="24" height="24">Fokus</div>
      <div class="streak-badge">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C12 2 7 7 7 13C7 15.76 9.24 18 12 18C14.76 18 17 15.76 17 13C17 7 12 2 12 2ZM12 16C10.34 16 9 14.66 9 13C9 10.74 12 6.54 12 6.54C12 6.54 15 10.74 15 13C15 14.66 13.66 16 12 16Z"/></svg>
        ${streak}
      </div>
    </div>
  `;

  container.innerHTML = `
    ${headerHtml}
    <div class="shell-content ${params.hideNav ? 'no-nav' : ''}"></div>
    ${navHtml}
  `;

  if (!params.hideNav) {
    container.querySelector('#tab-today')?.addEventListener('click', () => navigateTo('today'));
    container.querySelector('#tab-trainers')?.addEventListener('click', () => navigateTo('trainers'));
    container.querySelector('#tab-progress')?.addEventListener('click', () => navigateTo('progress'));
    container.querySelector('#tab-settings')?.addEventListener('click', () => navigateTo('settings'));
  }

  return container.querySelector('.shell-content') as HTMLElement;
}
