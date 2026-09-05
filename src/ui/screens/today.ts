import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { buildSession } from '../../core/session-builder';
import { navigateTo } from '../router';
import { renderShell } from '../shell';

export function renderToday(container: HTMLElement) {
  const content = renderShell(container, { active: 'today' });
  const profile = storage.getProfile();
  const ds = storage.getDaySummaries();
  const todayStr = new Date().toISOString().split('T')[0];
  const playedToday = ds.some(d => d.date.startsWith(todayStr));
  
  let streak = 0;
  let yesterdayScore = 0;
  if (ds.length > 0) {
    const last = ds[ds.length - 1];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    if (playedToday) streak = last.streak;
    else if (last.date.startsWith(yesterdayDate.toISOString().split('T')[0])) {
      streak = last.streak;
      yesterdayScore = last.totalScore;
    }
  }

  // Pre-build session to show composition
  const domains = storage.getDomains();
  const items = buildSession({
    durationSec: profile.sessionLengthSec,
    catalog: registry,
    domainIndexes: domains,
    lastPlayedByExercise: {},
    yesterdayDomains: []
  });

  const allDomains = [
    {id: 'attention', name: 'Внимание'},
    {id: 'memory', name: 'Память'},
    {id: 'speed', name: 'Скорость'},
    {id: 'flexibility', name: 'Гибкость'},
    {id: 'logic', name: 'Логика'}
  ];

  let domainsHtml = allDomains.map(d => {
    const val = domains.find(x => x.domain === d.id)?.value || 0;
    const isZero = val === 0;
    const displayVal = isZero ? 500 : val;
    const pct = Math.min(100, Math.max(0, displayVal / 10));
    return `
      <div class="scale-row ${isZero ? 'scale-empty' : ''}">
        <div class="scale-label">${d.name}</div>
        <div class="scale-track"><div class="scale-fill" style="width: ${pct}%"></div></div>
        <div class="scale-value">${displayVal}</div>
      </div>
    `;
  }).join('');

  let compositionHtml = items.map(item => {
    const r = registry.find(x => x.id === item.exerciseId);
    return `<div class="chip">${r?.name}<span>${r?.domain}</span></div>`;
  }).join('');

  let topCard = '';
  if (streak > 0) {
    topCard = `
      <div class="surface" style="text-align: center; padding: 24px;">
        <div style="font-size: 48px; font-weight: 700; color: var(--accent); line-height: 1;">${streak}</div>
        <div style="color: var(--muted); font-size: 14px; margin-top: 8px;">дней подряд</div>
        ${yesterdayScore > 0 && !playedToday ? `<div style="font-size: 12px; margin-top: 16px; color: var(--muted);">Вчера · ${yesterdayScore} очков</div>` : ''}
      </div>
    `;
  } else {
    topCard = `
      <div class="surface" style="text-align: center; padding: 24px;">
        <div style="font-size: 48px; font-weight: 700; color: var(--accent); line-height: 1;">0</div>
        <div style="color: var(--muted); font-size: 14px; margin-top: 8px;">начни серию</div>
      </div>
    `;
  }

  let actionHtml = '';
  if (!profile.calibrated) {
    actionHtml = `
      <div class="surface" style="text-align: center;">
        <p style="margin-bottom: 20px;">Сначала короткая настройка уровня, ~90 сек</p>
        <button id="btn-start" class="btn-primary" style="margin-bottom: 0;">Пройти калибровку</button>
      </div>
    `;
  } else if (playedToday) {
    actionHtml = `
      <button id="btn-start" class="btn-secondary">Повторить сессию</button>
    `;
  } else {
    actionHtml = `
      <div class="surface" style="padding-bottom: 4px;">
        <h3 style="margin-bottom: 12px;">Состав сессии</h3>
        <div style="margin-bottom: 20px;">${compositionHtml}</div>
        <button id="btn-start" class="btn-primary" style="margin-bottom: 12px;">Начать ${Math.floor(profile.sessionLengthSec/60)} мин</button>
      </div>
    `;
  }

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = new Date().toLocaleDateString('ru-RU', dateOptions);

  content.innerHTML = `
    <h2 style="text-transform: capitalize; margin-bottom: 4px;">Сегодня</h2>
    <p style="margin-bottom: 24px;">${dateStr}</p>
    
    ${topCard}
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Когнитивный профиль</h3>
      ${domainsHtml}
    </div>

    ${actionHtml}
  `;

  content.querySelector('#btn-start')?.addEventListener('click', () => {
    if (!profile.calibrated) {
      navigateTo('session', {mode: 'calibration', items: [{exerciseId: 'odd-one'}, {exerciseId: 'grid-memory'}, {exerciseId: 'stroop'}]});
    } else {
      navigateTo('session', {mode: 'normal', items});
    }
  });
}
