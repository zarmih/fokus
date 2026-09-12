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
  const ritual = planWithRecovery({
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
  let plan = ritual.plan;
  const catalogHints = catalog.map((r) => ({ id: r.manifest.id, domain: r.manifest.domain }));
  const biased = applyGentleReturnBias(plan, snap.ritual, catalogHints);
  plan = { ...plan, items: biased.items, focusDomains: biased.focusDomains };
  const ritualDuration = Math.min(ritual.snapshot.durationSec, durationSec);
  const recal = ritual.recalibration;
  const depth = describeAdaptiveDepth({
    sessions,
    domains,
    skills,
    states,
    catalog,
    durationSec: ritualDuration,
    primaryGoal: weeklyFocus?.domain || (weekRitual.ritualDay && weekRitual.ritualDay.focusDomains[0]) || profile.primaryGoal
  });

  const trendChipHtml = depth.chip
    ? `<div class="ability-trend-chip chip dom-${depth.chip.domain}" role="status" aria-label="${depth.chip.aria}">${depth.chip.label}</div>`
    : '';

  if (!snap.ritual.active && !ritual.snapshot.gate.active && depth.ritual && depth.ritual.items.length) {
    (plan as { items: { exerciseId: string; reason?: string, slot?: string }[]; focusDomains: string[] }).items = depth.ritual.items.map((s, idx) => ({
      exerciseId: s.exerciseId,
      reason: s.reasonLabel,
      slot: plan.items[idx]?.slot
    }));
    (plan as { focusDomains: string[] }).focusDomains = depth.ritual.focusDomains;
  }
  const showRecal = profile.calibrated && isRecalibrationActive(recal);

  const fi = computeFokusIndex(domains);
  const prevFi = previousFokusIndex(ds, new Date().toISOString());
  const fiDelta = indexDelta(fi.value, prevFi);

  const focusText = plan.focusDomains.length > 0
    ? plan.focusDomains.map(d => domainLabel(d)).join(' + ')
    : 'Сбалансированная тренировка';

  const compositionV3Html = plan.items.map((item, index) => {
    const r = getManifest(item.exerciseId);
    const slotStr = item.slot ? SLOT_LABEL[item.slot] : (index === 0 ? 'Разминка' : index === plan.items.length - 1 ? 'Заминка' : 'Фокус');
    return `
      <div class="ritual-slot">
        <div class="ritual-slot-icon dom-${r?.domain}-bg">
          <img src="${import.meta.env.BASE_URL}art/icon-${r?.id}.svg" width="20" height="20" alt="" decoding="async">
        </div>
        <div class="ritual-slot-info">
          <div class="ritual-slot-name">${slotStr}: ${r?.name}</div>
          <div class="ritual-slot-domain">${domainLabel(r?.domain || 'focus')} ${item.reason ? '· ' + item.reason : ''}</div>
        </div>
      </div>
    `;
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
  if (!profile.calibrated) {
    actionHtml = `
      <div class="ritual-v3-card workout-card fx-enter">
        <div class="ritual-v3-kicker">✨ Первый шаг</div>
        <h3 class="ritual-v3-title">Калибровка уровня</h3>
        <p class="ritual-v3-desc">3–5 коротких блоков, 60–90 секунд. Оценка способности по областям — не IQ. После этого Fokus соберёт персональную сессию.</p>
        <button id="btn-start" class="ritual-v3-cta" type="button">Пройти калибровку</button>
      </div>
    `;
  } else if (playedToday) {
    actionHtml = `
      <div class="empty-state-v3 workout-card done fx-celebrate">
        <div class="empty-state-icon">✨</div>
        <h3 class="empty-state-title">На сегодня всё</h3>
        <p class="empty-state-desc">Вы выполнили дневной ритуал. Отличная работа! Возвращайтесь завтра для новой тренировки.</p>
        ${trendChipHtml}
        <button id="btn-start" class="btn-secondary" style="margin-top: 16px;" type="button">Ещё одна сессия</button>
      </div>
    `;
  } else if (snap.ritual.active) {
    const returnFocus = plan.focusDomains.length > 0
      ? plan.focusDomains.map(d => domainLabel(d)).join(' + ')
      : 'знакомые области';
    actionHtml = `
      <div class="ritual-v3-card workout-card fx-enter">
        <div class="ritual-v3-kicker">🌱 Мягкий возврат</div>
        <h3 class="ritual-v3-title">${Math.floor(ritualDuration / 60)} минут · ${returnFocus}</h3>
        <p class="ritual-v3-desc">Поможем плавно вернуться в ритм без перегрузки.</p>
        <div class="ritual-v3-slots">
          ${compositionV3Html}
        </div>
        <button id="btn-start" class="ritual-v3-cta" type="button">Начать сессию</button>
      </div>
    `;
  } else {
    const rest = ritual.snapshot.gate.active;
    actionHtml = `
      <div class="ritual-v3-card workout-card fx-enter ${rest ? 'rest-light' : ''}">
        <div class="ritual-v3-kicker">${rest ? '🧘 Сегодня легче' : '🔥 Тренировка дня'}</div>
        <h3 class="ritual-v3-title">${Math.floor(ritualDuration / 60)} минут · ${focusText}</h3>
        <p class="ritual-v3-desc ritual-why">${depth.why || 'Интеллектуальная подборка для вашего мозга.'}</p>
        ${trendChipHtml ? '<div style="margin-bottom: 16px;">' + trendChipHtml + '</div>' : ''}
        <div class="ritual-v3-slots">
          ${compositionV3Html}
        </div>
        <button id="btn-start" class="ritual-v3-cta" type="button">Начать сессию</button>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="today-v3-header">
      <h2 class="today-v3-greeting">${hello}${greetName ? ', <span class="greet-name">' + greetName + '</span>' : ''}</h2>
      <p class="today-v3-date">${dateStr}</p>
    </div>

    ${actionHtml}

    ${heroHtml}

    ${renderQualityCard(ritual.snapshot)}
    ${recalHtml}
    ${weekHtml}

    <div class="dashboard-widgets">
      <div class="stat-row">
        ${renderStreakChip(snap, 'pill')}
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

      <div class="insight-banner coach-${spark.tone}">
        <div class="insight-icon">💡</div>
        <div>
          <div class="insight-kicker">Коуч Fokus · ${spark.title}</div>
          <div class="insight-body">${spark.body}</div>
        </div>
      </div>

      ${transferCardHtml}
      ${questsHtml}
    </div>
  `;

  content.querySelector('#btn-recal')?.addEventListener('click', () => {
    const items = (recal.probe.length ? recal.probe : [
      { exerciseId: 'odd-one' },
      { exerciseId: 'grid-memory' },
      { exerciseId: 'stroop' }
    ]).map((p) => ({ exerciseId: p.exerciseId }));
    navigateTo('session', { mode: 'recalibration', items });
  });
  content.querySelector('#btn-recal-later')?.addEventListener('click', () => {
    snoozeRecalibration();
    renderToday(container);
  });

  content.querySelector('#btn-start')?.addEventListener('click', () => {
    const startSession = () => {
      if (!profile.calibrated) {
        (window as any).plannedDuration = 180;
        navigateTo('session', {
          mode: 'calibration',
          items: calibrationSessionItems({
            primaryGoal: profile.primaryGoal,
            catalog: catalog.map((r) => ({ id: r.manifest.id, domain: r.manifest.domain, skills: [...r.manifest.skills] }))
          })
        });
      } else {
        (window as any).plannedDuration = ritualDuration;
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
