import { navigateTo } from '../router';
import { storage } from '../../core/storage';

export function renderProgress(container: HTMLElement) {
  const summaries = storage.getDaySummaries(7);
  let html = summaries.map(s => `
    <div class="progress-bar-wrap">
      <div class="progress-bar" style="height: ${Math.min(100, (s.totalScore / 5000)*100)}%;"></div>
      <span>${new Date(s.date).getDate()}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="screen screen-progress">
      <h2>Прогресс (7 дней)</h2>
      <div class="progress-chart">${html || 'Пока нет данных'}</div>
      <div class="nav-bottom">
        <span id="nav-today">Сегодня</span>
        <span id="nav-trainers">Тренажёры</span>
        <span class="active">Прогресс</span>
        <span id="nav-settings">Настройки</span>
      </div>
    </div>
  `;
  document.getElementById('nav-today')?.addEventListener('click', () => navigateTo('today'));
  document.getElementById('nav-trainers')?.addEventListener('click', () => navigateTo('trainers'));
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('settings'));
}
