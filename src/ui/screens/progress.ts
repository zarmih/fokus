import { storage } from '../../core/storage';
import { renderShell } from '../shell';
import { registry } from '../../exercises/registry';

export function renderProgress(container: HTMLElement) {
  const content = renderShell(container, { active: 'progress' });
  const ds = storage.getDaySummaries();
  const history = storage.getHistory().slice().reverse();
  
  // Weekly chart logic
  let weeklyScore = 0;
  const bars = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const summary = ds.find(x => x.date.startsWith(dStr));
    const score = Math.round(summary ? summary.totalScore : 0);
    weeklyScore += score;
    bars.push({
      label: d.toLocaleDateString('ru-RU', {weekday: 'short'}),
      score,
      pct: score > 0 ? Math.max(10, Math.min(100, (score / 3000) * 100)) : 0
    });
  }

  const chartHtml = `
    <div class="surface">
      <h3>Неделя</h3>
      <p style="margin-bottom: 0;">Сумма: ${weeklyScore} очков</p>
      <div class="bar-chart">
        ${bars.map(b => `
          <div class="bar-wrap">
            ${b.score > 0 ? `<div class="bar-value">${b.score}</div>` : ''}
            <div class="bar ${b.score > 0 ? 'has-data' : ''}" style="height: ${b.pct}%"></div>
            <div class="bar-label">${b.label}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  let historyHtml = '';
  if (history.length === 0) {
    historyHtml = '<p style="color: var(--muted); text-align: center; margin: 24px 0;">Нет истории тренировок</p>';
  } else {
    historyHtml = history.map(h => {
      const d = new Date(h.date);
      const dateStr = d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', {hour: '2-digit', minute: '2-digit'});
      const acc = Math.round(h.accuracy * 100);
      const displayScore = Math.round(h.score);
      return `
        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--line);">
          <div>
            <div style="font-weight: 600;">${dateStr}</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 4px;">${h.minutes} мин</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; color: var(--accent);">${displayScore} очков</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 4px;">Точность ${acc}%</div>
          </div>
        </div>
      `;
    }).join('');
  }

  const domains = storage.getDomains();
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
    const displayVal = Math.round(isZero ? 500 : val);
    const pct = Math.min(100, Math.max(0, displayVal / 10));
    return `
      <div class="scale-row dom-${d.id} ${isZero ? 'scale-empty' : ''}">
        <div class="scale-label">${d.name}</div>
        <div class="scale-track"><div class="scale-fill" style="width: ${pct}%"></div></div>
        <div class="scale-value">${displayVal}</div>
      </div>
    `;
  }).join('');

  const exStates = storage.getExerciseStates();
  let exHtml = registry.map(ex => {
    const st = exStates.find(s => s.exerciseId === ex.manifest.id);
    const lvl = st ? st.level : 1;
    const acc = st ? Math.round(st.lastAccuracy * 100) : 0;
    return `
      <div class="domain-card dom-${ex.manifest.domain}" style="display: flex; justify-content: space-between; margin-bottom: 12px; padding: 12px 0 12px 12px; border-bottom: 1px solid var(--line);">
        <div>
          <div style="font-weight: 600; font-size: 15px;">${ex.manifest.name}</div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${ex.manifest.domain}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: var(--text); font-weight: 600;">Ур. ${lvl}</div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">Точность ${acc}%</div>
        </div>
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <h2>Прогресс</h2>
    ${chartHtml}
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Последние сессии</h3>
      ${historyHtml}
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Навыки</h3>
      ${domainsHtml}
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Уровни упражнений</h3>
      ${exHtml}
    </div>
  `;
}
