import { storage } from '../../core/storage';
import { catalog, getManifest } from '../../exercises/catalog';
import { bindDialog } from '../a11y';
import { planWithRecovery } from '../../core/recovery';
import { describeAdaptiveDepth } from '../../core/adaptive-depth';
import { applyGentleReturnBias, loadContinuitySnapshot, ritualDurationSec } from '../../core/continuity';
import { navigateTo } from '../router';
import { planForNow, snoozeRecalibration } from '../../core/adaptive-plan';
import { SLOT_LABEL, isRecalibrationActive } from '../../core/engine';
import { renderShell } from '../shell';
import { getLevelProgress } from '../../core/xp';
import { getDailyQuests } from '../../core/quests';
import { generateInsights } from '../../core/insights';
import { suggestFocusOfTheWeek } from '../../core/transfer-insights';
import { transferCardFromStorage } from '../components/transfer-card';
import { getDailySpark } from '../../core/coach';
import { computeFokusIndex, previousFokusIndex, indexDelta } from '../../core/fokus-index';
import { domainLabel, leagueName } from '../../core/labels';
import { renderRadarChart } from '../components/charts';
import { renderQualityCard } from '../components/quality-card';
import { calibrationSessionItems } from '../../core/calibration';
import { getTodayRitual } from '../../core/onboarding';
import { assessRetention, bandLabel } from '../../core/retention';
import { enterStage } from '../../core/motion';
import { renderContinuityHint, renderStreakChip } from '../components/habit-continuity';

