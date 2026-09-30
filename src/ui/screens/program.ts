import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';
import { calibrationSessionItems } from '../../core/calibration';
import { currentModel, snoozeRecalibration, getProgramPosition } from '../../core/adaptive-plan';
import { SLOT_LABEL, getDomain, isRecalibrationActive } from '../../core/engine';
import { DOMAIN_IDS } from '../../core/engine/constants';
import { domainLabel } from '../../core/labels';
import type { DomainId } from '../../core/engine/types';
import { loadContinuitySnapshot, getContinuityMessage, applyGentleReturnBias, ritualDurationSec } from '../../core/continuity';
import { planWithRecovery } from '../../core/recovery';

export function renderProgram(container: HTMLElement) {
  const shell = renderShell(container, { active: 'program' });
  const profile = storage.getProfile();
  
  const snapshot = loadContinuitySnapshot(storage as any);
  const contMsg = getContinuityMessage(snapshot);
  const playedToday = snapshot.streak.playedToday;
  
  const ds = storage.getDaySummaries();
  const sessions = storage.getSessions();
  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();

  const ritualDuration = ritualDurationSec(profile.sessionLengthSec || 900, snapshot.ritual);

  const ritual = planWithRecovery({
    durationSec: ritualDuration,
    catalog: registry as any,
    domains,
    skills,
    states,
    primaryGoal: profile.primaryGoal,
    sessions,
    daySummaries: ds,
    recoveryHintsEnabled: profile.recoveryHints !== false
  });

  const biased = applyGentleReturnBias(
    ritual.plan as any,
    snapshot.ritual,
    registry.map(c => ({ id: c.manifest.id, domain: c.manifest.domain }))
  );
  
  const plan = { ...ritual.plan, items: biased.items, focusDomains: biased.focusDomains };
  const recal = ritual.recalibration;
  const showRecal = profile.calibrated && isRecalibrationActive(recal);
  const model = currentModel();
  
  const { weekIndex, dayInWeek, playedCount, isSparse, playedToday: pt } = getProgramPosition(snapshot, profile as any);
  const planDurationMins = plan.items.length * 3;

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
    const slot = (item as any).slot ? SLOT_LABEL[(item as any).slot as import('../../core/engine/types').RitualSlotKind] : '';
    const p = (item as any).pSuccess != null ? Math.round((item as any).pSuccess * 100) : null;
    return `
      <div class="ritual-row">
        <div class="ritual-idx">${i + 1}</div>
        <img src="${import.meta.env.BASE_URL}art/icon-${r?.manifest.id}.svg" width="28" height="28" alt="">
        <div class="ritual-copy">
          <div class="ritual-name" aria-label="Упражнение: ${r?.manifest.name || item.exerciseId}">${r?.manifest.name || item.exerciseId}</div>
          <div class="muted">${item.reason}</div>
        </div>
        ${slot ? `<span class="slot-tag">${slot}</span>` : ''}
      </div>
    `;
  }).join('');

  const focusDomainsText = plan.focusDomains && plan.focusDomains.length > 0
    ? plan.focusDomains.map(d => domainLabel(d as DomainId)).join(' и ')
    : '';

  const isSparseModel = model.domains.some(d => plan.focusDomains.includes(d.domain) && d.sources.length < 3) || isSparse;
  const isPersonalized = profile.calibrated && !isSparseModel;
  const programTitle = isPersonalized ? 'Персональный план' : 'Базовая программа';
  const dayNum = playedCount + (playedToday ? 0 : 1);
  const subtitle = (isPersonalized ? 'Программа' : 'Сбор данных') + `: день ${dayNum} · Неделя ${weekIndex}`;

  let coachMessage = 'Сбалансированная тренировка для поддержания формы.';
  if (snapshot.ritual.active) {
    coachMessage = 'Мягкий возврат после паузы. Знакомые задания для лёгкого старта.';
  } else if (ritual.snapshot.gate.active) {
    coachMessage = ritual.snapshot.gate.reason || ritual.snapshot.hint.body;
  } else if (isSparseModel) {
    coachMessage = focusDomainsText
      ? `Пока мы собираем данные. Сегодня тренируем: ${focusDomainsText}.`
      : `Пока мы собираем данные для точной настройки вашей программы.`;
  } else if (focusDomainsText) {
    coachMessage = `План на день ${dayInWeek} построен по истории сессий. Акцент на: ${focusDomainsText}.`;
  }

  let hero = '';
  if (!profile.calibrated) {
    hero = `
      <div class="workout-card">
        <div class="workout-kicker">Ясный следующий шаг</div>
        <h3>Калибровка уровня</h3>
        <p>Пройдите три коротких блока, чтобы Fokus начал собирать первичную статистику.</p>
        <button id="btn-calibrate" class="btn-primary" type="button">Начать калибровку</button>
      </div>
    `;
  } else if (showRecal) {
    hero = `
      <div class="workout-card recal-card">
        <div class="workout-kicker">Простая калибровка</div>
        <h3>Сверить оценку</h3>
        <p>${recal.summary || 'Короткая сверка сложности. Серия не сбрасывается.'}</p>
        <div class="recal-actions">
          <button id="btn-recal" class="btn-primary" type="button">Пройти (~90 сек)</button>
          <button id="btn-recal-later" class="btn-secondary" type="button">Позже</button>
        </div>
      </div>
    `;
  } else if (playedToday) {
    hero = `
      <div class="workout-card done">
        <div class="workout-kicker">На сегодня всё</div>
        <h3>Тренировка выполнена</h3>
        <p>${contMsg.body || 'Лучший эффект даст отдых и продолжение занятий завтра.'}</p>
        <button id="btn-program-start" class="btn-secondary" type="button">Ещё одна сессия</button>
      </div>
    `;
  } else {
    hero = `
      <div class="workout-card">
        <div class="workout-kicker">${contMsg.title}</div>
        <h3>Тренировка дня · ~${planDurationMins} мин</h3>
        <p class="muted coach-rationale">${coachMessage}</p>
        <button id="btn-program-start" class="btn-primary" type="button">Начать тренировку</button>
      </div>
    `;
  }

  shell.innerHTML = `
    <div class="program-screen">
      <div class="today-head">
        <h2>${programTitle}</h2>
        <p class="today-date">${subtitle}</p>
      </div>
      ${hero}
      ${profile.calibrated ? `
        <div class="surface" style="margin-bottom:16px;">
          <h3 style="margin-bottom:12px;">Неделя ${weekIndex}</h3>
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            ${Array.from({ length: 7 }).map((_, i) => {
              const activeDayZeroIndexed = playedToday ? -1 : (dayInWeek - 1);
              const completedBeforeZeroIndexed = playedToday ? dayInWeek : (dayInWeek - 1);
              const isCompleted = i < completedBeforeZeroIndexed;
              const isCurrent = i === activeDayZeroIndexed;
              const bg = isCompleted ? 'var(--ok)' : isCurrent ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
              const color = isCompleted || isCurrent ? '#fff' : 'var(--muted)';
              const ariaLabel = isCompleted ? `День ${i + 1} завершён` : isCurrent ? `День ${i + 1} сегодня` : `День ${i + 1}`;
              return `<div aria-label="${ariaLabel}" style="flex: 1; height: 32px; border-radius: 4px; background: ${bg}; color: ${color}; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600;">${isCompleted ? '✓' : i + 1}</div>`;
            }).join('')}
          </div>
          <p class="muted" style="font-size:13px; margin:0;">${weekIndex === 1 ? 'Для точной настройки сложности завершите первую неделю.' : `Неделя ${weekIndex}, день ${dayInWeek}: адаптивный маршрут сбалансирован.`}</p>
        </div>
        <div class="surface" style="margin-bottom:16px;">
          <h3>Ваш ритм</h3>
          <p class="muted" style="margin-bottom:12px">${contMsg.body}</p>
          <div style="display:flex; gap:16px;">
            <div style="flex:1; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:600; color:var(--text-primary, #fff);">${snapshot.streak.current}</div>
              <div style="font-size:13px; color:var(--muted); margin-top:4px;">Серия (дней)</div>
            </div>
            ${snapshot.weekly.sufficient ? `
            <div style="flex:1; padding:12px; background:rgba(255,255,255,0.02); border-radius:8px; text-align:center;">
              <div style="font-size:24px; font-weight:600; color:var(--text-primary, #fff);">${Math.round(snapshot.weekly.score * 100)}%</div>
              <div style="font-size:13px; color:var(--muted); margin-top:4px;">Регулярность</div>
            </div>
            ` : ''}
          </div>
        </div>
        <div class="surface">
          <h3>Вектор способностей</h3>
          <p class="muted" style="margin-bottom:12px">Ваши показатели в пяти областях.</p>
          ${abilityHtml}
        </div>
        <div class="surface" style="margin-top:16px">
          <h3>Тренировка дня</h3>
          <div class="ritual-list">${ritualHtml || '<p class="muted">Каталог пуст — откройте тренажёры.</p>'}</div>
        </div>
      ` : ''}
      <div class="surface" style="margin-top:16px">
        <h3>Каталог</h3>
        <p class="muted" style="margin-bottom:12px">Отдельные упражнения не ломают тренировку.</p>
        <button id="btn-catalog" class="btn-secondary" type="button">Открыть тренажёры</button>
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
    navigateTo('session', { mode: 'normal', items: plan.items });
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
