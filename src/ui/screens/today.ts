import { storage } from '../../core/storage';
import { exerciseIconSrc } from '../exercise-icon';
import { catalog, getManifest } from '../../exercises/catalog';
import { bindDialog } from '../a11y';
import { abilityTrendChip } from '../../core/adaptive-depth';
import { computeAbilityTrajectory } from '../../core/ability-trajectory';
import { planToday, PRIMARY_CTA, primaryCta, budgetReason, type DailyPlan } from '../../core/daily-plan';
import { L, getLocale } from '../../core/i18n';
import { planReasonText, slotLabelText } from '../../core/plan-copy';
export { PRIMARY_CTA };
import { applyGentleReturnBias, loadContinuitySnapshot, ritualDurationSec } from '../../core/continuity';
import { navigateTo } from '../router';
import { planForNow, snoozeRecalibration, getProgramPosition } from '../../core/adaptive-plan';
import { phaseForWeek } from '../../core/program-phases';
import { fillRenderedSlotAlternatives } from '../../core/session-builder';
import { SLOT_LABEL, isRecalibrationActive } from '../../core/engine';
import { renderShell } from '../shell';
import { getLevelProgress } from '../../core/xp';
import { getDailyQuests, questTitle, questDescription } from '../../core/quests';
import { isCoreExercise, inCoreProgram } from '../../core/core-catalog';
import { generateInsights } from '../../core/insights';
import { suggestFocusOfTheWeek } from '../../core/transfer-insights';
import { transferCardFromStorage } from '../components/transfer-card';
import { getDailySpark, getQuietCoachTip } from '../../core/coach';
import { buildCoachIntel } from '../../core/coach-intel';
import { computeFokusIndex, previousFokusIndex, indexDelta } from '../../core/fokus-index';
import { domainLabel, leagueName } from '../../core/labels';
import { renderRadarChart } from '../components/charts';
import { renderQualityCard } from '../components/quality-card';
import { calibrationSessionItems } from '../../core/calibration';
import { getTodayRitual, dayLabel } from '../../core/onboarding';
import { exerciseName } from '../../core/exercise-copy';
import { bindLifestyleField, lifestyleCheckinHtml } from '../components/lifestyle-checkin';
import { questProgressBarHtml } from '../components/accessible-markup';
import { assessRetention, describeProgramRetention } from '../../core/retention';
import { explainTodayPlan, applyRetentionRitualOrder, emptyPlanCopy, applySlotSnooze } from '../../core/today-plan';
import { softReturnInstallCopy } from '../../core/reminders';
import { enterStage } from '../../core/motion';
import { renderContinuityHint, renderStreakChip } from '../components/habit-continuity';
import { calendarDayKey, fokusWallHour, resolveFokusTimeZone } from '../../core/streak';
import { quietNormsHintFromSessions, quietNormsHintDisclaimerRu } from '../../core/norms-hint';

