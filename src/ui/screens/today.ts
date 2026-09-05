import { navigateTo } from '../router';
import { storage } from '../../core/storage';
import { nextStreak } from '../../core/streak';
import { buildSession } from '../../core/session-builder';
import { registry } from '../../exercises/registry';

export function renderToday(container: HTMLElement) {
  const summaries = storage.getDaySummaries();
  const profile = storage.getProfile();
  
  const ds = storage.getDaySummaries();
  const todayStr = new Date().toISOString().split('T')[0];
  const playedToday = ds.some(d => d.date.startsWith(todayStr));

  let streak = 0;
  if (ds.length > 0) {
    const last = ds[ds.length - 1];
    const ns = nextStreak(last.date, last.streak, new Date().toISOString());
    streak = ns.streak;
    if (ns.skipped || streak === 1) streak = 0; // hasn't played today yet
    else streak = last.streak;
  }
  
  const min = Math.floor(profile.sessionLengthSec / 60);

  let content = '';
  if (!profile.calibrated) {
    content = `
      <div class="session-composition">Сначала короткая настройка уровня, ~90 сек</div>
      <button id="btn-start" class="btn-primary">Пройти калибровку</button>
    `;
  } else if (playedToday) {
    content = `
      <div class="session-composition">Отличная работа! Тренировка на сегодня завершена.</div>
      <button id="btn-start" class="btn-secondary">Повторить сессию</button>
    `;
  } else {
    content = `
      <div class="session-composition">Состав: ${registry.map(r => r.name).join(', ')}</div>
      <button id="btn-start" class="btn-primary">Начать сессию</button>
    `;
  }

  container.innerHTML = `
    <div class="screen screen-today">
      <h1>Fokus</h1>
      <div class="stats-row">
        <span>Серия: ${streak} дн.</span>
        <span>Длительность: ~${min} мин.</span>
      </div>
      ${content}
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
    if (!profile.calibrated) {
      navigateTo('session', {mode: 'calibration', items: [{exerciseId: 'odd-one'}, {exerciseId: 'grid-memory'}, {exerciseId: 'stroop'}]});
    } else {
      const domains = storage.getDomains();
      const lastPlayed = {};
      const yesterday: string[] = [];
      const items = buildSession({
        durationSec: storage.getProfile().sessionLengthSec,
        catalog: registry,
        domainIndexes: domains,
        lastPlayedByExercise: lastPlayed,
        yesterdayDomains: yesterday
      });
      navigateTo('session', {mode: 'normal', items});
    }
  });
  document.getElementById('nav-trainers')?.addEventListener('click', () => navigateTo('trainers'));
  document.getElementById('nav-progress')?.addEventListener('click', () => navigateTo('progress'));
  document.getElementById('nav-settings')?.addEventListener('click', () => navigateTo('settings'));
}
