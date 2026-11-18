import { renderShell } from '../shell';
import { exerciseIconSrc } from '../exercise-icon';
import { storage } from '../../core/storage';
import { navigateTo } from '../router';
import { registry } from '../../exercises/manifest-registry';
import { calibrationSessionItems } from '../../core/calibration';
import { currentModel, snoozeRecalibration, getProgramPosition } from '../../core/adaptive-plan';
import { SLOT_LABEL, getDomain, isRecalibrationActive } from '../../core/engine';
import { DOMAIN_IDS } from '../../core/engine/constants';
import { domainLabel } from '../../core/labels';
import type { DomainId } from '../../core/engine/types';
import { loadContinuitySnapshot, getContinuityMessage } from '../../core/continuity';
import { planToday, primaryCta } from '../../core/daily-plan';
import { abilityTrendChip } from '../../core/adaptive-depth';
import { computeAbilityTrajectory } from '../../core/ability-trajectory';
import { programTrendChipHtml } from '../components/accessible-markup';
import { assessRetention, describeProgramRetention } from '../../core/retention';
import { explainTodayPlan } from '../../core/today-plan';
import { getTodayRitual } from '../../core/onboarding';
import { describeProgramPhase, phaseForWeek } from '../../core/program-phases';
import { getQuietCoachTip } from '../../core/coach';
import { quietNormsHintFromSessions, quietNormsHintDisclaimerRu } from '../../core/norms-hint';
import { L, getLocale } from '../../core/i18n';
import { exerciseName } from '../../core/exercise-copy';
import { planReasonText, slotLabelText } from '../../core/plan-copy';

