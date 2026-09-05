import { storage } from '../../core/storage';
import { renderShell } from '../shell';
import { registry } from '../../exercises/registry';

export function renderProgress(container: HTMLElement) {
  const content = renderShell(container, { active: 'progress' });
  const ds = storage.getDaySummaries();
  
  // Weekly chart logic
  let weeklyScore = 0;
  const bars = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dStr = d.toISOString().split('T')[0];
    const summary = ds.find(x => x.date.startsWith(dStr));
    const score = summary ? summary.totalScore : 0;
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

  const exStates = storage.getExerciseStates();
  let exHtml = registry.map(ex => {
    const st = exStates.find(s => s.exerciseId === ex.id);
    const lvl = st ? st.level : 1;
    const acc = st ? Math.round(st.lastAccuracy * 100) : 0;
    return `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line);">
        <div>
          <div style="font-weight: 600; font-size: 15px;">${ex.name}</div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${ex.domain}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: var(--accent); font-weight: 600;">Ур. ${lvl}</div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">Точность ${acc}%</div>
        </div>
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <h2>Прогресс</h2>
    ${chartHtml}
    
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
