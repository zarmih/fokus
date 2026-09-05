import { navigateTo } from '../router';
import { storage } from '../../core/storage';
import { nextStreak } from '../../core/streak';
import { buildSession } from '../../core/session-builder';
import { registry } from '../../exercises/registry';

export function renderToday(container: HTMLElement) {
  const summaries = storage.getDaySummaries();
  const profile = storage.getProfile();
  
  let streak = 0;
  if (summaries.length > 0) {
    const last = summaries[summaries.length - 1];
    const ns = nextStreak(last.date, last.streak, new Date().toISOString());
    streak = ns.streak;
    if (ns.skipped || streak === 1) streak = 0; // hasn't played today yet
    else streak = last.streak;
  }
  
  const min = Math.floor(profile.sessionLengthSec / 60);

  container.innerHTML = `
    <div class="screen screen-today">
      <h1>Fokus</h1>
      <div class="stats-row">
        <span>Серия: ${streak} дн.</span>
        <span>Длительность: ~${min} мин.</span>
      </div>
      <div class="session-composition">
        Состав: ${registry.map(r => r.name).join(', ')}
      </div>
      <button id="btn-start" class="btn-primary">Начать</button>
      <div class="disclaimer">Это не медицинское изделие и не диагностика.</div>
      <div class="nav-bottom">
        <span class="active">Сегодня</span>
        <span id="nav-trainers">Тренажёры</span>
        <span id="nav-progress">Прогресс</span>
        <span id="nav-settings">Настройки</span>
      </div>
    </div>
  `;
  document.getElementById('btn-start')?.addEventListener('click', () => {
    const sessionItems = buildSession({
      durationSec: profile.sessionLengthSec,
      catalog: registry,
      domainIndexes: [],
      lastPlayedByExercise: {},
      yesterdayDomains: []
    });
    navigateTo('session', {items: sessionItems});
  });
  document.getElementById('nav-trainers')?.addEventListener('click', () => navigateTo('trainers'));
  document.getElementById('nav-progress')?.addEventListener('click', () => navigateTo('progress'));
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('settings'));
}