export function renderProgram(container: HTMLElement) {
  const shell = renderShell(container, { active: 'program' });
  const profile = storage.getProfile();
  
  const snapshot = loadContinuitySnapshot(storage as any);
  const todayStr = snapshot.today;
  const weekRitual = getTodayRitual(profile.firstWeekPlan, todayStr, storage.getDaySummaries());
  const contMsg = getContinuityMessage(snapshot, weekRitual);
  const playedToday = snapshot.streak.playedToday;
  
  const ds = storage.getDaySummaries();
  const sessions = storage.getSessions();
  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();

  const profileLengthSec = profile.sessionLengthSec || 900;
  // Single source of truth: the same plan Today shows and Session plays.
  const daily = planToday();
  const ritualDuration = daily.durationSec;

  let programRetention = null as ReturnType<typeof describeProgramRetention> | null;
  try {
    const retSnap = assessRetention({
      daySummaries: ds,
      sessions,
      domains,
      playedToday,
      streak: snapshot.streak.current,
      skippedYesterday: snapshot.streak.status === 'soft_return' || snapshot.streak.status === 'fresh_start',
      sessionLengthSec: profileLengthSec,
      shieldCharges: (profile as any).shieldCharges,
      now: new Date()
    });
    programRetention = describeProgramRetention(retSnap, {
      profileLengthSec,
      softReturnActive: snapshot.ritual.active,
      playedToday
    });
  } catch {
    programRetention = null;
  }

  const ritual = { plan: { items: daily.items, focusDomains: daily.focusDomains }, snapshot: daily.recovery, recalibration: daily.recalibration };
  const plan = { ...ritual.plan };

  let planExplain = null as ReturnType<typeof explainTodayPlan> | null;
  try {
    const retSnap = assessRetention({
      daySummaries: ds,
      sessions,
      domains,
      playedToday,
      streak: snapshot.streak.current,
      skippedYesterday: snapshot.streak.status === 'soft_return' || snapshot.streak.status === 'fresh_start',
      sessionLengthSec: profileLengthSec,
      shieldCharges: (profile as any).shieldCharges,
      now: new Date()
    });
    const phaseId = phaseForWeek(getProgramPosition(snapshot, profile as any).weekIndex).id;
    const quietTip = retSnap ? getQuietCoachTip({
      continuity: snapshot,
      retention: retSnap,
      programPhase: phaseId,
      inFirstWeek: weekRitual.inFirstWeek,
      playedToday
    }) : null;
    
    planExplain = explainTodayPlan({
      calibrated: !!profile.calibrated,
      playedToday,
      continuity: snapshot,
      retention: retSnap,
      programRetention,
      focusDomains: plan.focusDomains,
      planItems: plan.items,
      adaptiveWhy: null,
      recoveryHint: ritual.snapshot.gate.active ? (ritual.snapshot.gate.reason || ritual.snapshot.hint.body) : null,
      inFirstWeek: weekRitual.inFirstWeek,
      weekRitualCopy: weekRitual.copy || null,
      weekRitual,
      quietTip
    });
  } catch {
    planExplain = null;
  }
  const recal = ritual.recalibration;
  const showRecal = profile.calibrated && isRecalibrationActive(recal);
  const model = currentModel();
  
  const { weekIndex, dayInWeek, playedCount, isSparse, playedToday: pt } = getProgramPosition(snapshot, profile as any);
  const planDurationMins = Math.max(1, Math.round(daily.durationSec / 60));

  let chip: ReturnType<typeof abilityTrendChip> = null;
  try {
    chip = abilityTrendChip(computeAbilityTrajectory({ sessions, domains, catalog: registry.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain })) }));
  } catch {
    chip = null;
  }
  const adaptiveDepth = { chip, why: daily.why };

  const abilityHtml = DOMAIN_IDS.map((id: DomainId) => {
    const d = getDomain(model, id);
    const pct = Math.max(4, Math.min(100, (d.theta / 20) * 100));
    return `
      <div class="ability-row">
        <div class="ability-meta">
          <span>${domainLabel(id)}</span>
        </div>
        <div class="scale-track" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="${domainLabel(id)}: ${Math.round(pct)}%"><div class="scale-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');

  const ritualHtml = plan.items.map((item, i) => {
    const r = registry.find((x) => x.manifest.id === item.exerciseId);
    const exManifest = r?.manifest || { id: item.exerciseId, name: item.exerciseId, instruction: '' };
    const name = exerciseName(exManifest);
    const rawSlot = (item as any).slot ? SLOT_LABEL[(item as any).slot as import('../../core/engine/types').RitualSlotKind] : '';
    const slot = rawSlot ? slotLabelText(rawSlot) : '';
    const p = (item as any).pSuccess != null ? Math.round((item as any).pSuccess * 100) : null;
    const reason = planReasonText(item.reason);
    return `
      <div class="ritual-row">
        <div class="ritual-idx">${i + 1}</div>
        <img src="${exerciseIconSrc(r?.manifest.id, r?.manifest.domain)}" width="28" height="28" alt="">
        <div class="ritual-copy">
          <div class="ritual-name" aria-label="${L(`Упражнение: ${name}`, `Exercise: ${name}`)}">${name}</div>
          <div class="muted">${reason}</div>
        </div>
        ${slot ? `<span class="slot-tag">${slot}</span>` : ''}
      </div>
    `;
  }).join('');

  const focusDomainsText = plan.focusDomains && plan.focusDomains.length > 0
    ? plan.focusDomains.map(d => domainLabel(d as DomainId)).join(L(' и ', ' and '))
    : '';

  const isSparseModel = model.domains.some(d => plan.focusDomains.includes(d.domain) && d.sources.length < 3) || isSparse;
  const isPersonalized = profile.calibrated && !isSparseModel;
  const phaseView = describeProgramPhase({
    weekIndex,
    dayInWeek,
    primaryGoal: profile.primaryGoal,
    isSparse: isSparseModel,
    calibrated: !!profile.calibrated
  });
  const programTitle = isPersonalized ? L('Персональный план', 'Personalized plan') : (profile.calibrated ? L('Сбор данных', 'Data collection') : L('Базовая программа', 'Core program'));
  const subtitle = phaseView.subtitle;

  const REASON_COPY_EN: Record<string, string> = {
    'Прошло больше двух недель с последней оценки': 'More than two weeks have passed since the last assessment',
    'Форма заметно разошлась с базой сразу в нескольких областях': 'Performance drifted from baseline across multiple domains',
    'Модель потеряла уверенность — нужна короткая сверка': 'Model needs a brief check to restore precision'
  };

  const recalSummary = getLocale() === 'en'
    ? (recal?.summary ? recal.summary.split('. ').map((s: string) => REASON_COPY_EN[s] || 'Quick check needed').join('. ') : 'Quick difficulty check. Streak won’t reset.')
    : (recal?.summary || 'Короткая сверка сложности. Серия не сбрасывается.');

  // Shared Today/Program/Coach story — same object as Today hero.
  let coachMessage = L('Сбалансированная тренировка для поддержания формы.', 'A balanced workout to keep in shape.');
  if (getLocale() === 'en') {
    if (adaptiveDepth.why && !/[А-Яа-яЁё]/.test(adaptiveDepth.why)) {
      coachMessage = adaptiveDepth.why;
    } else if (snapshot.ritual.active) {
      coachMessage = 'Gentle return after a break. Familiar blocks for an easy start.';
    } else if (isSparseModel) {
      coachMessage = focusDomainsText
        ? `Collecting data for fine-tuning. Today we train: ${focusDomainsText}.`
        : 'Collecting data to fine-tune your program.';
    } else if (focusDomainsText) {
      coachMessage = `${phaseView.phase.title}. Today's focus: ${focusDomainsText}.`;
    } else if (programRetention?.focusDomain) {
      coachMessage = `Today's plan focuses on "${domainLabel(programRetention.focusDomain as DomainId)}".`;
    } else {
      coachMessage = phaseView.phaseCoach;
    }
  } else {
    if (planExplain) {
      coachMessage = planExplain.body;
      if (adaptiveDepth.why && planExplain.source === 'default') {
        coachMessage = adaptiveDepth.why;
      }
    } else if (snapshot.ritual.active) {
      coachMessage = 'Мягкий возврат после паузы. Знакомые задания для лёгкого старта.';
    } else if (programRetention?.coachOverride) {
      coachMessage = programRetention.coachOverride;
    } else if (ritual.snapshot.gate.active) {
      coachMessage = ritual.snapshot.gate.reason || ritual.snapshot.hint.body;
    } else if (adaptiveDepth.why) {
      coachMessage = adaptiveDepth.why;
    } else if (isSparseModel) {
      coachMessage = focusDomainsText
        ? `Пока мы собираем данные для точной настройки. Сегодня тренируем: ${focusDomainsText}.`
        : `Пока мы собираем данные для точной настройки вашей программы.`;
    } else if (focusDomainsText) {
      coachMessage = `${phaseView.phase.title}. Акцент сегодня: ${focusDomainsText}.`;
    } else if (programRetention?.focusDomain) {
      coachMessage = `Сегодня план подтягивает область «${domainLabel(programRetention.focusDomain as DomainId)}».`;
    } else {
      coachMessage = phaseView.phaseCoach;
    }
  }

  const coachWhy = planExplain?.whyExercises && planExplain.whyExercises !== coachMessage
    ? (getLocale() === 'en' ? (/[А-Яа-яЁё]/.test(planExplain.whyExercises) ? '' : planExplain.whyExercises) : planExplain.whyExercises)
    : '';

  const quietTipText = planExplain?.quietTip
    ? (getLocale() === 'en' ? (/[А-Яа-яЁё]/.test(planExplain.quietTip) ? '' : planExplain.quietTip) : planExplain.quietTip)
    : '';

  const planKicker = getLocale() === 'en'
    ? (contMsg.title && !/[А-Яа-яЁё]/.test(contMsg.title) ? contMsg.title : "Today's plan")
    : (planExplain?.title || contMsg.title);

  const catalogRefsNorms = registry.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain }));
  const normsHint = profile.calibrated
    ? quietNormsHintFromSessions(
        sessions,
        catalogRefsNorms,
        plan.focusDomains?.length ? plan.focusDomains : (programRetention?.focusDomain ? [programRetention.focusDomain] : null)
      )
    : null;
  const normsHintHtml = normsHint
    ? `<p class="norms-quiet-hint" data-local-norms="1" title="${quietNormsHintDisclaimerRu().replace(/"/g, '&quot;')}" style="margin-top: 10px; font-size: 13px; color: var(--muted); line-height: 1.4;">${normsHint}</p>`
    : '';

  let hero = '';
  if (!profile.calibrated) {
    hero = `
      <div class="workout-card">
        <div class="workout-kicker">${L('Ясный следующий шаг', 'Clear next step')}</div>
        <h3>${L('Калибровка уровня', 'Level calibration')}</h3>
        <p>${L('Пройдите три коротких блока, чтобы Fokus начал собирать первичную статистику.', 'Complete three short blocks so Fokus can start collecting initial stats.')}</p>
        <button id="btn-calibrate" class="btn-primary" type="button">${L('Начать калибровку', 'Start calibration')}</button>
      </div>
    `;
  } else if (showRecal) {
    hero = `
      <div class="workout-card recal-card">
        <div class="workout-kicker">${L('Простая калибровка', 'Quick calibration')}</div>
        <h3>${L('Сверить оценку', 'Check calibration')}</h3>
        <p>${recalSummary}</p>
        <div class="recal-actions">
          <button id="btn-recal" class="btn-primary" type="button">${L('Пройти (~90 сек)', 'Start (~90 sec)')}</button>
          <button id="btn-recal-later" class="btn-secondary" type="button">${L('Позже', 'Later')}</button>
        </div>
      </div>
    `;
  } else if (playedToday) {
    hero = `
      <div class="workout-card done">
        <div class="workout-kicker">${L('На сегодня всё', 'Done for today')}</div>
        <h3>${L('Тренировка выполнена', 'Workout complete')}</h3>
        <p>${contMsg.body || L('Лучший эффект даст отдых и продолжение занятий завтра.', 'Rest and continuing tomorrow will give the best effect.')}</p>
        ${normsHintHtml}
        <button id="btn-program-start" class="btn-secondary" type="button">${L('Ещё одна сессия', 'One more session')}</button>
      </div>
    `;
  } else {
    hero = `
      <div class="workout-card">
        <div class="workout-kicker">${planKicker}</div>
        <h3>${L(`Тренировка дня · ~${planDurationMins} мин`, `Daily workout · ~${planDurationMins} min`)}</h3>
        <p class="muted coach-rationale" data-plan-source="${planExplain?.source || 'legacy'}">${coachMessage}</p>
        ${quietTipText ? `<p class="coach-quiet-tip" style="margin-top: 12px; font-size: 13px; opacity: 0.85; color: var(--accent); font-weight: 500;">${quietTipText}</p>` : ''}
        ${coachWhy ? `<p class="ritual-why plan-why" style="margin-top:8px">${coachWhy}</p>` : ''}
        ${normsHintHtml}
        <button id="btn-program-start" class="btn-primary" type="button">${primaryCta()}</button>
      </div>
    `;
  }

  shell.innerHTML = `
    <div class="program-screen">
      <div class="today-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <div>
          <h2 style="margin: 0;">${programTitle}</h2>
          <p class="today-date" style="margin: 4px 0 0 0;">${subtitle}</p>
        </div>
        ${chip ? programTrendChipHtml(chip) : ''}
      </div>
      ${hero}
      ${profile.calibrated ? `
        <div class="surface phase-card" style="margin-bottom:16px;" aria-label="${phaseView.aria.replace(/"/g, '&quot;')}">
          <div class="workout-kicker">${L(`Фаза ${phaseView.phase.index} из 4 · 2–4 недели`, `Phase ${phaseView.phase.index} of 4 · 2–4 weeks`)}</div>
          <h3 style="margin-bottom:8px;">${phaseView.phase.title}</h3>
          <p style="margin:0 0 8px 0; font-weight:600;">${L('Цель:', 'Goal:')} ${phaseView.goalLine}</p>
          <p class="muted" style="font-size:13px; margin:0 0 12px 0;">${phaseView.phaseNarrative}</p>
          <div class="scale-track phase-progress" role="progressbar" aria-valuenow="${Math.round(phaseView.progressInPhase * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="${L('Прогресс фазы', 'Phase progress')}" style="height:6px;border-radius:3px;background: var(--track);overflow:hidden;margin-bottom:12px;">
            <div class="scale-fill" style="height:100%;width:${Math.round(phaseView.progressInPhase * 100)}%;background:var(--accent);"></div>
          </div>
          <p class="muted" style="font-size:12px; margin:0 0 12px 0;">${phaseView.weekDayLine}</p>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            ${Array.from({ length: 7 }).map((_, i) => {
              const activeDayZeroIndexed = playedToday ? -1 : (dayInWeek - 1);
              const completedBeforeZeroIndexed = playedToday ? dayInWeek : (dayInWeek - 1);
              const isCompleted = i < completedBeforeZeroIndexed;
              const isCurrent = i === activeDayZeroIndexed;
              const bg = isCompleted ? 'var(--ok)' : isCurrent ? 'var(--accent)' : 'var(--fill-muted)';
              const color = isCompleted ? 'var(--on-ok)' : isCurrent ? 'var(--btn-text)' : 'var(--muted)';
              const ariaLabel = isCompleted
                ? L(`День ${i + 1} завершён`, `Day ${i + 1} completed`)
                : isCurrent
                  ? L(`День ${i + 1} сегодня`, `Day ${i + 1} today`)
                  : L(`День ${i + 1}`, `Day ${i + 1}`);
              return `<div aria-label="${ariaLabel}" style="flex: 1; height: 32px; border-radius: 4px; background: ${bg}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;">${isCompleted ? '✓' : i + 1}</div>`;
            }).join('')}
          </div>
          ${phaseView.milestonePreview ? `<div class="milestone-preview" style="background: var(--fill-muted); padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px;"><span style="color: var(--accent);">✦</span> ${phaseView.milestonePreview}</div>` : ''}
          ${phaseView.carryLine ? `<p data-phase-carry="1" style="font-size: 13px; font-weight: 500; margin: 0 0 12px 0;">${phaseView.carryLine}</p>` : ''}
          <p class="muted" style="font-size:13px; margin:0;">${phaseView.phase.nextHint}</p>
        </div>
        <div class="surface" style="margin-bottom:16px;" ${programRetention ? `aria-label="${programRetention.aria.replace(/"/g, '&quot;')}"` : ''}>
          <h3>${L('Ваш ритм', 'Your rhythm')}</h3>
          ${programRetention ? `<p class="rhythm-line band-${programRetention.band}" data-rhythm="${programRetention.rhythm}" style="margin:0 0 8px 0; font-weight:600;">${programRetention.rhythmLine}</p>
          <p class="muted" style="margin-bottom:12px">${programRetention.body}</p>` : `<p class="muted" style="margin-bottom:12px">${contMsg.body}</p>`}
          <div style="display:flex; gap:16px;">
            <div style="flex:1; padding:12px; background:var(--fill-subtle); border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:600; color:var(--text);">${snapshot.streak.current}</div>
              <div style="font-size:13px; color:var(--muted); margin-top:4px;">${L('Серия (дней)', 'Streak (days)')}</div>
            </div>
            ${snapshot.weekly.sufficient ? `
            <div style="flex:1; padding:12px; background:var(--fill-subtle); border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:600; color:var(--text);">${Math.round(snapshot.weekly.score * 100)}%</div>
              <div style="font-size:13px; color:var(--muted); margin-top:4px;">${L('Регулярность', 'Regularity')}</div>
            </div>
            ` : programRetention ? `
            <div style="flex:1; padding:12px; background:var(--fill-subtle); border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:600; color:var(--text);">${programRetention.rhythm}</div>
              <div style="font-size:13px; color:var(--muted); margin-top:4px;">${L('Ритм', 'Rhythm')}</div>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="surface">
          <h3>${L('Вектор способностей', 'Ability vector')}</h3>
          <p class="muted" style="margin-bottom:12px">${L('Ваши показатели в пяти областях.', 'Your scores across five domains.')}</p>
          ${abilityHtml}
        </div>
        <div class="surface" style="margin-top:16px">
          <h3>${L('Тренировка дня', 'Daily workout')}</h3>
          <div class="ritual-list">${ritualHtml || `<p class="muted">${L('Каталог пуст — откройте тренажёры.', 'Catalog is empty — open trainers.')}</p>`}</div>
        </div>
      ` : ''}
      <div class="surface" style="margin-top:16px">
        <h3>${L('Каталог', 'Catalog')}</h3>
        <p class="muted" style="margin-bottom:12px">${L('Отдельные упражнения не ломают тренировку.', 'Single exercises don’t break your workout.')}</p>
        <button id="btn-catalog" class="btn-secondary" type="button">${L('Открыть тренажёры', 'Open trainers')}</button>
      </div>
    </div>
  `;

  const startCalibration = () => {
    navigateTo('session', {
      mode: 'calibration',
      items: calibrationSessionItems({
        primaryGoal: profile.primaryGoal,
        catalog: registry.map(c => ({
          id: c.manifest.id,
          domain: c.manifest.domain,
          skills: c.manifest.skills
        }))
      })
    });
  };
  const startRitual = () => {
    navigateTo('session', { mode: 'normal', items: plan.items, durationSec: daily.durationSec });
  };
  const startRecal = () => {
    const fallback = calibrationSessionItems({
      primaryGoal: profile.primaryGoal,
      catalog: registry.map(c => ({
        id: c.manifest.id,
        domain: c.manifest.domain,
        skills: c.manifest.skills
      }))
    });
    const items = (recal.probe.length ? recal.probe : fallback).map((p) => ({ exerciseId: p.exerciseId }));
    navigateTo('session', { mode: 'recalibration', items });
  };

  shell.querySelector('#btn-calibrate')?.addEventListener('click', startCalibration);
  shell.querySelector('#btn-program-start')?.addEventListener('click', startRitual);
  shell.querySelector('#btn-recal')?.addEventListener('click', startRecal);
  shell.querySelector('#btn-recal-later')?.addEventListener('click', () => {
    snoozeRecalibration();
    renderProgram(container);
  });
  shell.querySelector('#btn-catalog')?.addEventListener('click', () => navigateTo('trainers'));
}
