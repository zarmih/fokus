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

  const topHtml = params.hideNav ? '' : `
    <div class="top-bar">
      <div class="brand">Fokus</div>
      <div class="streak-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.66 11.2c-.23-.3-.51-.56-.77-.82-.67-.6-1.43-1.03-2.07-1.66C13.33 7.26 13 4.85 13.95 3c-.95.23-1.78.75-2.49 1.32-2.59 2.08-3.61 5.75-2.39 8.9.04.1.08.2.08.33 0 .22-.15.42-.35.5-.22.1-.46.04-.64-.12a7.33 7.33 0 0 1-1.38-1.66c-.34-.53-.61-1.12-.8-1.73-.24 1.15-.17 2.36.19 3.49C7 16.32 9.07 19.34 12 20.67c3.67 1.66 8.04.25 9.8-3.41 1.05-2.18.9-4.71-.3-6.75-.12-.22-.3-.42-.51-.62-.05-.04-.09-.07-.15-.11zM14.9 17.5c-1.5 1.14-3.6 1.13-5-.05-.8-.74-1.2-1.76-1.1-2.83.05-.56.24-1.11.55-1.58.5-1.05 1.33-1.8 2.37-2.12.35-.11.72-.18 1.09-.23.1-.01.2-.03.29-.05a1.86 1.86 0 0 1 .49-.04c.16 0 .32.02.47.07 1.15.38 2.06 1.37 2.31 2.56.24 1.1-.06 2.22-.65 3.09-.3.42-.65.81-1.03 1.16-.14.12-.28.25-.43.37l-.02.01c-.13.11-.22.25-.3.4z"/></svg>
        ${streak}
      </div>
    </div>
  `;

  container.innerHTML = `
    ${topHtml}
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
