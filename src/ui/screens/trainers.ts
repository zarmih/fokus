import { navigateTo } from '../router';

export function renderTrainers(container: HTMLElement) {
  container.innerHTML = `
    <div class="screen screen-trainers">
      <h2>Тренажёры</h2>
      <div class="card" id="card-matrix">
        <h3>Матрица</h3>
        <p>Память</p>
      </div>
      <div class="card" id="card-sequence">
        <h3>Цепочка</h3>
        <p>Память</p>
      </div>
      <div class="nav-bottom">
        <span id="nav-today">Сегодня</span>
        <span class="active">Тренажёры</span>
        <span id="nav-progress">Прогресс</span>
        <span id="nav-settings">Настройки</span>
      </div>
    </div>
  `;
  document.getElementById('card-matrix')?.addEventListener('click', () => {
    navigateTo('session', {items: [{exerciseId: 'grid-memory'}]});
  });
  document.getElementById('card-sequence')?.addEventListener('click', () => {
    navigateTo('session', {items: [{exerciseId: 'sequence'}]});
  });
  document.getElementById('nav-today')?.addEventListener('click', () => navigateTo('today'));
  document.getElementById('nav-progress')?.addEventListener('click', () => navigateTo('progress'));
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('settings'));
}
