import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';

export function renderTrainers(container: HTMLElement) {
  container.innerHTML = `
    <div class="screen screen-trainers">
      <h2>Тренажёры</h2>
      ${registry.map(ex => `
        <div class="card" id="card-${ex.id}">
          <h3>${ex.name}</h3>
          <p>${ex.domain}</p>
        </div>
      `).join('')}
      <div class="nav-bottom">
        <span id="nav-today">Сегодня</span>
        <span class="active">Тренажёры</span>
        <span id="nav-progress">Прогресс</span>
        <span id="nav-settings">Настройки</span>
      </div>
    </div>
  `;
  
  registry.forEach(ex => {
    document.getElementById(`card-${ex.id}`)?.addEventListener('click', () => {
      navigateTo('session', {items: [{exerciseId: ex.id}]});
    });
  });

  document.getElementById('nav-today')?.addEventListener('click', () => navigateTo('today'));
  document.getElementById('nav-progress')?.addEventListener('click', () => navigateTo('progress'));
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('settings'));
}
