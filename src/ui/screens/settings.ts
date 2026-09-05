import { navigateTo } from '../router';
import { storage } from '../../core/storage';

export function renderSettings(container: HTMLElement) {
  const p = storage.getProfile();
  container.innerHTML = `
    <div class="screen screen-settings">
      <h2>Настройки</h2>
      <div class="settings-group">
        <label>Длительность сессии:</label>
        <select id="sel-duration">
          <option value="300" ${p.sessionLengthSec === 300 ? 'selected' : ''}>5 мин</option>
          <option value="480" ${p.sessionLengthSec === 480 ? 'selected' : ''}>8 мин</option>
          <option value="720" ${p.sessionLengthSec === 720 ? 'selected' : ''}>12 мин</option>
        </select>
      </div>
      <button id="btn-export" class="btn-secondary">Экспорт JSON</button>
      <button id="btn-reset" class="btn-danger">Сбросить прогресс</button>
      <div class="nav-bottom">
        <span id="nav-today">Сегодня</span>
        <span id="nav-trainers">Тренажёры</span>
        <span id="nav-progress">Прогресс</span>
        <span class="active">Настройки</span>
      </div>
    </div>
  `;
  document.getElementById('sel-duration')?.addEventListener('change', (e: any) => {
    p.sessionLengthSec = parseInt(e.target.value);
    storage.setProfile(p);
  });
  document.getElementById('btn-export')?.addEventListener('click', () => {
    const data = storage.exportJson();
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fokus-export.json';
    a.click();
  });
  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('Точно сбросить прогресс? Это нельзя отменить.')) {
      storage.reset();
      window.location.reload();
    }
  });
  
  document.getElementById('nav-today')?.addEventListener('click', () => navigateTo('today'));
  document.getElementById('nav-trainers')?.addEventListener('click', () => navigateTo('trainers'));
  document.getElementById('nav-progress')?.addEventListener('click', () => navigateTo('progress'));
}
