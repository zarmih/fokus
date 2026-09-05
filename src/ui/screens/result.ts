import { navigateTo } from '../router';
import { renderShell } from '../shell';
import type { Session } from '../../core/types';
import { registry } from '../../exercises/registry';
import { storage } from '../../core/storage';

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
    const ex = registry.find(r => r.id === item.exerciseId);
    return `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--line);">
        <div>
          <div style="font-weight: 600; font-size: 15px;">${ex?.name}</div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">Ур. ${item.level} · Точность ${Math.round(item.accuracy*100)}%</div>
        </div>
        <div style="color: var(--accent); font-weight: 600;">+${item.score}</div>
      </div>
    `;
  }).join('');
  
  let deltasHtml = Object.keys(deltas).map(k => {
    const d = deltas[k];
    const sign = d >= 0 ? '+' : '';
    const color = d >= 0 ? 'var(--success)' : 'var(--danger)';
    return `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span style="color: var(--text); text-transform: capitalize;">${k}</span>
      <span style="color: ${color}; font-weight: 600;">${sign}${Math.round(d)}</span>
    </div>`;
  }).join('');

  if (!deltasHtml) deltasHtml = '<div style="color: var(--muted); font-size: 14px;">Нет изменений</div>';

  content.innerHTML = `
    <h2 style="text-align: center; margin-bottom: 24px; font-size: 24px;">Тренировка завершена</h2>
    
    <div class="surface" style="text-align: center; padding: 32px 24px;">
      <div style="font-size: 48px; font-weight: 700; color: var(--accent); line-height: 1;">${totalScore}</div>
      <div style="color: var(--muted); font-size: 14px; margin-top: 8px;">всего очков</div>
      <div style="margin-top: 16px; font-size: 14px; color: var(--text);">Средняя точность: <b>${avgAcc}%</b></div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Сдвиги навыков</h3>
      ${deltasHtml}
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Результаты</h3>
      ${itemsHtml}
    </div>

    <div class="surface" style="background: rgba(232, 184, 109, 0.1);">
      <h3 style="color: var(--accent); margin-bottom: 8px;">Завтра</h3>
      <p style="margin: 0; color: var(--text); font-size: 14px;">В следующей сессии больше времени уйдёт на ${tomorrowFocus}.</p>
    </div>
    
    <button id="btn-done" class="btn-primary" style="margin-top: 16px;">Готово</button>
  `;

  content.querySelector('#btn-done')?.addEventListener('click', () => navigateTo('today'));
}
