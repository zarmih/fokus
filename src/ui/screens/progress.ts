import { generateInsights } from "../../core/insights";
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
  const skills = storage.getSkills();
  
  // Build domain -> skills map
  const domainSkills = new Map<string, Set<string>>();
  registry.forEach(ex => {
    if (!domainSkills.has(ex.manifest.domain)) {
      domainSkills.set(ex.manifest.domain, new Set());
    }
    ex.manifest.skills.forEach(sk => domainSkills.get(ex.manifest.domain)!.add(sk));
  });

  const allDomains = [
    {id: 'attention', name: 'Внимание'},
    {id: 'memory', name: 'Память'},
    {id: 'speed', name: 'Скорость'},
    {id: 'flexibility', name: 'Гибкость'},
    {id: 'logic', name: 'Логика'}
  ];

  let profileHtml = allDomains.map(d => {
    const dVal = domains.find(x => x.domain === d.id);
    if (!dVal) return '';
    const dScore = Math.round(dVal.value);
    
    // Find skills for this domain
    const dSkillNames = Array.from(domainSkills.get(d.id) || []);
    const dSkills = skills.filter(s => dSkillNames.includes(s.skill)).sort((a,b) => b.value - a.value);
    
    const skillsListHtml = dSkills.map(s => {
      const displayVal = Math.round(s.value);
      const isReliable = s.confidence >= 10;
      const pct = isReliable ? Math.min(100, Math.max(0, displayVal / 15)) : 0;
      const trendStr = s.trend > 0 ? '↑' : s.trend < 0 ? '↓' : '→';
      const trendColor = s.trend > 0 ? 'var(--ok)' : s.trend < 0 ? 'var(--danger)' : 'var(--muted)';
      const skillName = s.skill.replace('_', ' ');
      
      const valueText = isReliable ? `<span style="color: ${trendColor}; font-size: 11px; margin-right: 4px;">${trendStr}</span><span style="font-weight: 600;">${displayVal}</span>` : `<span style="color: var(--muted); font-size: 11px;">калибровка...</span>`;
      
      return `
        <div style="margin-top: 12px; padding-left: 12px; border-left: 2px solid var(--line);">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
            <span style="text-transform: capitalize; color: var(--text); opacity: 0.9;">${skillName}</span>
            <span>${valueText}</span>
          </div>
          <div class="scale-track" style="height: 4px; opacity: ${isReliable ? '1' : '0.4'}; background: rgba(255,255,255,0.05);"><div class="scale-fill" style="width: ${pct}%; background: var(--text);"></div></div>
          ${isReliable ? `<div style="font-size: 10px; color: var(--muted); margin-top: 4px; display: flex; justify-content: space-between;">
            <span>Уверенность: ${Math.round(s.confidence)}%</span>
            <span>Попыток: ${s.attempts}</span>
          </div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="domain-card dom-${d.id}" style="margin-bottom: 16px; padding: 16px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${dSkills.length > 0 ? '12px' : '0'};">
          <div style="font-weight: 700; font-size: 16px;">${d.name}</div>
          <div style="font-size: 18px; font-weight: 800;">${dScore}</div>
        </div>
        ${skillsListHtml}
      </div>
    `;
  }).join('');

  if (!profileHtml) profileHtml = '<p style="color: var(--muted); font-size: 13px;">Данные собираются...</p>';

  
  const exStates = storage.getExerciseStates();
  const insights = generateInsights(domains, skills, exStates, ds);
  let insightHtml = '';
  if (insights.length > 0) {
    const topInsight = insights[0];
    insightHtml = `
      <div class="surface" style="margin-bottom: 24px; border-left: 4px solid var(--accent);">
        <h3 style="margin-bottom: 8px;">Что Fokus заметил</h3>
        <p style="font-size: 14px; color: var(--text); line-height: 1.4; margin: 0;">${topInsight.description}</p>
      </div>
    `;
  }

  content.innerHTML = `
    <h2>Прогресс</h2>
    ${insightHtml}
    ${chartHtml}
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Последние сессии</h3>
      ${historyHtml}
    </div>

    <h3 style="margin: 32px 0 16px 0;">Когнитивный профиль</h3>
    ${profileHtml}
  `;
}
