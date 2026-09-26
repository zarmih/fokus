import { navigateTo } from '../router';
import { renderShell } from '../shell';
import type { Session } from '../../core/types';
import { catalog, getManifest } from '../../exercises/catalog';
import { storage } from '../../core/storage';
import { planForNow } from '../../core/adaptive-plan';
import { SLOT_LABEL } from '../../core/engine';
import { getLevelProgress } from '../../core/xp';
import { ACHIEVEMENTS_DEF } from '../../core/achievements';
import { computeFokusIndex, previousFokusIndex, indexDelta } from '../../core/fokus-index';
import { domainLabel } from '../../core/labels';
import { renderRadarChart } from '../components/charts';
import { shareSessionCard } from '../components/share-card';
import { precisionLabel } from '../../core/calibration';
import { abilityCaption, pickTransferTip } from '../../core/onboarding';
import { setScreenTitle } from '../a11y';
import { animateCount, celebrate, playSessionCue } from '../../core/motion';
import { buildTransferSurface } from '../../core/transfer-insights';
import { loadContinuitySnapshot, getContinuityMessage } from '../../core/continuity';

export function renderResult(container: HTMLElement, params: { session: Session; calibration?: boolean; recalibration?: boolean; unlocked?: string[] }) {
  const content = renderShell(container, { active: 'program', hideNav: true });
  setScreenTitle(params.calibration ? 'Калибровка' : 'Результат');
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
    const ex = getManifest(item.exerciseId);
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
          <div class="result-ex">${ex?.name}</div>
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
            <div class="muted">Уверенность</div>
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

  const snapshot = profile.probeSnapshot;
  const probeHtml = isCalibration && snapshot ? `
    <div class="surface probe-summary">
      <h3>Стартовая оценка</h3>
      <p class="muted">${abilityCaption(snapshot)}</p>
      ${snapshot.domains.filter((d) => d.probed).map((d) => `
        <div class="delta-row">
          <span>${domainLabel(d.domain)}</span>
          <span>ур. ${d.startLevel.toFixed(1)} · ${precisionLabel(d.precision)}</span>
        </div>
      `).join('')}
    </div>
  ` : '';

  const transfer = pickTransferTip({
    primaryGoal: profile.primaryGoal,
    snapshot,
    cursor: profile.transferTipCursor
  });
  const transferHtml = isCalibration ? `
    <div class="surface transfer-card">
      <h3>${transfer.title}</h3>
      <p class="muted">${transfer.body}</p>
    </div>
  ` : '';

  const weekHtml = isCalibration && profile.firstWeekPlan ? `
    <div class="surface">
      <h3>Первая неделя</h3>
      <p class="muted">Мягкий разгон. Один пропуск прощается. Навёрстывать дни не нужно.</p>
      <div class="week-strip" aria-hidden="true">
        ${profile.firstWeekPlan.days.map((d) => `<span class="week-pill ${d.day === 1 ? 'now' : 'next'}">${d.day}</span>`).join('')}
      </div>
    </div>
  ` : '';

  const plan = planForNow({ durationSec: profile.sessionLengthSec || 300 });

  const nextItem = plan.items[0];
  const nextEx = nextItem ? getManifest(nextItem.exerciseId) : null;

  const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
  const noData = session.items.length === 0;
  const isEarlyExit = !noData && session.items.length <= 2 && !isCalibration && !isRecalibration;
  const isWeak = !noData && avgAcc < 70;
  const isSuccess = !noData && avgAcc >= 85;

  let primaryActionId = 'done';
  let primaryActionLabel = 'Готово';
  let primaryActionReason = '';
  let secondaryActionId = '';
  let secondaryActionLabel = '';

  if (noData) {
    primaryActionLabel = 'Программа';
    primaryActionReason = 'Нет данных о тренировке';
  } else if (isOffline) {
    primaryActionLabel = 'Готово';
    primaryActionReason = 'Офлайн (результаты сохранены)';
  } else if (isCalibration || isRecalibration) {
    primaryActionLabel = 'Завершить оценку';
    primaryActionReason = 'Профиль обновлен';
  } else if (isEarlyExit) {
    primaryActionId = 'next_skill';
    primaryActionLabel = nextEx ? `Дальше: ${nextEx.name}` : 'Продолжить';
    primaryActionReason = 'Короткая разминка, можно ещё';
    secondaryActionId = 'done';
    secondaryActionLabel = 'Вернуться позже';
  } else if (isWeak) {
    primaryActionId = 'done';
    primaryActionLabel = 'Сделать перерыв';
    primaryActionReason = 'Точность просела, рекомендуем отдых';
    secondaryActionId = 'repeat';
    secondaryActionLabel = 'Повторить (ещё раз)';
  } else if (isSuccess) {
    if (nextEx) {
      primaryActionId = 'next_skill';
      primaryActionLabel = `Дальше: ${nextEx.name}`;
      primaryActionReason = nextItem?.reason || 'Отличный ритм, идём дальше';
      secondaryActionId = 'done';
      secondaryActionLabel = 'На сегодня всё';
    } else {
      primaryActionLabel = 'Завершить на сегодня';
      primaryActionReason = 'План выполнен идеально';
    }
  } else {
    if (nextEx) {
      primaryActionId = 'next_skill';
      primaryActionLabel = `Дальше: ${nextEx.name}`;
      primaryActionReason = nextItem?.reason || 'Рабочий темп, можно продолжить';
      secondaryActionId = 'done';
      secondaryActionLabel = 'Закончить на сегодня';
    } else {
      primaryActionLabel = 'Завершить на сегодня';
      primaryActionReason = 'План выполнен. Отличная работа.';
    }
  }

  const continuity = loadContinuitySnapshot(storage, session.startedAt);
  const continuityMsg = getContinuityMessage(continuity);
  
  const showContinuity = !isCalibration && !isRecalibration && !noData && !isOffline;

  const nextActionHtml = `
    <div class="surface next-action-card" aria-labelledby="next-step-heading">
      ${isOffline ? `
        <div style="border-left: 4px solid var(--muted); padding-left: 12px; margin-bottom: 24px;">
          <h3 style="margin-bottom: 6px; font-size: 1.1rem; color: var(--text);">Тренировка сохранена</h3>
          <p class="muted" style="line-height: 1.4;">Вы офлайн. Результаты сохранены на устройстве и будут синхронизированы при подключении к сети.</p>
        </div>
      ` : showContinuity ? `
        <div style="border-left: 4px solid var(--ok); padding-left: 12px; margin-bottom: 24px;">
          <h3 id="next-step-heading" style="margin-bottom: 6px; font-size: 1.1rem; color: var(--text);">${continuityMsg.title}</h3>
          <p class="muted" style="margin-bottom: ${continuityMsg.actionHint ? '8px' : '0'}; line-height: 1.4;">${continuityMsg.body}</p>
          ${continuityMsg.actionHint ? `<div style="font-weight: 500; color: var(--ok); font-size: 14px;">${continuityMsg.actionHint}</div>` : ''}
        </div>
      ` : `<h3 id="next-step-heading" class="visually-hidden">Следующий шаг</h3>`}
      
      <p style="margin-bottom: 16px; font-weight: 600; font-size: 15px; text-align: center; color: var(--text);">${primaryActionReason}</p>
      <div class="result-actions" style="display:flex; gap:12px; flex-direction: column; align-items: stretch;">
        <button id="btn-primary-action" class="btn-primary" style="padding: 14px; font-size: 16px; font-weight: 600; border-radius: 12px;" data-action="${primaryActionId}">${primaryActionLabel}</button>
        ${secondaryActionId ? `<button id="btn-secondary-action" class="btn-secondary" style="padding: 12px; font-size: 15px; border-radius: 12px;" data-action="${secondaryActionId}">${secondaryActionLabel}</button>` : ''}
        <button id="btn-share" class="btn-secondary" style="display:flex; align-items:center; justify-content:center; padding: 12px; font-size: 15px; border-radius: 12px;" aria-label="Поделиться">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="margin-right:8px; vertical-align: middle;" aria-hidden="true"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg>
          Поделиться
        </button>
      </div>
    </div>
  `;

  const feedbackHtml = (!isCalibration && !isRecalibration && !noData && !isOffline) ? `
    <div class="surface feedback-loop-card" aria-label="Обратная связь">
      <h3>Как прошла тренировка?</h3>
      <p class="muted">Поможет точнее подбирать сложность (необязательно).</p>
      <div class="feedback-options" style="display:flex; gap:8px; margin-top:12px; flex-wrap: wrap;" role="group" aria-label="Оценка сложности">
        <button class="btn-secondary btn-feedback" data-val="easy">Слишком легко</button>
        <button class="btn-secondary btn-feedback" data-val="good">В самый раз</button>
        <button class="btn-secondary btn-feedback" data-val="hard">Слишком сложно</button>
      </div>
      <div id="feedback-thanks" style="display:none; color: var(--ok); margin-top:12px; font-weight: 500;" role="status">Спасибо! Учтём в следующем плане.</div>
    </div>
  ` : '';

  const surface = buildTransferSurface({
    sessions: storage.getSessions(),
    daySummaries: dsList,
    domains: storage.getDomains(),
    prefer: 'session'
  });

  const insightHtml = (!isCalibration && !isRecalibration && !noData && !isOffline) ? `
    <div class="surface transfer-insight-card" style="border-left: 4px solid var(--primary);">
      <h3>${surface.insight.title}</h3>
      <p class="muted">${surface.insight.body}</p>
      <div style="margin-top: 8px; font-weight: 500; color: var(--primary);">
        ${surface.insight.action}
      </div>
      ${surface.tip ? `
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; color: var(--muted); margin-bottom: 4px;">Связь с жизнью</div>
          <div><b>${surface.tip.situation}</b> — ${surface.tip.practiceLink}</div>
        </div>
      ` : ''}
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
    <div class="result-hero fx-celebrate" id="result-hero">
      <div class="result-kicker">${isCalibration ? 'Профиль готов' : isRecalibration ? 'Оценка обновлена' : 'Тренировка завершена'}</div>
      <div class="result-big"><span class="xp-counter" id="xp-counter" data-xp="${Math.round(totalScore)}">${Math.round(totalScore)}</span> <span style="font-size: 24px; color: var(--muted); vertical-align: middle;">XP</span></div>
      <div class="muted">${isCalibration ? 'стартовая оценка · не IQ' : isRecalibration ? 'мягкая перекалибровка' : 'всего очков'}</div>
      <div class="result-acc">Средняя точность: <b>${avgAcc}%</b></div>
      ${compareHtml}
    </div>

    ${leveledUp ? `<div class="level-up fx-celebrate">Новый уровень ${lvl.currentLevel}</div>` : ''}
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

    ${probeHtml}

    ${isCalibration ? '' : `<div class="surface">
      <h3>Сдвиги навыков</h3>
      ${deltasHtml}
    </div>`}

    ${transferHtml}
    ${weekHtml}

    <div class="surface">
      <h3>Результаты и прогресс</h3>
      ${itemsHtml}
    </div>

    ${insightHtml}
    ${feedbackHtml}
    ${nextActionHtml}
  `;

  const hero = content.querySelector('#result-hero') as HTMLElement | null;
  if (hero) celebrate(hero);
  const xpEl = content.querySelector('#xp-counter') as HTMLElement | null;
  if (xpEl) animateCount(xpEl, totalScore);
  playSessionCue(leveledUp || unlocked.length > 0 ? 'celebrate' : 'ritual');

  const handleAction = (actionId: string) => {
    if (actionId === 'repeat') {
      navigateTo('session', { mode: 'normal', items: session.items.map(i => ({ exerciseId: i.exerciseId })), durationSec: 300 });
    } else {
      navigateTo('program');
    }
  };

  content.querySelector('#btn-primary-action')?.addEventListener('click', (e) => {
    handleAction((e.currentTarget as HTMLElement).dataset.action || 'done');
  });
  content.querySelector('#btn-secondary-action')?.addEventListener('click', (e) => {
    handleAction((e.currentTarget as HTMLElement).dataset.action || 'done');
  });

  const feedbackButtons = content.querySelectorAll('.btn-feedback');
  feedbackButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const val = (e.currentTarget as HTMLElement).dataset.val;
      const p = storage.getProfile();
      (p as any).lastFeedback = { val, date: new Date().toISOString() };
      storage.setProfile(p);

      feedbackButtons.forEach(b => (b as HTMLElement).style.display = 'none');
      const thanks = content.querySelector('#feedback-thanks') as HTMLElement | null;
      if (thanks) thanks.style.display = 'block';
    });
  });

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
