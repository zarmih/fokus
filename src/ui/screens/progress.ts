import { generateInsights } from "../../core/insights";
import { planForNow } from "../../core/adaptive-plan";
import { storage } from '../../core/storage';
import { renderShell } from '../shell';
import { registry } from '../../exercises/registry';
import { renderScatterPlot, renderRadarChart, renderIndexSparkline } from '../components/charts';
import { computeFokusIndex } from '../../core/fokus-index';
import { domainLabel, skillLabel } from '../../core/labels';
import { buildCoachIntel } from '../../core/coach-intel';

export function renderProgress(container: HTMLElement) {
  const content = renderShell(container, { active: 'progress' });
  const ds = storage.getDaySummaries(60);
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
    <div class="surface" style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
        <h3 style="margin: 0;">Активность (Неделя)</h3>
        <button id="btn-weekly-review" class="btn-secondary" style="margin: 0; padding: 6px 12px; font-size: 12px; border-radius: 12px; width: auto;">Итоги</button>
      </div>
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
    
    <div id="achievements-section" style="margin-top: 24px;"></div>
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
        <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--line);">
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
      const skillName = skillLabel(s.skill);
      
      const valueText = isReliable ? `<span style="color: ${trendColor}; font-size: 11px; margin-right: 4px;">${trendStr}</span><span style="font-weight: 600;">${displayVal}</span>` : `<span style="color: var(--muted); font-size: 11px;">калибровка...</span>`;
      
      return `
        <div style="margin-top: 12px; padding-left: 12px; border-left: 2px solid var(--line);">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
            <span style="text-transform: capitalize; color: var(--text); opacity: 0.9;">${skillName}</span>
            <span>${valueText}</span>
          </div>
          <div class="scale-track" style="height: 4px; opacity: ${isReliable ? '1' : '0.4'}; background: rgba(255,255,255,0.05);"><div class="scale-fill" style="width: ${pct}%; background: var(--dom-${d.id}); box-shadow: 0 0 8px var(--dom-${d.id});"></div></div>
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
          <div style="font-weight: 700; font-size: 16px; color: var(--dom-${d.id});">${domainLabel(d.id)}</div>
          <div style="font-size: 18px; font-weight: 800;">${dScore}</div>
        </div>
        ${skillsListHtml}
      </div>
    `;
  }).join('');

  if (!profileHtml) profileHtml = '<p style="color: var(--muted); font-size: 13px;">Данные собираются...</p>';

  const exStates = storage.getExerciseStates();
  const insights = generateInsights(domains, skills, exStates, ds, storage.getSessions());
  let insightHtml = '';
  if (insights.length > 0) {
    const topInsights = insights.slice(0, 3).map(ins => `<li style="margin-bottom: 8px;">${ins.description}</li>`).join('');
    insightHtml = `
      <div class="insight-banner">
        <div style="flex: 1;">
          <h3 style="margin-bottom: 8px;">Что Fokus заметил</h3>
          <ul style="font-size: 14px; color: var(--text); line-height: 1.4; margin: 0; padding-left: 16px; opacity: 0.9;">
            ${topInsights}
          </ul>
        </div>
      </div>
    `;
  } else {
    insightHtml = `
      <div class="surface" style="margin-bottom: 24px; border-left: 4px solid var(--line);">
        <h3 style="margin-bottom: 12px;">Что Fokus заметил</h3>
        <p style="font-size: 14px; color: var(--muted); line-height: 1.4; margin: 0;">Fokus собирает данные, чтобы дать вам полезные наблюдения.</p>
      </div>
    `;
  }

  // Next Step Block
  
  const profile = storage.getProfile();
  const plan = planForNow({ durationSec: profile.sessionLengthSec || 300 });

  let nextStepHtml = '';
  if (plan.items.length > 0) {
    const nextItem = plan.items[0];
    const nextEx = registry.find(r => r.manifest.id === nextItem.exerciseId)?.manifest;
    if (nextEx) {
      nextStepHtml = `
        <div class="surface" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%);">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Следующий шаг</div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">${nextEx.name}</div>
              <div style="font-size: 13px; color: var(--text); opacity: 0.8;">${nextItem.reason}</div>
            </div>
            <img src="${import.meta.env.BASE_URL}art/icon-${nextEx.id}.svg" width="40" height="40" style="border-radius: 8px; opacity: 0.9;">
          </div>
        </div>
      `;
    }
  }

  // Render achievements
  import('../../core/achievements').then(({ ACHIEVEMENTS_DEF }) => {
    const achSection = content.querySelector('#achievements-section');
    if (achSection) {
      const userAchievements = profile.achievements || [];
      if (userAchievements.length > 0) {
        let html = '<h3 style="margin-bottom: 16px;">Достижения</h3><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px;">';
        userAchievements.forEach(id => {
          const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
          if (def) {
            html += `
              <div class="surface" style="padding: 12px 8px; text-align: center; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);">
                <div style="font-size: 32px; margin-bottom: 4px; filter: drop-shadow(0 2px 4px rgba(16, 185, 129, 0.4));">${def.icon}</div>
                <div style="font-size: 11px; font-weight: 700; line-height: 1.1;">${def.name}</div>
              </div>
            `;
          }
        });
        html += '</div>';
        achSection.innerHTML = html;
      }
    }
  });

  const legendHtml = `
    <div class="legend-box">
      <div style="margin-bottom: 6px;"><strong>Форма (Performance)</strong> — как вы справляетесь прямо сейчас.</div>
      <div style="margin-bottom: 6px;"><strong>Освоение (Mastery)</strong> — насколько навык устойчиво закреплён.</div>
      <div><strong>Уверенность (Confidence)</strong> — насколько Fokus уверен в оценке.</div>
    </div>
  `;

  const fi = computeFokusIndex(domains);
  const intel = buildCoachIntel({
    summaries: ds,
    domains,
    window: 14,
    asOf: new Date().toISOString()
  });
  const sparkCount = intel.sparkline.points.filter((p) => p.value != null).length;
  const sparkHtml = sparkCount >= 2
    ? `<div class="fi-spark">${renderIndexSparkline(intel.sparkline, { width: 220, height: 44 })}<span class="fi-spark-lbl">${intel.sparkline.deltaLabel}</span></div>`
    : '';
  const pbNote = intel.personalBest
    ? `<div class="fi-pb">${intel.personalBest.isLatest ? 'личный рекорд' : 'рекорд'} · ${intel.personalBest.value}</div>`
    : '';

  const fiHtml = fi.coverage > 0 ? `
    <div class="fi-hero">
      <div class="fi-copy">
        <div class="fi-kicker">Fokus Index</div>
        <div class="fi-value">${fi.value}</div>
        <div class="fi-meta">${fi.coverage} из 5 областей · уверенность ${fi.confidence}%</div>
        ${pbNote}
        ${sparkHtml}
      </div>
      <div class="fi-radar">${renderRadarChart(fi.byDomain, { size: 200, max: 1200 })}</div>
    </div>
  ` : fi.coverage === 0 && intel.ready ? `
    <div class="fi-hero empty">
      <div class="fi-copy">
        <div class="fi-kicker">Fokus Index</div>
        <div class="fi-meta">Недостаточно данных по областям — продолжайте короткие сессии.</div>
        ${sparkHtml}
      </div>
    </div>
  ` : '';

  const nextMile = intel.milestones.find((m) => !m.reached);
  const milestonesHtml = intel.ready ? `
    <div class="intel-card intel-card-compact" style="margin-bottom: 24px;">
      <div class="intel-kicker">Вехи серии</div>
      <div class="intel-miles">
        ${intel.milestones.map((m) => {
          const state = m.reached ? 'reached' : nextMile && m.days === nextMile.days ? 'next' : '';
          return `<div class="intel-mile ${state}">
            <div class="intel-mile-mark">${m.reached ? '●' : '○'}</div>
            <div class="intel-mile-n">${m.days}</div>
            <div class="intel-mile-l">дней</div>
          </div>`;
        }).join('')}
      </div>
      <p class="intel-rhythm">${intel.adherence.currentStreak > 0 ? `сейчас ${intel.adherence.currentStreak}` : 'серия начнётся с сегодняшней сессии'}${nextMile ? ` · дальше ${nextMile.days}` : ''}</p>
    </div>
  ` : '';

  content.innerHTML = `
    <div class="today-head">
      <h2>Статистика</h2>
      <p class="today-date">Когнитивный профиль и аналитика вовлечённости.</p>
    </div>
    ${fiHtml}
    ${milestonesHtml}
    ${insightHtml}
    ${nextStepHtml}
    
    <div class="surface" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 16px;">Влияние сна на результат</h3>
      ${renderScatterPlot(
        ds.filter(d => d.lifestyle?.sleep && d.totalScore > 0).map(d => ({
          x: d.lifestyle!.sleep === 'high' ? 9 : d.lifestyle!.sleep === 'normal' ? 7 : 5,
          y: d.totalScore
        })),
        'Сон (часы)', 'Очки'
      )}
    </div>

    ${chartHtml}
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Последние сессии</h3>
      ${historyHtml}
    </div>

    <h3 style="margin: 32px 0 16px 0;">Когнитивный профиль</h3>
    ${legendHtml}
    ${profileHtml}
  `;

  content.querySelector('#btn-weekly-review')?.addEventListener('click', () => {
    import('../router').then(({navigateTo}) => navigateTo('weekly-review'));
  });
}