export function renderToday(container: HTMLElement, cachedState?: any) {
  const content = renderShell(container, { active: 'today' });
  const profile = storage.getProfile();
  const lvl = getLevelProgress(profile.xp || 0);
  const greetName = profile.displayName || (profile.name !== 'User' ? profile.name : '');

  const ds = storage.getDaySummaries();
  const snap = loadContinuitySnapshot(storage);
  const todayStr = snap.today;
  const playedToday = snap.streak.playedToday;
  const streak = snap.streak.current;
  const skippedYesterday = snap.streak.openMisses === 1;
  const gapDays = snap.streak.openMisses;

  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();
  const sessions = storage.getSessions();
  const intel = buildCoachIntel({ summaries: ds, domains, asOf: new Date().toISOString() });
  const insights = generateInsights(domains, skills, states, ds, sessions);
  if (gapDays >= 2 && !playedToday) {
    insights.unshift({
      title: 'С возвращением',
      description: 'Пауза — обычная часть ритма. Fokus подобрал короткий знакомый старт — без наверстывания и без давления.',
      confidence: 'high',
      type: 'recovery',
      priority: 100
    });
  }
  const topInsight = insights[0];
  const weeklyFocus = suggestFocusOfTheWeek(domains, ds, sessions);
  const weekRitual = getTodayRitual(profile.firstWeekPlan, todayStr, ds);
  const coachTarget = topInsight?.domainId || intel.weakDomainId || profile.primaryGoal;
  const targetGoal = weeklyFocus?.domain || (weekRitual.ritualDay && weekRitual.ritualDay.focusDomains[0]) || coachTarget;
  const baseDuration = weekRitual.inFirstWeek && weekRitual.ritualDay
    ? weekRitual.ritualDay.durationSec
    : profile.sessionLengthSec;
  const durationSec = ritualDurationSec(baseDuration, snap.ritual);

  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const unfinishedSession = lastSession && lastSession.finishedAt === null && calendarDayKey(lastSession.startedAt, snap.timeZone) === todayStr ? lastSession : null;
  const effectiveDurationSec = unfinishedSession
    ? Math.max(60, (unfinishedSession.plannedDurationSec || durationSec) - (unfinishedSession.durationSec || 0))
    : durationSec;


  let plan: { items: any[]; focusDomains: string[] } = { items: [], focusDomains: [] };
  let ritualDuration = effectiveDurationSec;
  let recal: any = { probe: [] as any[], forced: false, summary: '' };
  let depth = { chip: null as any, why: null as string | null, ritual: null as any, trajectory: null as any };
  let ritual: any = null;
  let dailyPlan: DailyPlan | null = null;
  let errorState = false;
  let noPlanState = false;
  let snoozeApplied = false;
  
  if (cachedState) {
    plan = cachedState.plan;
    ritualDuration = cachedState.ritualDuration;
    recal = cachedState.recal;
    depth = cachedState.depth;
    ritual = cachedState.ritual;
    dailyPlan = cachedState.dailyPlan ?? null;
    errorState = cachedState.errorState;
    noPlanState = cachedState.noPlanState;
    snoozeApplied = cachedState.snoozeApplied || false;
  } else {

  try {
    // One plan for what is shown, explained and played (core/daily-plan.ts).
    const daily = planToday({
      excludeIds: unfinishedSession ? unfinishedSession.items.map((i: any) => i.exerciseId) : [],
      resumeSec: unfinishedSession ? effectiveDurationSec : undefined
    });
    dailyPlan = daily;
    ritual = { plan: { items: daily.items, focusDomains: daily.focusDomains }, snapshot: daily.recovery, recalibration: daily.recalibration };
    plan = { items: daily.items.map((it) => ({ ...it })), focusDomains: daily.focusDomains };
    ritualDuration = daily.durationSec;
    recal = daily.recalibration;
    let trajectory: any = null;
    try {
      trajectory = computeAbilityTrajectory({
        sessions,
        domains,
        catalog: catalog.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain }))
      });
    } catch {
      trajectory = null;
    }
    depth = { chip: trajectory ? abilityTrendChip(trajectory) : null, why: daily.why, ritual: null, trajectory };

    if (plan.items.length === 0) {
      noPlanState = true;
    } else {
      plan.items = fillRenderedSlotAlternatives(plan.items, catalog);
    }
  } catch (err) {
    console.error('Plan generation error:', err);
    errorState = true;
  }

  try {
    const snoozeRaw = localStorage.getItem('fokus-slot-snooze');
    if (snoozeRaw) {
      const snoozeData = JSON.parse(snoozeRaw);
      if (snoozeData.date === todayStr && snoozeData.exerciseId) {
        const res = applySlotSnooze(plan.items, snoozeData.exerciseId);
        if (res.applied) {
          plan.items = res.items;
          snoozeApplied = true;
        }
      }
    }
  } catch (e) {}

  }
  const trendChipHtml = depth.chip
    ? `<div class="ability-trend-chip chip dom-${depth.chip.domain}" role="status" aria-label="${depth.chip.aria}">${depth.chip.label}</div>`
    : '';
  const budgetWhyHtml = dailyPlan
    ? `<p class="plan-budget-why" data-budget-source="${dailyPlan.budgetSource}" data-program-day="${dailyPlan.programDay}" style="font-size: 13px; opacity: 0.85; margin-bottom: 12px;">${dailyPlan.why} ${L('Длительность', 'Length')}: ${budgetReason(dailyPlan.budgetSource)}.</p>`
    : '';
  const ritualWhyHtml = depth.why
    ? `<p class="ritual-why">${depth.why}</p>`
    : '';

  const showRecal = profile.calibrated && isRecalibrationActive(recal);

  const fi = computeFokusIndex(domains);
  const prevFi = previousFokusIndex(ds, new Date().toISOString(), 7);
  const fiDelta = indexDelta(fi.value, prevFi, 7);

  const focusText = plan.focusDomains.length > 0
    ? plan.focusDomains.map(d => domainLabel(d)).join(' + ')
    : L('Сбалансированная тренировка', 'Balanced workout');

  // Skill whose gradient tints the workout card (first focus domain, else first exercise's domain).
  const focusSkill = plan.focusDomains[0] || (plan.items[0] ? getManifest(plan.items[0].exerciseId)?.domain : undefined);
  const skillClass = focusSkill ? `dom-${focusSkill}` : '';

  const compositionHtml = plan.items.map((item, index) => {
    const r = getManifest(item.exerciseId);
    const isPrimary = index === 0;
    const slot = item.slot ? slotLabelText(SLOT_LABEL[item.slot as keyof typeof SLOT_LABEL]) : '';
    return `<div class="chip dom-${r?.domain} workout-chip ${isPrimary ? 'primary' : ''}" role="listitem" data-exercise-id="${item.exerciseId}" style="display: flex; flex-direction: column; align-items: flex-start; padding: 12px 14px 12px 18px; gap: 6px; height: auto; border-radius: 12px; width: 100%; box-sizing: border-box;">
      <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
        <img src="${exerciseIconSrc(r?.id, r?.domain)}" width="20" height="20" alt="" decoding="async" style="border-radius: 6px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));">
        <span style="font-weight: 700; font-size: 14px; flex: 1;">${r ? exerciseName(r) : ''}</span>
        ${slot ? `<span class="slot-tag" style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background: var(--bg-elev); padding: 4px 8px; border-radius: 8px; color: var(--muted); border: 1px solid var(--line);">${slot}</span>` : ''}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; width: 100%;">
        <div style="font-size: 12px; opacity: 0.9; line-height: 1.4; font-weight: 500;">${planReasonText(item.reason)}</div>
        <div style="display: flex; gap: 6px;">
          ${(plan.items.length > 1 && item.exerciseId) ? `<button type="button" data-snooze-slot="${index}" style="font-size: 11px; padding: 2px 6px; background: transparent; border: 1px solid var(--line); border-radius: 4px; color: var(--text); cursor: pointer;">${L('Не сегодня', 'Not today')}</button>` : ''}
          ${(item.nextExerciseId && !item.rerolled) ? `<button type="button" data-reroll-slot="${index}" style="font-size: 11px; padding: 2px 6px; background: transparent; border: 1px solid var(--line); border-radius: 4px; color: var(--text); cursor: pointer;">${L('Другой вариант', 'Swap')}</button>` : ''}
        </div>
      </div>
    </div>`;

  }).join('');

  const hour = fokusWallHour();
  const hello = hour < 12 ? L('Доброе утро', 'Good morning') : hour < 18 ? L('Добрый день', 'Good afternoon') : L('Добрый вечер', 'Good evening');
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', timeZone: resolveFokusTimeZone().timeZone };
  const dateStr = new Date().toLocaleDateString(getLocale() === 'en' ? 'en-GB' : 'ru-RU', dateOptions);

  const shieldCharges = typeof (profile as { shieldCharges?: number }).shieldCharges === 'number'
    ? (profile as { shieldCharges?: number }).shieldCharges
    : undefined;

  let retSnap = null as ReturnType<typeof assessRetention> | null;
  let programRetView = null as ReturnType<typeof describeProgramRetention> | null;
  try {
    retSnap = assessRetention({
      daySummaries: ds,
      sessions,
      domains,
      playedToday,
      streak,
      skippedYesterday,
      sessionLengthSec: profile.sessionLengthSec,
      shieldCharges
    });
    programRetView = describeProgramRetention(retSnap, {
      profileLengthSec: profile.sessionLengthSec,
      softReturnActive: snap.ritual.active,
      playedToday
    });
  } catch {
    retSnap = null;
    programRetView = null;
  }

  const { weekIndex } = getProgramPosition(snap, profile as any);
  const phaseId = phaseForWeek(weekIndex).id;
  const fatigueOrChurn = snap.workload.fatigued.length > 0 || (retSnap && (retSnap.band === 'at_risk' || retSnap.band === 'critical')) || false;

  const quietTip = retSnap ? getQuietCoachTip({
    continuity: snap,
    retention: retSnap,
    programPhase: phaseId,
    inFirstWeek: weekRitual.inFirstWeek,
    playedToday
  }) : null;

  const planExplain = retSnap
    ? explainTodayPlan({
        calibrated: !!profile.calibrated,
        playedToday,
        continuity: snap,
        retention: retSnap,
        programRetention: programRetView,
        focusDomains: plan.focusDomains,
        planItems: plan.items,
        adaptiveWhy: depth.why,
        recoveryHint: ritual?.snapshot?.gate?.active ? (ritual.snapshot.gate.reason || ritual.snapshot.hint?.body) : null,
        weekRitualCopy: weekRitual.copy || null,
        inFirstWeek: weekRitual.inFirstWeek,
        weekRitual,
        programPhase: phaseId,
        fatigueOrChurn,
        primaryGoal: profile.primaryGoal,
        quietTip
      })
    : null;

  // Shared story wins; fall back to legacy spark only if retention assess failed.
  const enCopy = getLocale() === 'en';
  const rawSpark = planExplain
    ? { title: planExplain.title, body: planExplain.body, tone: planExplain.tone, quietTip: planExplain.quietTip }
    : getDailySpark({
        domains,
        skills,
        states,
        daySummaries: ds,
        sessions,
        calibrated: !!profile.calibrated,
        playedToday,
        streak,
        skippedYesterday,
        primaryGoal: profile.primaryGoal,
        focusDomains: plan.focusDomains,
        shieldCharges,
        trajectory: depth.trajectory,
        topInsight,
        continuity: snap,
        adaptiveWhy: depth.why,
        planItems: plan.items,
        weekRitual
      });
  // Un-hide coach prose / spark / quiet tip in English for core exercises and 14-day core program.
  const isCore = !profile.calibrated || inCoreProgram(dailyPlan?.programDay ?? 1) || plan.items.length === 0 || plan.items.some((it) => it.exerciseId && isCoreExercise(it.exerciseId));
  const spark = enCopy && !isCore ? { ...rawSpark, title: 'Today', body: '', quietTip: undefined } : rawSpark;
  const sparkTitle = spark.title;

  const catalogRefsNorms = catalog.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain }));
  const normsHint = profile.calibrated
    ? quietNormsHintFromSessions(sessions, catalogRefsNorms, plan.focusDomains.length ? plan.focusDomains : (targetGoal ? [targetGoal] : null))
    : null;
  const normsHintHtml = normsHint
    ? `<p class="norms-quiet-hint" data-local-norms="1" title="${quietNormsHintDisclaimerRu().replace(/"/g, '&quot;')}" style="margin: 8px 0 0; font-size: 13px; color: var(--muted); line-height: 1.4;">${normsHint}</p>`
    : '';

  const transferCardHtml = transferCardFromStorage({ prefer: playedToday ? 'session' : 'week' });
  let retentionHtml = '';
  if (profile.calibrated && planExplain?.rhythmLine && retSnap && retSnap.confidence >= 20) {
    retentionHtml = `<p class="rhythm-line band-${planExplain.band}" data-rhythm="${planExplain.rhythm}" data-plan-source="${planExplain.source}">${planExplain.rhythmLine}</p>`;
  }
  void ritualWhyHtml;


  const weekHtml = profile.calibrated && weekRitual.inFirstWeek && weekRitual.ritualDay ? `
    <div class="week-card" aria-label="${L(`Первая неделя, день ${weekRitual.day} из 7`, `First week, day ${weekRitual.day} of 7`)}">
      <div class="week-kicker">${L(`Первая неделя · день ${weekRitual.day} из 7`, `First week · day ${weekRitual.day} of 7`)} · ${dayLabel(weekRitual.ritualDay.label)}</div>
      <div class="week-strip" role="list">
        ${profile.firstWeekPlan!.days.map((d) => {
          const state = d.day < (weekRitual.day || 0) ? 'past' : d.day === weekRitual.day ? 'now' : 'next';
          return `<span class="week-pill ${state}" role="listitem" aria-current="${state === 'now' ? 'step' : 'false'}">${d.day}</span>`;
        }).join('')}
      </div>
      <p class="week-note">${weekRitual.copy}</p>
    </div>
  ` : '';

  const quests = getDailyQuests({
    focusDomains: plan.focusDomains,
    firstWeekFocus: weekRitual.ritualDay?.focusDomains?.[0] || null,
    inFirstWeek: weekRitual.inFirstWeek,
    firstWeekDay: weekRitual.day
  });
  const questsHtml = `
    <div class="surface quests-card">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
        <h3 style="margin: 0;">${L('Задачи дня', 'Daily Quests')}</h3>
      </div>
      ${quests.map((q: any) => {
        const pct = Math.min(100, (q.progress / q.target) * 100);
        const diffLabel = q.difficulty === 'hard' ? L('Сложно', 'Hard') : q.difficulty === 'easy' ? L('Легко', 'Easy') : L('Средне', 'Medium');
        const diffColor = q.difficulty === 'hard' ? 'var(--accent-2)' : q.difficulty === 'easy' ? 'var(--ok)' : 'var(--accent)';
        const title = questTitle(q);
        const description = questDescription(q);
        return `
          <div class="quest-row" style="margin-bottom: 16px;" role="group" aria-label="${title}. ${description}. ${q.completed ? L('Выполнено', 'Completed') : `${L('Прогресс', 'Progress')} ${q.progress} ${L('из', 'of')} ${q.target}`}">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <div class="quest-title ${q.completed ? 'done' : ''}" style="font-weight: 700; font-size: 15px;">
                  ${title}
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-left: 6px; color: ${diffColor}; opacity: 0.8;">${diffLabel}</span>
                </div>
                <div class="quest-desc" style="font-size: 13px; opacity: 0.7; margin-top: 2px;">${description}</div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                ${q.completed ? `
                  <span style="font-size: 12px; font-weight: 700; color: var(--ok);">${L('Выполнено', 'Done')}</span>
                ` : `
                  <div class="quest-count" style="font-size: 14px; font-weight: 600;">${q.progress}/${q.target}</div>
                `}
              </div>
            </div>
            ${!q.completed ? questProgressBarHtml(q, pct) : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;

  let heroHtml = '';
  if (profile.calibrated && fi.coverage > 0) {
    heroHtml = `
      <div class="fi-hero">
        <div class="fi-copy">
          <div class="fi-kicker">Fokus Index</div>
          <div class="fi-value">${fi.value}</div>
          <div class="fi-meta">${fiDelta.label} · ${fi.coverage} из 5 областей</div>
        </div>
        <div class="fi-radar">${renderRadarChart(fi.byDomain, { size: 180, max: 1200 })}</div>
      </div>
    `;
  }

  const recalHtml = showRecal ? `
    <div class="workout-card recal-card">
      <div class="workout-kicker">Мягкая перекалибровка</div>
      <h3>Обновить оценку</h3>
      <p>${recal.summary || 'Короткая сверка, чтобы сложность снова попала в зону вызова. Серия не сбрасывается.'}</p>
      <div class="recal-actions">
        <button id="btn-recal" class="btn-primary" type="button">Пройти (~90 сек)</button>
        <button id="btn-recal-later" class="btn-secondary" type="button">Позже</button>
      </div>
    </div>
  ` : '';

  const offlineCopy = emptyPlanCopy('offline');
  const noPlanCopy = emptyPlanCopy('no_plan');
  let actionHtml = '';
  const isLoading = catalog.length === 0;

  if (isLoading) {
    actionHtml = `
      <div class="workout-card loading-state" role="region" aria-label="Загрузка плана" aria-live="polite" aria-busy="true">
        <div class="workout-kicker">Загрузка</div>
        <h3>Собираем план...</h3>
        <p>Fokus анализирует вашу активность.</p>
        <button class="btn-primary" type="button" disabled aria-disabled="true" style="width: 100%;">Подождите</button>
      </div>
    `;
  } else if (errorState) {
    actionHtml = `
      <div class="workout-card error-state" role="region" aria-label="Ошибка создания плана" aria-live="assertive">
        <div class="workout-kicker">Ошибка</div>
        <h3>Что-то пошло не так</h3>
        <p>Не удалось составить персональную сессию. Попробуйте обновить страницу.</p>
        <button id="btn-retry" class="btn-secondary" type="button" style="width: 100%;">Обновить</button>
      </div>
    `;
  } else if (!navigator.onLine) {
    actionHtml = `
      <div class="workout-card offline-card fx-enter" role="region" aria-labelledby="cta-offline-title" aria-live="polite" tabindex="-1" style="background: var(--surface-2); border-left: 4px solid var(--muted);">
        <div class="workout-kicker">${offlineCopy.kicker}</div>
        <h3 id="cta-offline-title">${offlineCopy.title}</h3>
        <p>${offlineCopy.body}</p>
        <button id="btn-retry" class="btn-secondary" type="button" style="width: 100%; margin-top: 8px;">${offlineCopy.cta}</button>
      </div>
    `;
  } else if (!profile.calibrated) {
    actionHtml = `
      <div class="workout-card fx-enter coach-${spark.tone}" role="region" aria-label="${L('Старт калибровки', 'Start calibration')}">
        <div class="workout-kicker">${spark.title}</div>
        <h3>${L('Калибровка уровня', 'Level calibration')}</h3>
        <p class="workout-coach-insight">${spark.body}</p>
        ${spark.quietTip ? `<p class="coach-quiet-tip" style="margin-top: 12px; font-size: 13px; opacity: 0.85; color: var(--accent-ink); font-weight: 500;">${spark.quietTip}</p>` : ''}
        <button id="btn-start" class="btn-primary" type="button" style="margin-top: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding-left: 20px; padding-right: 20px;">
          <span>${L('Пройти калибровку', 'Start calibration')}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
    `;
  } else if (unfinishedSession) {
    actionHtml = `
      <div class="workout-card fx-enter coach-${spark.tone} ${skillClass}" role="region" aria-labelledby="cta-resume-title">
        <div class="workout-kicker" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          ${L('Возвращение к сессии', 'Back to your session')}
        </div>
        <h3 id="cta-resume-title" style="font-size: 22px; margin-bottom: 4px; letter-spacing: -0.02em;">${L('Продолжить с того места', 'Pick up where you left off')}</h3>
        <p style="font-size: 14px; font-weight: 600; color: var(--accent-ink); margin-bottom: 12px;">
          ${L(`Осталось ${Math.floor(ritualDuration / 60)} минут`, `${Math.floor(ritualDuration / 60)} min left`)} &middot; ${focusText}
        </p>
        ${budgetWhyHtml}
        <p class="workout-coach-insight" style="line-height: 1.5; color: var(--text); opacity: 0.9; margin-bottom: 16px;">${L('Вы уже начали эту тренировку сегодня. Продолжаем.', 'You already started this workout today. Let’s continue.')}</p>
        ${spark.quietTip ? `<p class="coach-quiet-tip" style="margin-bottom: 16px; font-size: 13px; opacity: 0.85; color: var(--accent-ink); font-weight: 500;">${spark.quietTip}</p>` : ''}
        <div class="workout-chips" role="list" aria-label="${L('Оставшиеся упражнения', 'Remaining exercises')}" style="display: flex; flex-direction: column; gap: 8px;">${compositionHtml}</div>
        ${snoozeApplied ? `<p data-slot-snooze="1" style="margin-top: 12px; margin-bottom: 4px; font-size: 13px; opacity: 0.85; color: var(--text);">${L('Это упражнение вернётся завтра. Сегодняшний план от этого не ломается.', 'This exercise comes back tomorrow. Today’s plan still works.')}</p>` : ''}
        <button id="btn-start" class="btn-primary" type="button" style="margin-top: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding-left: 20px; padding-right: 20px;">
          <span>${L('Продолжить тренировку', 'Continue workout')}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
        <button id="btn-restart" class="btn-secondary" type="button" style="margin-top: 8px; width: 100%;">${L('Начать заново', 'Start over')}</button>
      </div>
    `;
  } else if (playedToday) {
    actionHtml = `
      <div class="workout-card done fx-celebrate coach-${spark.tone}" role="region" aria-label="${L('Тренировка выполнена', 'Workout done')}">
        <div class="workout-kicker">${spark.title}</div>
        <h3>${L('План выполнен', 'Plan done')}</h3>
        ${trendChipHtml}
        <p class="workout-coach-insight">${spark.body}</p>
        ${spark.quietTip ? `<p class="coach-quiet-tip" style="margin-top: 12px; font-size: 13px; opacity: 0.85; color: var(--accent-ink); font-weight: 500;">${spark.quietTip}</p>` : ''}
        <button id="btn-start" class="btn-secondary" type="button" style="width: 100%; margin-top: 8px;">${L('Ещё одна сессия', 'One more session')}</button>
      </div>
    `;
  } else if (noPlanState) {
    actionHtml = `
      <div class="workout-card done fx-enter" role="region" aria-label="Сессия недоступна" aria-live="polite">
        <div class="workout-kicker">${noPlanCopy.kicker}</div>
        <h3>${noPlanCopy.title}</h3>
        <p>${noPlanCopy.body}</p>
        <button class="btn-secondary" type="button" disabled aria-disabled="true" style="width: 100%;">${noPlanCopy.cta}</button>
      </div>
    `;
  } else if (snap.ritual.active) {
    const returnFocus = plan.focusDomains.length > 0
      ? plan.focusDomains.map(d => domainLabel(d)).join(', ')
      : L('знакомые области', 'familiar areas');
    actionHtml = `
      <div class="workout-card fx-enter coach-${spark.tone} ${skillClass}" role="region" aria-labelledby="cta-return-title">
        <div class="workout-kicker" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          ${spark.title}
        </div>
        <h3 id="cta-return-title" style="font-size: 22px; margin-bottom: 4px; letter-spacing: -0.02em;">${planExplain?.source === 'soft_return' && planExplain.title ? enCopy ? 'Easy return' : planExplain.title : L('Мягкое возвращение', 'Easy return')}</h3>
        <p style="font-size: 14px; font-weight: 600; color: var(--accent-2); margin-bottom: 12px;">
          ${Math.floor(ritualDuration / 60)} ${L('минут', 'min')} &middot; ${returnFocus}
        </p>
        ${budgetWhyHtml}
        <p class="workout-coach-insight" style="line-height: 1.5; color: var(--text); opacity: 0.9; margin-bottom: 16px;">${spark.body}</p>
        ${spark.quietTip ? `<p class="coach-quiet-tip" style="margin-bottom: 16px; font-size: 13px; opacity: 0.85; color: var(--accent-ink); font-weight: 500;">${spark.quietTip}</p>` : ''}
        <div class="workout-chips" role="list" aria-label="${L('Упражнения для мягкого старта', 'Exercises for an easy start')}" style="display: flex; flex-direction: column; gap: 8px;">${compositionHtml}</div>
        ${snoozeApplied ? `<p data-slot-snooze="1" style="margin-top: 12px; margin-bottom: 4px; font-size: 13px; opacity: 0.85; color: var(--text);">${L('Это упражнение вернётся завтра. Сегодняшний план от этого не ломается.', 'This exercise comes back tomorrow. Today’s plan still works.')}</p>` : ''}
        <button id="btn-start" class="btn-primary" type="button" style="margin-top: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding-left: 20px; padding-right: 20px;">
          <span>${primaryCta()}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
    `;
  } else {
    const rest = ritual?.snapshot?.gate?.active;
    const finalKicker = rest ? L('Сегодня легче', 'Lighter today') : sparkTitle;
    actionHtml = `
      <div class="workout-card fx-enter ${rest ? 'rest-light' : ''} coach-${spark.tone} ${skillClass}" role="region" aria-labelledby="cta-today-title">
        <div class="workout-kicker" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px; vertical-align: text-bottom;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${finalKicker}
        </div>
        <h3 id="cta-today-title" style="font-size: 22px; margin-bottom: 4px; letter-spacing: -0.02em;">${planExplain?.source === 'first_week' && planExplain.title ? planExplain.title : L('Тренировка дня', 'Workout of the day')}</h3>
        <p data-plan-focus="${plan.focusDomains.join(',')}" style="font-size: 14px; font-weight: 600; color: var(--accent-ink); margin-bottom: 12px;">
          ${Math.floor(ritualDuration / 60)} ${L('минут', 'min')} &middot; ${focusText}
        </p>
        ${budgetWhyHtml}
        ${trendChipHtml ? `<div style="margin-bottom: 12px;">${trendChipHtml}</div>` : ''}
        <p class="workout-coach-insight" style="line-height: 1.5; color: var(--text); opacity: 0.9; margin-bottom: 8px;">${spark.body}</p>
        ${spark.quietTip ? `<p class="coach-quiet-tip" style="margin-bottom: 16px; font-size: 13px; opacity: 0.85; color: var(--accent-ink); font-weight: 500;">${spark.quietTip}</p>` : ''}
        ${planExplain && planExplain.recoveryPath && planExplain.whyExercises && planExplain.whyExercises !== spark.body ? `<p class="plan-why" data-plan-source="${planExplain.source}" style="margin-bottom: 16px; font-size: 13px; opacity: 0.85;">${planExplain.whyExercises}</p>` : (spark.quietTip ? '' : '<div style="margin-bottom: 8px;"></div>')}
        <div class="workout-chips" role="list" aria-label="${L('Упражнения на сегодня', 'Today’s exercises')}" style="display: flex; flex-direction: column; gap: 8px;">${compositionHtml}</div>
        ${snoozeApplied ? `<p data-slot-snooze="1" style="margin-top: 12px; margin-bottom: 4px; font-size: 13px; opacity: 0.85; color: var(--text);">${L('Это упражнение вернётся завтра. Сегодняшний план от этого не ломается.', 'This exercise comes back tomorrow. Today’s plan still works.')}</p>` : ''}
        <button id="btn-start" class="btn-primary" type="button" style="margin-top: 8px; width: 100%; display: flex; justify-content: space-between; align-items: center; padding-left: 20px; padding-right: 20px;">
          <span>${primaryCta()}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="today-head">
      <h2>${hello}${greetName ? ', <span class="greet-name">' + greetName + '</span>' : ''}</h2>
      <p class="today-date">${dateStr}</p>
    </div>

    ${enCopy ? '' : (heroHtml)}

    ${enCopy ? '' : (ritual ? renderQualityCard(ritual.snapshot) : '')}
    ${recalHtml}

    ${actionHtml}
    ${normsHintHtml}

    ${weekHtml}

    ${(() => { const ic = softReturnInstallCopy(snap.ritual.active); return `
    <div class="surface install-card" id="today-install-card" data-soft-return="${snap.ritual.active ? '1' : '0'}" role="region" aria-labelledby="install-title" style="display: none; margin-bottom: 16px; border-left: 4px solid var(--ok); background: var(--surface-2);">
      <h3 id="install-title" style="margin-bottom: 4px; font-size: 16px; letter-spacing: -0.01em;">${ic.title}</h3>
      <p class="muted" style="margin-bottom: 12px; font-size: 14px; line-height: 1.4;">${ic.body}</p>
      <button id="btn-today-install" class="btn-primary" type="button" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        ${ic.cta}
      </button>
    </div>`; })()}

    <div class="dashboard-widgets">
      <div class="stat-row">
        ${renderStreakChip(snap, 'pill')}
        <div class="stat-pill">
          <div class="stat-num">${streak > 0 ? streak : (snap.streak.consistency30 > 0 ? snap.streak.consistency30 + '%' : 0)}${profile.seriesGoalDays ? ` <span style="font-size: 16px; opacity: 0.5;">/ ${profile.seriesGoalDays}</span>` : ''}</div>
          <div class="stat-lbl">${profile.seriesGoalDays ? L('цель серии', 'streak goal') : (streak > 0 ? L('дней подряд', 'days in a row') : (snap.streak.consistency30 > 0 ? L('регулярность', 'consistency') : L('начни серию', 'start a streak')))}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-num">${lvl.currentLevel}</div>
          <div class="stat-lbl">${leagueName(lvl.currentLevel)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-num">${Math.round(lvl.progressPct)}%</div>
          <div class="stat-lbl">${L('до ур.', 'to lvl')} ${lvl.currentLevel + 1}</div>
        </div>
      </div>
      ${renderContinuityHint(snap, 'today')}
      ${retentionHtml}


      ${enCopy ? '' : (snap.ritual.active ? '' : transferCardHtml)}

      ${questsHtml}

    </div>
  `;




  content.querySelectorAll('[data-reroll-slot]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt((e.currentTarget as HTMLElement).dataset.rerollSlot!, 10);
      import('../../core/today-plan').then(({ rerollTodayPlanSlot }) => {
        const res = rerollTodayPlanSlot(plan.items, idx);
        if (res.applied) {
          plan.items = res.items;
          renderToday(container, { plan, ritualDuration, recal, depth, ritual, dailyPlan, errorState, noPlanState, snoozeApplied });
        }
      });
    });
  });

  content.querySelectorAll('[data-snooze-slot]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt((e.currentTarget as HTMLElement).dataset.snoozeSlot!, 10);
      const item = plan.items[idx];
      if (item && item.exerciseId) {
        localStorage.setItem('fokus-slot-snooze', JSON.stringify({ date: todayStr, exerciseId: item.exerciseId }));
        const res = applySlotSnooze(plan.items, item.exerciseId);
        if (res.applied) {
          plan.items = res.items;
          renderToday(container, { plan, ritualDuration, recal, depth, ritual, dailyPlan, errorState, noPlanState, snoozeApplied: true });
        }
      }
    });
  });

  content.querySelector('#btn-recal')?.addEventListener('click', () => {

    const items = (recal.probe.length ? recal.probe : [
      { exerciseId: 'odd-one' },
      { exerciseId: 'grid-memory' },
      { exerciseId: 'stroop' }
    ]).map((p: any) => ({ exerciseId: p.exerciseId }));
    navigateTo('session', { mode: 'recalibration', items });
  });
  content.querySelector('#btn-recal-later')?.addEventListener('click', () => {
    snoozeRecalibration();
    renderToday(container);
  });
  const workout = content.querySelector('.workout-card') as HTMLElement | null;
  if (workout && !workout.classList.contains('fx-celebrate')) enterStage(workout);
  
  const startBtn = content.querySelector('#btn-start') as HTMLElement | null;
  if (startBtn && !isLoading && !errorState) {
    requestAnimationFrame(() => startBtn.focus());
  } else if (!navigator.onLine) {
    const retryBtn = content.querySelector('#btn-retry') as HTMLElement | null;
    if (retryBtn) requestAnimationFrame(() => retryBtn.focus());
  }

  content.querySelector('#btn-retry')?.addEventListener('click', () => {
    window.location.reload();
  });

  import('../../pwa-install').then(({ onInstallPrompt, promptInstall, getManualInstallHint, isInstalled }) => {
    const card = content.querySelector('#today-install-card') as HTMLElement;
    const btn = content.querySelector('#btn-today-install') as HTMLButtonElement | null;
    const titleEl = content.querySelector('#install-title') as HTMLElement | null;
    const bodyEl = card?.querySelector('p.muted') as HTMLElement | null;
    if (!card || !btn) return;
    const soft = card.dataset.softReturn === '1';
    const applyManual = () => {
      const hint = getManualInstallHint(soft);
      if (!hint.show || isInstalled) {
        card.style.display = 'none';
        return;
      }
      if (titleEl) titleEl.textContent = hint.title;
      if (bodyEl) bodyEl.textContent = hint.body;
      btn.textContent = hint.cta;
      card.style.display = 'block';
      btn.onclick = () => {
        /* iOS / no BIP: copy is instructional; keep card visible */
        btn.setAttribute('aria-pressed', 'true');
      };
    };
    onInstallPrompt((prompt: any, installed: boolean) => {
      if (installed) {
        card.style.display = 'none';
        return;
      }
      if (prompt) {
        card.style.display = 'block';
        btn.onclick = async () => {
          const ok = await promptInstall();
          if (ok) card.style.display = 'none';
        };
      } else {
        applyManual();
      }
    });
  });
  
  const handleStart = (itemsToPlay: any[], duration: number) => {
    const startSession = () => {
      if (!profile.calibrated) {
        navigateTo('session', {
          mode: 'calibration',
          items: calibrationSessionItems({
            primaryGoal: profile.primaryGoal,
            catalog: catalog.map((r) => ({ id: r.manifest.id, domain: r.manifest.domain, skills: [...r.manifest.skills] }))
          })
        });
      } else {
        navigateTo('session', { mode: 'normal', items: itemsToPlay, durationSec: duration });
      }
    };

    if (!playedToday && profile.calibrated && !profile.skipLifestylePrompt && !unfinishedSession) {
      const modal = document.createElement('div');
      modal.className = 'modal-root';
      modal.innerHTML = lifestyleCheckinHtml();
      document.body.appendChild(modal);
      const unbindDialog = bindDialog(modal, {
        labelledBy: 'ls-title',
        onClose: () => {
          unbindDialog();
          modal.remove();
          startSession();
        }
      });

      let sleepVal: string | null = null;
      let stressVal: string | null = null;

      bindLifestyleField(modal, 'sleep', (v) => { sleepVal = v; });
      bindLifestyleField(modal, 'stress', (v) => { stressVal = v; });

      const closeAndStart = () => {
        if (sleepVal || stressVal) {
          const p = storage.getProfile();
          p.lastLifestyle = { sleep: sleepVal, stress: stressVal, date: todayStr };
          storage.setProfile(p);
        }
        unbindDialog();
        modal.remove();
        startSession();
      };

      modal.querySelector('#btn-ls-done')?.addEventListener('click', closeAndStart);
      modal.querySelector('#btn-ls-skip')?.addEventListener('click', () => {
        unbindDialog();
        modal.remove();
        startSession();
      });
    } else {
      startSession();
    }
  };

  content.querySelector('#btn-start')?.addEventListener('click', () => {
    import('../../core/feedback-io').then(({ trackLocal }) => trackLocal('ritual_started')).catch(() => {});
    handleStart(plan.items, ritualDuration);
  });


  content.querySelector('#btn-restart')?.addEventListener('click', () => {
    const pSessions = storage.getSessions();
    const idx = pSessions.findIndex(s => s.id === unfinishedSession?.id);
    if (idx !== -1) {
      pSessions[idx].finishedAt = new Date().toISOString();
      storage.setSessions(pSessions);
      renderToday(container);
    }
  });
}
