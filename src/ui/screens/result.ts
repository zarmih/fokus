import { navigateTo } from '../router';
import { storage } from '../../core/storage';

export function renderResult(container: HTMLElement, params: {session: any}) {
  const {session} = params;
  let score = 0;
  let acc = 0;
  if (session.items.length > 0) {
    session.items.forEach((i: any) => {score += i.score; acc += i.accuracy});
    acc /= session.items.length;
  }
  
  container.innerHTML = `
    <div class="screen screen-result">
      <h2>Результат сессии</h2>
      <div class="result-stats">
        <div>Очки: <span>${score}</span></div>
        <div>Точность: <span>${Math.round(acc * 100)}%</span></div>
        <div>Память: <span>подтягивается</span></div>
      </div>
      <p class="suggestion">Завтра стоит уделить больше внимания скорости.</p>
      <button id="btn-home" class="btn-primary">Домой</button>
    </div>
  `;
  document.getElementById('btn-home')?.addEventListener('click', () => navigateTo('today'));
}
