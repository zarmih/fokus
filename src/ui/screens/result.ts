import { navigateTo } from '../router';
import { renderShell } from '../shell';
import type { Session } from '../../core/types';
import { registry } from '../../exercises/registry';
import { storage } from '../../core/storage';
import { buildTrainingPlan } from '../../core/session-builder';

export function renderResult(container: HTMLElement, params: {session: Session}) {
  const content = renderShell(container, { active: 'today', hideNav: true });
  const session = params.session;
  
  let totalScore = 0;
  let totalAcc = 0;
  session.items.forEach(i => {
    totalScore += i.score;
    totalAcc += i.accuracy;
  });
  const avgAcc = session.items.length > 0 ? Math.round((totalAcc / session.items.length) * 100) : 0;
  
  const dsList = storage.getDaySummaries();
  const ds = dsList.find(d => d.date === session.startedAt);
  const deltas = ds ? ds.domainDeltas : {};

  const domains = storage.getDomains();
  let lowest = domains[0];
  if (lowest) {
    domains.forEach(d => { if (d.value < lowest.value) lowest = d; });
  }
  const nextFocusMap: Record<string, string> = {
    'attention': 'внимание',
    'memory': 'память',
    'speed': 'скорость',
    'flexibility': 'гибкость',
    'logic': 'логику'
  };
  const tomorrowFocus = lowest ? nextFocusMap[lowest.domain] || lowest.domain : 'баланс';

  let itemsHtml = session.items.map(item => {
    const ex = registry.find(r => r.manifest.id === item.exerciseId);
    
    // Fallbacks for legacy snapshots where these fields might be missing
    const p = Math.round(item.performance || item.score * 10);
    const mBefore = item.masteryBefore || 0;
    const mAfter = item.masteryAfter || 0;
    const diffBefore = item.difficultyBefore || item.level;
    const diffAfter = item.difficultyAfter || item.level;
    const conf = item.confidenceAfter !== undefined ? item.confidenceAfter : 100;
    
    const mDelta = mAfter - mBefore;
    const mSign = mDelta > 0 ? '+' : '';
    const mColor = mDelta > 0 ? 'var(--ok)' : (mDelta < 0 ? 'var(--danger)' : 'var(--muted)');
    
    const dDelta = diffAfter - diffBefore;
    const dSign = dDelta > 0 ? '+' : '';
    const dColor = dDelta > 0 ? 'var(--ok)' : (dDelta < 0 ? 'var(--danger)' : 'var(--muted)');
    
    const pState = item.progressionState || (mDelta > 0 ? 'up' : (mDelta < 0 ? 'down' : 'stable'));
    const stateLabel = pState === 'up' ? '📈 Растёт' : (pState === 'down' ? '📉 Падает' : (pState === 'plateau' ? '➖ Плато' : 'Стабильно'));

    return `
      <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--line);">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <div style="font-weight: 600; font-size: 15px;">${ex?.manifest.name}</div>
          <div style="color: var(--accent); font-weight: 600;">+${Math.round(item.score)} (Perf: ${p})</div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; font-size: 13px;">
          <div class="surface" style="padding: 8px; background: rgba(0,0,0,0.02);">
            <div style="color: var(--muted); margin-bottom: 4px;">Мастерство</div>
            <div>
              <span style="font-weight: 600;">${mAfter}</span>
              <span style="color: ${mColor}; margin-left: 4px;">${mDelta !== 0 ? `(${mSign}${mDelta})` : '(=)'}</span>
            </div>
          </div>
          <div class="surface" style="padding: 8px; background: rgba(0,0,0,0.02);">
            <div style="color: var(--muted); margin-bottom: 4px;">Сложность</div>
            <div>
              <span style="font-weight: 600;">${diffAfter.toFixed(1)}</span>
              <span style="color: ${dColor}; margin-left: 4px;">${dDelta !== 0 ? `(${dSign}${dDelta.toFixed(1)})` : '(=)'}</span>
            </div>
          </div>
          <div class="surface" style="padding: 8px; background: rgba(0,0,0,0.02);">
            <div style="color: var(--muted); margin-bottom: 4px;">Статус</div>
            <div style="font-weight: 500;">${stateLabel}</div>
          </div>
          <div class="surface" style="padding: 8px; background: rgba(0,0,0,0.02);">
            <div style="color: var(--muted); margin-bottom: 4px;">Калибровка</div>
            <div style="font-weight: 500;">${Math.round(conf)}%</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  let deltasHtml = Object.keys(deltas).map(k => {
    const d = deltas[k];
    const sign = d >= 0 ? '+' : '';
    const color = d >= 0 ? 'var(--ok)' : 'var(--danger)';
    return `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: var(--text); text-transform: capitalize;">${k}</span>
      <span style="color: ${color}; font-weight: 600;">${sign}${Math.round(d)}</span>
    </div>`;
  }).join('');

  if (!deltasHtml) deltasHtml = '<div style="color: var(--muted); font-size: 14px;">Нет изменений</div>';

  const plan = buildTrainingPlan({
    durationSec: 300,
    catalog: registry as any,
    domains: storage.getDomains(),
    skills: storage.getSkills(),
    states: storage.getExerciseStates(),
    primaryGoal: storage.getProfile().primaryGoal
  });
  
  const nextItem = plan.items[0];
  const nextEx = nextItem ? registry.find(r => r.manifest.id === nextItem.exerciseId) : null;
  const nextHtml = nextEx ? `
    <div class="surface" style="background: rgba(16, 185, 129, 0.1);">
      <h3 style="color: var(--ok); margin-bottom: 8px;">Следующий шаг</h3>
      <p style="margin: 0 0 8px 0; color: var(--text); font-weight: 600;">${nextEx.manifest.name}</p>
      <p style="margin: 0; color: var(--muted); font-size: 13px;">${nextItem.reason}</p>
    </div>
  ` : '';

  content.innerHTML = `
    <h2 style="text-align: center; margin-bottom: 24px; font-size: 24px;">Тренировка завершена</h2>
    
    <div class="surface" style="text-align: center; padding: 32px 24px;">
      <div style="font-size: 48px; font-weight: 700; color: var(--accent); line-height: 1;">${Math.round(totalScore)}</div>
      <div style="color: var(--muted); font-size: 14px; margin-top: 8px;">всего очков</div>
      <div style="margin-top: 16px; font-size: 14px; color: var(--text);">Средняя точность: <b>${avgAcc}%</b></div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Сдвиги навыков</h3>
      ${deltasHtml}
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Результаты и прогресс</h3>
      ${itemsHtml}
    </div>

    ${nextHtml}
    
    <button id="btn-done" class="btn-primary" style="margin-top: 16px;">Готово</button>
  `;

  content.querySelector('#btn-done')?.addEventListener('click', () => navigateTo('today'));
}
