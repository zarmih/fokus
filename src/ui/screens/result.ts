import { navigateTo } from '../router';
import { renderShell } from '../shell';
import type { Session } from '../../core/types';
import { registry } from '../../exercises/registry';
import { storage } from '../../core/storage';
import { planForNow } from '../../core/adaptive-plan';
import { SLOT_LABEL } from '../../core/engine';
import { getLevelProgress } from '../../core/xp';
import { ACHIEVEMENTS_DEF } from '../../core/achievements';
import { computeFokusIndex, previousFokusIndex, indexDelta } from '../../core/fokus-index';
import { domainLabel } from '../../core/labels';
import { renderRadarChart } from '../components/charts';
import { shareSessionCard } from '../components/share-card';

export function renderResult(container: HTMLElement, params: { session: Session; calibration?: boolean; recalibration?: boolean; unlocked?: string[] }) {
  const content = renderShell(container, { active: 'today', hideNav: true });
  const session = params.session;
  const isCalibration = !!params.calibration;
  const isRecalibration = !!params.recalibration;

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
  const streak = ds?.streak || 0;

  const fi = computeFokusIndex(storage.getDomains());
  const prevFi = previousFokusIndex(dsList, session.startedAt);
  const fiDelta = indexDelta(fi.value, prevFi);

  const history = storage.getHistory();
  const prevSession = history.length >= 2 ? history[history.length - 2] : null;
  const scoreDelta = prevSession ? totalScore - prevSession.score : 0;

  const profile = storage.getProfile();
  const xpNow = profile.xp || 0;
  const xpBefore = Math.max(0, xpNow - totalScore);
  const lvl = getLevelProgress(xpNow);
  const lvlBefore = getLevelProgress(xpBefore);
  const leveledUp = lvl.currentLevel > lvlBefore.currentLevel;

  const itemsHtml = session.items.map(item => {
    const ex = registry.find(r => r.manifest.id === item.exerciseId);
    const p = Math.round(item.performance || item.score * 10);
    const mBefore = item.masteryBefore || 0;
    const mAfter = item.masteryAfter || 0;
    const diffBefore = item.difficultyBefore || item.level;
    const diffAfter = item.difficultyAfter || item.level;
    const conf = item.confidenceAfter;

    const mDelta = mAfter - mBefore;
    const mSign = mDelta > 0 ? '+' : '';
    const dDelta = diffAfter - diffBefore;
    const dSign = dDelta > 0 ? '+' : '';

    const isLegacy = conf === undefined;
    const isCalibrating = isLegacy || conf < 20;

    let pState = item.progressionState;
    if (isCalibrating) pState = 'calibrating';
    else if (!pState) pState = mDelta > 0 ? 'up' : (mDelta < 0 ? 'down' : 'stable');

    let stateLabel = 'Стабильно';
    if (pState === 'up') stateLabel = '📈 Растёт';
    else if (pState === 'down') stateLabel = '📉 Падает';
    else if (pState === 'plateau') stateLabel = '➖ Плато';
    else if (pState === 'calibrating') stateLabel = '🔄 Калибровка';

    const confDisplay = isLegacy ? 'Н/Д' : `${Math.round(conf)}%`;
    const accPct = Math.round(item.accuracy * 100);

    return `
      <div class="result-block staggered-block">
        <div class="result-block-head">
          <div class="result-ex">${ex?.manifest.name}</div>
          <div class="result-score">+${Math.round(item.score)}</div>
        </div>
        <div class="result-sub">Точность ${accPct}% · Форма ${p}</div>
        <div class="result-grid">
          <div class="result-cell">
            <div class="muted">Мастерство</div>
            <div><b>${mAfter}</b> <span>${mDelta !== 0 ? `(${mSign}${mDelta})` : '(=)'}</span></div>
          </div>
          <div class="result-cell">
            <div class="muted">Сложность</div>
            <div><b>${Number(diffAfter).toFixed(1)}</b> <span>${dDelta !== 0 ? `(${dSign}${dDelta.toFixed(1)})` : '(=)'}</span></div>
          </div>
          <div class="result-cell">
            <div class="muted">Статус</div>
            <div>${stateLabel}</div>
          </div>
          <div class="result-cell">
            <div class="muted">Калибровка</div>
            <div>${confDisplay}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  let deltasHtml = Object.keys(deltas).map(k => {
    const d = deltas[k];
    const sign = d >= 0 ? '+' : '';
    const color = d >= 0 ? 'var(--ok)' : 'var(--danger)';
    return `<div class="delta-row">
      <span>${domainLabel(k)}</span>
      <span style="color: ${color}; font-weight: 600;">${sign}${Math.round(d)}</span>
    </div>`;
  }).join('');
  if (!deltasHtml) deltasHtml = '<div class="muted">Нет изменений</div>';

  const plan = planForNow({ durationSec: profile.sessionLengthSec || 300 });

  const nextItem = plan.items[0];
  const nextEx = nextItem ? registry.find(r => r.manifest.id === nextItem.exerciseId) : null;
  const nextHtml = nextEx ? `
    <div class="surface next-card">
      <h3>Следующий шаг</h3>
      <p class="next-name">${nextEx.manifest.name}</p>
      <p class="muted">${nextItem.reason}${nextItem.slot ? ' · ' + SLOT_LABEL[nextItem.slot] : ''}</p>
    </div>
  ` : '';

  const unlocked = (params.unlocked || [])
    .map(id => ACHIEVEMENTS_DEF.find(a => a.id === id))
    .filter(Boolean);
  const unlockedHtml = unlocked.length > 0 ? `
    <div class="surface unlock-row">
      ${unlocked.map(a => `<div class="unlock-chip"><span>${a!.icon}</span>${a!.name}</div>`).join('')}
    </div>
  ` : '';

  const compareHtml = prevSession
    ? `<div class="result-compare">${scoreDelta >= 0 ? '+' : ''}${Math.round(scoreDelta)} к прошлой сессии</div>`
    : '';

  content.innerHTML = `
    <div class="result-hero" style="animation: popIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;">
      <div class="result-kicker">${isCalibration ? 'Профиль готов' : isRecalibration ? 'Оценка обновлена' : 'Тренировка завершена'}</div>
      <div class="result-big"><span class="xp-counter">${Math.round(totalScore)}</span> <span style="font-size: 24px; color: var(--muted); vertical-align: middle;">XP</span></div>
      <div class="muted">${isCalibration ? 'стартовая оценка' : isRecalibration ? 'мягкая перекалибровка' : 'всего очков'}</div>
      <div class="result-acc">Средняя точность: <b>${avgAcc}%</b></div>
      ${compareHtml}
    </div>

    ${leveledUp ? `<div class="level-up">Новый уровень ${lvl.currentLevel}</div>` : ''}
    ${unlockedHtml}

    ${fi.coverage > 0 ? `
      <div class="fi-hero compact">
        <div class="fi-copy">
          <div class="fi-kicker">Fokus Index</div>
          <div class="fi-value">${fi.value}</div>
          <div class="fi-meta">${fiDelta.label}</div>
        </div>
        <div class="fi-radar">${renderRadarChart(fi.byDomain, { size: 160, max: 1200 })}</div>
      </div>
    ` : ''}

    <div class="surface">
      <h3>Сдвиги навыков</h3>
      ${deltasHtml}
    </div>

    <div class="surface">
      <h3>Результаты и прогресс</h3>
      ${itemsHtml}
    </div>

    ${nextHtml}

    <div class="result-actions">
      <button id="btn-share" class="btn-secondary" style="display:flex; align-items:center; justify-content:center;"><svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right:8px; vertical-align: middle;"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>Поделиться</button>
      <button id="btn-done" class="btn-primary">Готово</button>
    </div>
  `;

  content.querySelector('#btn-done')?.addEventListener('click', () => navigateTo('today'));
  content.querySelector('#btn-share')?.addEventListener('click', async () => {
    try {
      await shareSessionCard({
        score: totalScore,
        accuracy: avgAcc,
        streak,
        fokusIndex: fi.value,
        focus: plan.focusDomains.map(domainLabel).join(' · ')
      });
    } catch {
      /* user cancelled share */
    }
  });
}