export function renderToday(container: HTMLElement) {
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
  let yesterdayScore = 0;
  const gapDays = snap.streak.openMisses;
  if (snap.streak.status === 'open' && ds.length > 0) {
    yesterdayScore = Math.round(ds[ds.length - 1].totalScore);
  }

  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();
  const sessions = storage.getSessions();
  const weeklyFocus = suggestFocusOfTheWeek(domains, ds, sessions);
  const weekRitual = getTodayRitual(profile.firstWeekPlan, todayStr, ds);
  const baseDuration = weekRitual.inFirstWeek && weekRitual.ritualDay
    ? weekRitual.ritualDay.durationSec
    : profile.sessionLengthSec;
  const durationSec = ritualDurationSec(baseDuration, snap.ritual);
  let plan: { items: any[]; focusDomains: string[] } = { items: [], focusDomains: [] };
  let ritualDuration = durationSec;
  let recal: any = { probe: [] as any[], forced: false, summary: '' };
  let depth = { chip: null as any, why: null as string | null, ritual: null as any };
  let ritual: any = null;
  let errorState = false;
  let noPlanState = false;

  try {
    ritual = planWithRecovery({
      durationSec,
      catalog,
      domains,
      skills,
      states,
      primaryGoal: weeklyFocus?.domain || (weekRitual.ritualDay && weekRitual.ritualDay.focusDomains[0]) || profile.primaryGoal,
      sessions,
      daySummaries: ds,
      recoveryHintsEnabled: profile.recoveryHints !== false
    });
    plan = ritual.plan;
    const catalogHints = catalog.map((r) => ({ id: r.manifest.id, domain: r.manifest.domain }));
    const biased = applyGentleReturnBias(plan as any, snap.ritual, catalogHints);
    plan = { ...plan, items: biased.items, focusDomains: biased.focusDomains };
    ritualDuration = Math.min(ritual.snapshot.durationSec, durationSec);
    recal = ritual.recalibration;
    depth = describeAdaptiveDepth({
      sessions,
      domains,
      skills,
      states,
      catalog,
      durationSec: ritualDuration,
      primaryGoal: weeklyFocus?.domain || (weekRitual.ritualDay && weekRitual.ritualDay.focusDomains[0]) || profile.primaryGoal
    });
    if (!snap.ritual.active && !ritual.snapshot.gate.active && depth.ritual && depth.ritual.items.length) {
      plan.items = depth.ritual.items.map((s: any) => ({
        exerciseId: s.exerciseId,
        reason: s.reasonLabel
      }));
      plan.focusDomains = depth.ritual.focusDomains;
    }
    
    if (plan.items.length === 0) {
      noPlanState = true;
    }
  } catch (err) {
    console.error('Plan generation error:', err);
    errorState = true;
  }

  const trendChipHtml = depth.chip
    ? `<div class="ability-trend-chip chip dom-${depth.chip.domain}" role="status" aria-label="${depth.chip.aria}">${depth.chip.label}</div>`
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
    : 'Сбалансированная тренировка';

  const compositionHtml = plan.items.map((item, index) => {
    const r = getManifest(item.exerciseId);
    const isPrimary = index === 0;
    const slot = item.slot ? SLOT_LABEL[item.slot as keyof typeof SLOT_LABEL] : '';
    return `<div class="chip dom-${r?.domain} workout-chip ${isPrimary ? 'primary' : ''}" style="display: flex; flex-direction: column; align-items: flex-start; padding: 8px 12px; gap: 4px; height: auto; border-radius: 12px;">
      <div style="display: flex; align-items: center; gap: 6px;">
        <img src="${import.meta.env.BASE_URL}art/icon-${r?.id}.svg" width="18" height="18" alt="" decoding="async">
        <span style="font-weight: 600;">${r?.name}</span>
        ${slot ? `<span class="slot-tag">${slot}</span>` : ''}
      </div>
      <div style="font-size: 11px; opacity: 0.85; line-height: 1.2;">${item.reason}</div>
    </div>`;
  }).join('');

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = new Date().toLocaleDateString('ru-RU', dateOptions);

  const shieldCharges = typeof (profile as { shieldCharges?: number }).shieldCharges === 'number'
    ? (profile as { shieldCharges?: number }).shieldCharges
    : undefined;

  const spark = getDailySpark({
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
    shieldCharges
  });

  const transferCardHtml = transferCardFromStorage({ prefer: playedToday ? 'session' : 'week' });
  let retentionHtml = '';
  try {
    const snap = assessRetention({
      daySummaries: ds,
      sessions,
      domains,
      playedToday,
      streak,
      skippedYesterday,
      sessionLengthSec: profile.sessionLengthSec,
      shieldCharges
    });
    if (profile.calibrated && snap.confidence >= 20) {
      const extra = snap.primaryNudge && snap.primaryNudge.title !== spark.title
        ? ` · ${snap.primaryNudge.title.toLowerCase()}`
        : '';
      retentionHtml = `<p class="rhythm-line band-${snap.band}" data-rhythm="${snap.rhythm}">Ритм ${snap.rhythm} · ${bandLabel(snap.band)}${extra}</p>`;
    }
  } catch {
    retentionHtml = '';
  }

  const insights = generateInsights(domains, skills, states, ds, sessions);
  if (gapDays >= 2 && !playedToday) {
    insights.unshift({
      title: 'С возвращением',
      description: 'Исследования показывают, что восстановление после паузы укрепляет нейронные связи. Fokus подобрал мягкий старт для сегодняшней сессии.',
      confidence: 'high',
      type: 'milestone',
      priority: 1
    });
  }
  const topInsight = insights[0];
  const weekHtml = profile.calibrated && weekRitual.inFirstWeek && weekRitual.ritualDay ? `
    <div class="week-card" aria-label="Первая неделя, день ${weekRitual.day} из 7">
      <div class="week-kicker">Первая неделя · день ${weekRitual.day} из 7 · ${weekRitual.ritualDay.label}</div>
      <div class="week-strip" role="list">
        ${profile.firstWeekPlan!.days.map((d) => {
          const state = d.day < (weekRitual.day || 0) ? 'past' : d.day === weekRitual.day ? 'now' : 'next';
          return `<span class="week-pill ${state}" role="listitem" aria-current="${state === 'now' ? 'step' : 'false'}">${d.day}</span>`;
        }).join('')}
      </div>
      <p class="week-note">${weekRitual.copy}</p>
    </div>
  ` : '';

  const quests = getDailyQuests();
  const questsHtml = `
    <div class="surface quests-card">
      <h3>Квесты дня <span class="xp-pill">+50 XP</span></h3>
      ${quests.map(q => {
        const pct = Math.min(100, (q.progress / q.target) * 100);
        return `
          <div class="quest-row">
            <div>
              <div class="quest-title ${q.completed ? 'done' : ''}">${q.title}${q.completed ? ' ✓' : ''}</div>
              <div class="quest-desc">${q.description}</div>
            </div>
            <div class="quest-count">${q.progress}/${q.target}</div>
          </div>
          <div class="scale-track quest-track"><div class="scale-fill ritual-fill" style="--fill: ${pct}%; background: ${q.completed ? 'var(--ok)' : 'var(--accent)'};"></div></div>
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

  let actionHtml = '';
  const isLoading = catalog.length === 0;

  if (isLoading) {
    actionHtml = `
      <div class="workout-card loading-state">
        <div class="workout-kicker">Загрузка</div>
        <h3>Собираем план...</h3>
        <p>Fokus анализирует вашу активность.</p>
        <button class="btn-primary" type="button" disabled>Подождите</button>
      </div>
    `;
  } else if (errorState) {
    actionHtml = `
      <div class="workout-card error-state">
        <div class="workout-kicker">Ошибка</div>
        <h3>Что-то пошло не так</h3>
        <p>Не удалось составить персональную сессию. Попробуйте обновить страницу.</p>
        <button id="btn-retry" class="btn-secondary" type="button">Обновить</button>
      </div>
    `;
  } else if (!navigator.onLine) {
    actionHtml = `
      <div class="workout-card offline-card fx-enter" role="region" aria-labelledby="cta-offline-title">
        <div class="workout-kicker">Офлайн режим</div>
        <h3 id="cta-offline-title">Нет подключения</h3>
        <p>Для создания персональной тренировки требуется сеть. Ваши данные в безопасности.</p>
        <button id="btn-retry" class="btn-secondary" type="button">Проверить сеть</button>
      </div>
    `;
  } else if (!profile.calibrated) {
    actionHtml = `
      <div class="workout-card fx-enter coach-${spark.tone}">
        <div class="workout-kicker">${spark.title}</div>
        <h3>Калибровка уровня</h3>
        <p class="workout-coach-insight">${spark.body}</p>
        <button id="btn-start" class="btn-primary" type="button">Пройти калибровку</button>
      </div>
    `;
  } else if (playedToday) {
    actionHtml = `
      <div class="workout-card done fx-celebrate coach-${spark.tone}">
        <div class="workout-kicker">${spark.title}</div>
        <h3>План выполнен</h3>
        ${trendChipHtml}
        <p class="workout-coach-insight">${spark.body}</p>
        <button id="btn-start" class="btn-secondary" type="button">Ещё одна сессия</button>
      </div>
    `;
  } else if (noPlanState) {
    actionHtml = `
      <div class="workout-card done fx-enter">
        <div class="workout-kicker">Отдых</div>
        <h3>На сегодня всё</h3>
        <p>Fokus рекомендует полный отдых или пока нет подходящих упражнений.</p>
        <button class="btn-secondary" type="button" disabled>Сессия недоступна</button>
      </div>
    `;
  } else if (snap.ritual.active) {
    const returnFocus = plan.focusDomains.length > 0
      ? plan.focusDomains.map(d => domainLabel(d)).join(' + ')
      : 'знакомые области';
    actionHtml = `
      <div class="workout-card fx-enter coach-${spark.tone}">
        <div class="workout-kicker">${spark.title}</div>
        <h3>${Math.floor(ritualDuration / 60)} минут · ${returnFocus}</h3>
        <p class="workout-coach-insight">${spark.body}</p>
        <div class="workout-chips">${compositionHtml}</div>
        <button id="btn-start" class="btn-primary" type="button">Начать сессию</button>
      </div>
    `;
  } else {
    const rest = ritual?.snapshot?.gate?.active;
    const finalKicker = rest ? 'Сегодня легче' : spark.title;
    actionHtml = `
      <div class="workout-card fx-enter ${rest ? 'rest-light' : ''} coach-${spark.tone}">
        <div class="workout-kicker">${finalKicker}</div>
        <h3>${Math.floor(ritualDuration / 60)} минут · ${focusText}</h3>
        ${trendChipHtml}
        <p class="workout-coach-insight">${spark.body}</p>
        <div class="workout-chips">${compositionHtml}</div>
        ${ritualWhyHtml}
        <button id="btn-start" class="btn-primary" type="button">Начать сессию</button>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="today-head">
      <h2>${hello}${greetName ? ', <span class="greet-name">' + greetName + '</span>' : ''}</h2>
      <p class="today-date">${dateStr}</p>
    </div>

    ${heroHtml}

    ${ritual ? renderQualityCard(ritual.snapshot) : ''}
    ${recalHtml}

    ${actionHtml}

    ${weekHtml}

    <div class="dashboard-widgets">
      <div class="stat-row">
        ${renderStreakChip(snap, 'pill')}
        <div class="stat-pill">
          <div class="stat-num">${streak}${profile.seriesGoalDays ? ` <span style="font-size: 16px; opacity: 0.5;">/ ${profile.seriesGoalDays}</span>` : ''}</div>
          <div class="stat-lbl">${profile.seriesGoalDays ? 'цель серии' : (streak === 0 ? 'начни серию' : 'дней подряд')}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-num">${lvl.currentLevel}</div>
          <div class="stat-lbl">${leagueName(lvl.currentLevel)}</div>
        </div>
        <div class="stat-pill">
          <div class="stat-num">${Math.round(lvl.progressPct)}%</div>
          <div class="stat-lbl">до ур. ${lvl.currentLevel + 1}</div>
        </div>
      </div>
      ${renderContinuityHint(snap, 'today')}
      ${yesterdayScore > 0 && !playedToday ? `<p class="yesterday-hint">Вчерашний результат · <span class="highlight-score">${yesterdayScore} XP</span></p>` : ''}
      ${retentionHtml}


      ${transferCardHtml}

      ${questsHtml}

    </div>
  `;

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

  content.querySelector('#btn-retry')?.addEventListener('click', () => {
    window.location.reload();
  });
  
  content.querySelector('#btn-start')?.addEventListener('click', () => {
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
        navigateTo('session', { mode: 'normal', items: plan.items, durationSec: ritualDuration });
      }
    };

    if (!playedToday && profile.calibrated && !profile.skipLifestylePrompt) {
      const modal = document.createElement('div');
      modal.className = 'modal-root';
      modal.innerHTML = `
        <div class="surface modal-card">
          <h3 id="ls-title">Как вы сегодня?</h3>
          <p class="modal-lead">Необязательно. Помогает увидеть связь сна и результата.</p>
          <div class="modal-field">
            <div class="modal-label">Сон</div>
            <div class="seg-row">
              <button class="btn-ls-sleep btn-secondary" data-val="low" type="button">&lt; 6 ч</button>
              <button class="btn-ls-sleep btn-secondary" data-val="normal" type="button">6–8 ч</button>
              <button class="btn-ls-sleep btn-secondary" data-val="high" type="button">&gt; 8 ч</button>
            </div>
          </div>
          <div class="modal-field">
            <div class="modal-label">Стресс</div>
            <div class="seg-row">
              <button class="btn-ls-stress btn-secondary" data-val="low" type="button">Низкий</button>
              <button class="btn-ls-stress btn-secondary" data-val="normal" type="button">Средний</button>
              <button class="btn-ls-stress btn-secondary" data-val="high" type="button">Высокий</button>
            </div>
          </div>
          <button id="btn-ls-done" class="btn-primary" type="button">Начать тренировку</button>
          <button id="btn-ls-skip" class="btn-secondary" type="button">Пропустить</button>
        </div>
      `;
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

      modal.querySelectorAll('.btn-ls-sleep').forEach(b => {
        b.addEventListener('click', (e) => {
          modal.querySelectorAll('.btn-ls-sleep').forEach(x => {
            x.classList.remove('btn-primary');
            x.classList.add('btn-secondary');
          });
          const el = e.currentTarget as HTMLElement;
          el.classList.remove('btn-secondary');
          el.classList.add('btn-primary');
          sleepVal = el.dataset.val || null;
        });
      });

      modal.querySelectorAll('.btn-ls-stress').forEach(b => {
        b.addEventListener('click', (e) => {
          modal.querySelectorAll('.btn-ls-stress').forEach(x => {
            x.classList.remove('btn-primary');
            x.classList.add('btn-secondary');
          });
          const el = e.currentTarget as HTMLElement;
          el.classList.remove('btn-secondary');
          el.classList.add('btn-primary');
          stressVal = el.dataset.val || null;
        });
      });

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
  });
}
