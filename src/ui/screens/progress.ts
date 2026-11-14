import { navigateTo } from '../router';
import { exerciseIconSrc } from '../exercise-icon';
import { generateInsights } from "../../core/insights";
import { planWithRecovery } from "../../core/recovery";
import { loadContinuitySnapshot } from '../../core/continuity';
import { getWeeklyGoal } from "../../core/quests";
import { storage } from '../../core/storage';
import { renderShell } from '../shell';
import { catalog, getManifest } from '../../exercises/catalog';
import { renderScatterPlot, renderRadarChart, renderIndexSparkline } from '../components/charts';
import { computeFokusIndex, personalIndexBand } from '../../core/fokus-index';
import { METRIC_COPY, METRIC_COPY_EN, exerciseTrend } from '../../core/analytics/methodology';
import { domainLabel, skillLabel } from '../../core/labels';
import { suggestFocusOfTheWeek } from '../../core/transfer-insights';
import { transferCardFromStorage } from '../components/transfer-card';
import { renderQualityCard } from '../components/quality-card';
import { assessRetention, bandLabel, signalLabel, describeProgramRetention } from '../../core/retention';
import { explainTodayPlan, emptyPlanCopy } from '../../core/today-plan';
import { getTodayRitual } from '../../core/onboarding';
import { buildCoachIntel } from '../../core/coach-intel';
import { renderContinuityHint, renderStreakChip } from '../components/habit-continuity';
import { computeAbilityTrajectory } from '../../core/ability-trajectory';
import { calendarDayKey, addCalendarDays, resolveFokusTimeZone, PREFERRED_TIME_ZONE } from '../../core/streak';
import {
  collectAttemptSamples,
  normsByDomain,
  normsDisclaimerRu,
  normsDisclaimerEn
} from '../../core/local-norms';
import { L, getLocale, t } from '../../core/i18n';
import { exerciseName } from '../../core/exercise-copy';
import { planReasonText } from '../../core/plan-copy';

/** Format a Progress history row timestamp in the Fokus product TZ (Europe/Moscow). */
export function formatProgressHistoryWhen(iso: string, timeZone: string): string {
  const loc = getLocale() === 'en' ? 'en-US' : 'ru-RU';
  return new Intl.DateTimeFormat(loc, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone
  }).format(new Date(iso));
}

export function renderProgress(container: HTMLElement) {
  const content = renderShell(container, { active: 'progress' });
  const ds = storage.getDaySummaries(60);
  const history = storage.getHistory().slice().reverse();
  const snap = loadContinuitySnapshot(storage);
  const habitHtml = `
    <div class="habit-stats-row">
      ${renderStreakChip(snap, 'pill')}
      ${renderContinuityHint(snap, 'stats')}
    </div>
  `;
  
  // Weekly chart logic
  let weeklyScore = 0;
  const bars = [];

  let activeDays = 0;
  for (let i = 6; i >= 0; i--) {
    const dStr = addCalendarDays(snap.today, -i);
    const summary = ds.find(x => calendarDayKey(x.date, snap.timeZone) === dStr);
    const score = Math.round(summary ? summary.totalScore : 0);
    if (score > 0) activeDays++;
    weeklyScore += score;
    const loc = getLocale() === 'en' ? 'en-US' : 'ru-RU';
    const label = new Intl.DateTimeFormat(loc, {weekday: 'short', timeZone: 'UTC'}).format(new Date(`${dStr}T12:00:00Z`));
    bars.push({
      label,
      score,
      pct: score > 0 ? Math.max(10, Math.min(100, (score / 3000) * 100)) : 0
    });
  }

  let chartHtml = `
    <div class="surface" style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;">
        <h3 style="margin: 0;">${L('Активность (Неделя)', 'Activity (Week)')}</h3>
        <button id="btn-weekly-review" class="btn-secondary" style="margin: 0; padding: 6px 12px; font-size: 12px; border-radius: 12px; width: auto;">${L('Итоги', 'Review')}</button>
      </div>
  `;
  if (activeDays === 0) {
    chartHtml += `<div class="empty-state" style="padding: 32px 24px; text-align: center; border-radius: 12px; background: var(--fill-subtle);"><p style="color: var(--muted); margin: 0; font-size: 13px; line-height: 1.5;">${L('График активности пока пуст.<br>После первой тренировки здесь появится честная картина регулярности, отражающая вашу реальную вовлечённость.', 'Activity chart is empty.<br>After your first session, an honest view of your regularity and engagement will appear here.')}</p></div></div>`;
  } else {
    chartHtml += `
      <p style="margin-bottom: 0;">${L(`Сумма: ${weeklyScore} очков`, `Total: ${weeklyScore} pts`)}</p>
      <div class="bar-chart" role="figure" aria-label="${L(`График активности за последние 7 дней. Сумма очков: ${weeklyScore}`, `Activity chart for the last 7 days. Total score: ${weeklyScore} points`)}">
        ${bars.map(b => `
          <div class="bar-wrap" role="group" aria-label="${L(`${b.label}: ${b.score} очков`, `${b.label}: ${b.score} pts`)}">
            ${b.score > 0 ? `<div class="bar-value" aria-hidden="true">${b.score}</div>` : ''}
            <div class="bar ${b.score > 0 ? 'has-data' : ''}" style="height: ${b.pct}%" aria-hidden="true"></div>
            <div class="bar-label" aria-hidden="true">${b.label}</div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }
    
  chartHtml += `<div id="achievements-section" style="margin-top: 24px;"></div>`;

  let historyHtml = '';
  if (history.length === 0) {
    const histEmpty = emptyPlanCopy('no_history');
    historyHtml = `<div class="empty-state" style="padding: 32px 24px; text-align: center; border-radius: 12px; background: var(--fill-subtle); margin: 16px 0;" role="status"><p style="color: var(--muted); margin: 0 0 12px; font-size: 13px; line-height: 1.5;"><strong style="display:block;color:var(--text);margin-bottom:6px;">${histEmpty.title}</strong>${histEmpty.body}</p><button type="button" class="btn-secondary empty-cta-today" style="width:100%;" data-nav="today">${histEmpty.cta}</button></div>`;
  } else {
    const historyTz = snap.timeZone || resolveFokusTimeZone().timeZone || PREFERRED_TIME_ZONE;
    historyHtml = history.map(h => {
      const dateStr = formatProgressHistoryWhen(h.date, historyTz);
      const acc = Math.round(h.accuracy * 100);
      const displayScore = Math.round(h.score);
      return `
        <div style="display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--line);">
          <div>
            <div style="font-weight: 600;">${dateStr}</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 4px;">${h.minutes} ${L('мин', 'min')}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 600; color: var(--accent);">${displayScore} ${L('очков', 'pts')}</div>
            <div style="color: var(--muted); font-size: 13px; margin-top: 4px;">${L('Точность', 'Accuracy')} ${acc}%</div>
          </div>
        </div>
      `;
    }).join('');
  }

  const domains = storage.getDomains();
  const skills = storage.getSkills();
  
  // Build domain -> skills map
  const catalogRefs = catalog.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain }));
  const trajectory = computeAbilityTrajectory({ sessions: storage.getSessions(), domains, catalog: catalogRefs });
  const domainSkills = new Map<string, Set<string>>();
  catalog.forEach(ex => {
    if (!domainSkills.has(ex.manifest.domain)) {
      domainSkills.set(ex.manifest.domain, new Set());
    }
    ex.manifest.skills.forEach(sk => domainSkills.get(ex.manifest.domain)!.add(sk));
  });

  const allDomains = [
    {id: 'attention', name: L('Внимание', 'Attention')},
    {id: 'memory', name: L('Память', 'Memory')},
    {id: 'speed', name: L('Скорость', 'Speed')},
    {id: 'flexibility', name: L('Гибкость', 'Flexibility')},
    {id: 'logic', name: L('Логика', 'Logic')}
  ];

  const sortedDomains = [...domains].sort((a, b) => a.value - b.value);
  const weakestDomainId = sortedDomains.length > 0 ? sortedDomains[0].domain : null;

  const hasProfileData = domains.some(d => d.value > 0) || skills.some(s => s.value > 0);

  let profileHtml = '';
  if (!hasProfileData) {
    profileHtml = `<div class="empty-state" style="padding: 32px 24px; text-align: center; border-radius: 12px; background: var(--fill-subtle);"><p style="color: var(--muted); font-size: 13px; margin: 0; line-height: 1.5;">${L('Профиль навыков пока пуст.<br>Он появится после первых тренировок и покажет вашу точность и скорость в конкретных упражнениях.', 'Skill profile is empty.<br>It will appear after your first sessions and show your accuracy and speed across specific exercises.')}</p></div>`;
  } else {
    profileHtml = allDomains.map(d => {
      const dVal = domains.find(x => x.domain === d.id);
      if (!dVal) return '';
    const dScore = Math.round(dVal.value);
    
    // Find skills for this domain
    const dSkillNames = Array.from(domainSkills.get(d.id) || []);
    const dSkills = skills.filter(s => dSkillNames.includes(s.skill)).sort((a,b) => b.value - a.value);
    
    const skillsListHtml = dSkills.map(s => {
      const displayVal = Math.round(s.value);
      const isReliable = s.confidence >= 10;
      
      const trendStr = s.trend > 0 ? '↑' : s.trend < 0 ? '↓' : '→';
      const trendColor = 'var(--text)';
      const skillName = skillLabel(s.skill);
      
      const valueText = isReliable ? `<span style="color: ${trendColor}; opacity: 0.6; font-size: 11px; margin-right: 4px;">${trendStr}</span><span style="font-weight: 600;">${displayVal}</span>` : `<span style="color: var(--muted); font-size: 11px;">${L('калибровка...', 'calibrating...')}</span>`;
      
      return `
        <div style="margin-top: 12px; padding-left: 12px; border-left: 2px solid ${isReliable ? 'var(--line)' : 'var(--fill-muted)'};">
          <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
            <span style="text-transform: capitalize; color: var(--text); opacity: ${isReliable ? '0.9' : '0.6'};">${skillName}</span>
            <span>${valueText}</span>
          </div>
          
          ${isReliable ? `<div style="font-size: 10px; color: var(--muted); margin-top: 4px; display: flex; justify-content: space-between;">
            <span>${L('Попыток', 'Attempts')}: ${s.attempts}</span>
          </div>` : ''}
        </div>
      `;
    }).join('');

    const emptyStateHtml = dSkills.length === 0 ? `
      <div style="padding: 16px 12px; text-align: center; color: var(--muted); font-size: 12px; background: var(--fill-subtle); border-radius: 8px; margin-top: 12px;">
        ${L(
          `Пока нет данных. Тренируйте «${domainLabel(d.id).toLowerCase()}», чтобы открыть честную аналитику по навыкам.`,
          `No data yet. Train "${domainLabel(d.id).toLowerCase()}" to unlock honest skill analytics.`
        )}
      </div>
    ` : '';

    const tr = trajectory.domains.find(t => t.domain === d.id);
    const trLabel = tr ? (tr.trend === "rising" ? L("растёт ↑", "rising ↑") : tr.trend === "falling" ? L("снижается ↓", "falling ↓") : tr.trend === "stable" ? L("стабильно →", "stable →") : L("сбор данных", "collecting data")) : "";
    const isWeakest = d.id === weakestDomainId && dScore > 0;
    return `
      <div class="domain-card dom-${d.id}" style="margin-bottom: 16px; padding: 16px; border-radius: 12px; background: var(--surface); border: 1px solid var(--line); position: relative;">
        ${isWeakest ? `<div style="position: absolute; top: -10px; right: 16px; background: var(--line); color: var(--text); font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 12px; text-transform: uppercase; letter-spacing: 0.5px;">${L('Фокус внимания', 'Focus area')}</div>` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: ${(dSkills.length > 0 || dScore === 0) ? '12px' : '0'};">
          <div>
            <div style="display: flex; align-items: baseline; gap: 8px;">
              <span style="font-weight: 700; font-size: 16px; color: ${dScore > 0 ? `var(--dom-${d.id})` : 'var(--muted)'}; opacity: ${dScore > 0 ? '1' : '0.6'};">${domainLabel(d.id)}</span>
              ${trLabel && dScore > 0 ? `<span style="font-size: 11px; color: var(--muted);">${trLabel}</span>` : ""}
            </div>
            ${tr && tr.avgSpeedMs && dScore > 0 ? `<div style="font-size: 11px; color: var(--muted); margin-top: 2px;">${L(`Скорость реакции: ~${tr.avgSpeedMs} мс`, `Reaction speed: ~${tr.avgSpeedMs} ms`)}</div>` : ""}
          </div>
          <div style="font-size: 18px; font-weight: 800; color: ${dScore > 0 ? 'inherit' : 'var(--muted)'};">${dScore > 0 ? dScore : '—'}</div>
        </div>
        ${skillsListHtml}
        ${emptyStateHtml}
      </div>
    `;
    }).join('');
  }

  const exStates = storage.getExerciseStates();
  const sessions = storage.getSessions();
  const insights = generateInsights(domains, skills, exStates, ds, sessions);
  
  let generatedInsightsHtml = '';
  if (insights.length > 0) {
    generatedInsightsHtml = `
      <div class="surface" style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 16px;">${L('Инсайты', 'Insights')}</h3>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${insights.slice(0, 2).map(ins => `
            <div style="padding: 16px; background: var(--fill-subtle); border: 1px solid var(--fill-muted); border-radius: 12px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--accent); margin-bottom: 4px;">${ins.title}</div>
              <div style="font-size: 13px; color: var(--text); line-height: 1.5;">${ins.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  const insightHtml = transferCardFromStorage({ prefer: 'week' });

  // Next Step Block
  
  const profile = storage.getProfile();
  const ritual = planWithRecovery({
    durationSec: profile.sessionLengthSec || 300,
    catalog,
    domains,
    skills,
    states: exStates,
    primaryGoal: profile.primaryGoal,
    sessions: storage.getSessions(),
    daySummaries: ds,
    recoveryHintsEnabled: profile.recoveryHints !== false
  });
  const plan = ritual.plan;

  let nextStepHtml = '';
  if (plan.items.length > 0) {
    const nextItem = plan.items[0];
    const nextEx = getManifest(nextItem.exerciseId);
    if (nextEx) {
      const exDisplay = exerciseName(nextEx);
      const reasonDisplay = planReasonText(nextItem.reason);
      nextStepHtml = `
        <div class="surface" style="margin-bottom: 24px;">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${L('Следующий шаг', 'Next step')}</div>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">${exDisplay}</div>
              <div style="font-size: 13px; color: var(--text); opacity: 0.8;">${reasonDisplay}</div>
            </div>
            <img src="${exerciseIconSrc(nextEx.id, nextEx.domain)}" width="40" height="40" alt="" decoding="async" style="border-radius: 8px; opacity: 0.9;">
          </div>
        </div>
      `;
    }
  }

  // Render achievements
  import('../../core/achievements').then(({ ACHIEVEMENTS_DEF, achievementName, achievementDescription }) => {
    const achSection = content.querySelector('#achievements-section');
    if (achSection) {
      const userAchievements = profile.achievements || [];
      if (userAchievements.length > 0) {
        let html = `<h3 style="margin-bottom: 16px;">${L('Достижения', 'Achievements')}</h3><div role="list" aria-label="${L('Ваши достижения', 'Your achievements')}" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)); gap: 12px;">`;
        userAchievements.forEach(id => {
          const def = ACHIEVEMENTS_DEF.find(a => a.id === id);
          if (def) {
            const name = achievementName ? achievementName(def) : def.name;
            const desc = achievementDescription ? achievementDescription(def) : def.description;
            html += `
              <div role="listitem" aria-label="${L('Достижение', 'Achievement')}: ${name}. ${desc}" class="surface" style="padding: 12px 8px; text-align: center; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);">
                <div aria-hidden="true" style="font-size: 32px; margin-bottom: 4px;">${def.icon}</div>
                <div aria-hidden="true" style="font-size: 11px; font-weight: 700; line-height: 1.1;">${name}</div>
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
      <div style="margin-bottom: 6px;"><strong>${L('Форма (Performance)', 'Form (Performance)')}</strong> — ${L('как вы справляетесь прямо сейчас.', 'how you are performing right now.')}</div>
      <div style="margin-bottom: 6px;"><strong>${L('Освоение (Mastery)', 'Mastery')}</strong> — ${L('насколько результаты устойчиво закреплены.', 'how solidly your results are established.')}</div>
      <div><strong>${L('Полнота данных', 'Data sufficiency')}</strong> — ${L('сколько свежих наблюдений есть; это не вероятность и не точность оценки.', 'how many fresh observations exist; not a probability or accuracy score.')}</div>
    </div>
  `;

  // Align Progress/Stats with Today/Program/Coach: same continuity + today-plan story.
  const playedToday = snap.streak.playedToday;
  const lastStreak = snap.streak.current;
  const shieldCharges = typeof (profile as { shieldCharges?: number }).shieldCharges === 'number'
    ? (profile as { shieldCharges?: number }).shieldCharges
    : undefined;

  let rhythmHtml = '';
  try {
    const retSnap = assessRetention({
      daySummaries: ds,
      sessions,
      domains,
      playedToday,
      streak: lastStreak,
      skippedYesterday: snap.streak.openMisses === 1,
      sessionLengthSec: profile.sessionLengthSec,
      shieldCharges
    });
    if (retSnap.confidence >= 15) {
      const programRetention = describeProgramRetention(retSnap, {
        profileLengthSec: profile.sessionLengthSec,
        softReturnActive: snap.ritual.active,
        playedToday
      });
      const weekRitual = getTodayRitual(profile.firstWeekPlan, snap.today, ds);
      const planExplain = explainTodayPlan({
        calibrated: !!profile.calibrated,
        playedToday,
        continuity: snap,
        retention: retSnap,
        programRetention,
        focusDomains: programRetention.focusDomain ? [programRetention.focusDomain] : [],
        inFirstWeek: weekRitual.inFirstWeek,
        weekRitualCopy: weekRitual.copy || null,
        weekRitual
      });
      const rows = retSnap.signals.map(s => {
        const pct = Math.max(4, s.score);
        return `<div class="rhythm-signal">
          <div class="rhythm-signal-head"><span>${signalLabel(s.id)}</span><span>${s.score}</span></div>
          <div class="scale-track rhythm-track"><div class="scale-fill" style="width:${pct}%;"></div></div>
        </div>`;
      }).join('');
      // Progress projection of the shared story: same body/tone, stats-facing kicker.
      const isEn = getLocale() === 'en';
      const storyTitle = isEn ? 'Training rhythm' : planExplain.title;
      const storyBody = isEn
        ? 'Consistent sessions maintain your habit without fatigue or pressure.'
        : planExplain.body;
      const rhythmLine = isEn
        ? `Rhythm ${retSnap.rhythm} · ${bandLabel(retSnap.band)}`
        : planExplain.rhythmLine || `Ритм ${retSnap.rhythm} · ${bandLabel(retSnap.band)}`;
      const whyLine =
        planExplain.whyExercises && planExplain.whyExercises !== storyBody && !isEn
          ? `<p class="rhythm-why plan-why" data-plan-source="${planExplain.source}">${planExplain.whyExercises}</p>`
          : '';
      const ariaText = isEn
        ? `Training rhythm: ${retSnap.rhythm}. ${bandLabel(retSnap.band)}.`
        : planExplain.aria.replace(/"/g, '&quot;');
      rhythmHtml = `
        <div class="surface rhythm-card band-${retSnap.band} coach-${planExplain.tone}" data-rhythm="${retSnap.rhythm}" data-plan-source="${planExplain.source}" aria-label="${ariaText}">
          <div class="rhythm-head">
            <div>
              <div class="fi-kicker">${L('Ритм тренировок', 'Training rhythm')}</div>
              <div class="rhythm-value">${retSnap.rhythm}</div>
              <div class="fi-meta">${rhythmLine}</div>
            </div>
          </div>
          <p class="rhythm-nudge-title" data-plan-title="${planExplain.source}">${storyTitle}</p>
          <p class="rhythm-nudge">${storyBody}</p>
          ${whyLine}
          ${rows}
        </div>`;
    }
  } catch {
    rhythmHtml = '';
  }


  const fi = computeFokusIndex(domains, exStates, { sessions });
  const intel = buildCoachIntel({
    summaries: ds,
    domains,
    window: 14,
    asOf: new Date().toISOString(),
    trajectory
  });
  const sparkCount = intel.sparkline.points.filter((p) => p.value != null).length;
  const sparkHtml = sparkCount >= 2
    ? `<div class="fi-spark">${renderIndexSparkline(intel.sparkline, { width: 220, height: 44 })}<span class="fi-spark-lbl">${intel.sparkline.deltaLabel}</span></div>`
    : '';
  const legacyNoteHtml = intel.sparkline.legacyDays > 0
    ? `<p class="fi-legacy-note" data-legacy-days="${intel.sparkline.legacyDays}" style="font-size: 12px; color: var(--muted); margin: 4px 0 0;">${L(
        `Дней по прежней методике (v1): ${intel.sparkline.legacyDays}. Они сохранены, но не показаны на графике и не сравниваются с текущими.`,
        `Days using previous methodology (v1): ${intel.sparkline.legacyDays}. They are preserved, but not shown on the chart or compared with current data.`
      )}</p>`
    : '';
  // Methodology v2: no index personal record (the index mixes exercises and levels).

  const band = personalIndexBand(ds, new Date().toISOString());
  const bandHtml = band ? `<div class="fi-personal-band" data-personal-band="1" style="font-size: 12px; color: var(--text); opacity: 0.9; margin-top: 8px; background: var(--fill-muted); padding: 8px; border-radius: 6px;">${band.line}</div>` : '';


  const depthHtml = `
    <div class="fi-depth" style="margin-top: 16px; font-size: 13px; color: var(--text);">
      <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
        <span style="opacity: 0.8;">${L('Глубина профиля', 'Profile depth')}</span>
        <strong>${L(`${fi.depth.explored} из ${fi.depth.total}`, `${fi.depth.explored} of ${fi.depth.total}`)}</strong>
      </div>
      <div class="scale-track" style="height: 4px; background: var(--track); margin-bottom: 6px;">
        <div class="scale-fill" style="width: ${fi.depth.percent}%; background: var(--text); opacity: 0.8;"></div>
      </div>
      <div style="font-size: 11px; color: var(--muted);">${L(
        `Освоено ${fi.depth.percent}% каталога (≥3 сессий)`,
        `Explored ${fi.depth.percent}% of catalog (≥3 sessions)`
      )}</div>
    </div>
  `;

  // Methodology v2: personal trend per exercise under comparable conditions — separate from the index.
  const isEn = getLocale() === 'en';
  const activeMetricCopy = isEn ? METRIC_COPY_EN : METRIC_COPY;
  const trendIds = [...new Set(sessions.filter((x) => x.mode !== 'calibration' && x.mode !== 'recalibration').flatMap((x) => x.items.map((i) => i.exerciseId)))];
  const trends = trendIds
    .map((id) => {
      const manifest = getManifest(id);
      const name = manifest ? exerciseName(manifest) : id;
      return { t: exerciseTrend({ sessions, exerciseId: id }), name };
    })
    .filter((x) => x.t.observations > 0)
    .sort((a, b) => b.t.observations - a.t.observations)
    .slice(0, 8);
  const trendRows = trends.map(({ t, name }) => {
    const hint = t.verdict === 'insufficient'
      ? L(
          `ещё ${t.needMore} ${t.needMore === 1 ? 'блок' : t.needMore < 5 ? 'блока' : 'блоков'} для сравнения`,
          `${t.needMore} more ${t.needMore === 1 ? 'block' : 'blocks'} needed for comparison`
        )
      : L(`${t.observations} сопоставимых блоков`, `${t.observations} comparable blocks`);
    const accessibleModeText = L('доступный режим', 'accessible mode');
    return `<div class="trend-row" data-trend="${t.verdict}" style="display: flex; justify-content: space-between; gap: 8px; font-size: 13px; padding: 6px 0; border-bottom: 1px solid var(--line);"><span>${name}${t.mode === 'accessible' ? ` <small data-mode="accessible">(${accessibleModeText})</small>` : ''}</span><span style="color: var(--muted); text-align: right;">${t.label} · ${hint}</span></div>`;
  }).join('');
  const personalTrendHtml = `
    <section class="surface personal-trends" aria-labelledby="pt-title" style="margin: 16px 0; padding: 16px; border-radius: 12px;">
      <h3 id="pt-title" style="margin: 0 0 4px 0; font-size: 16px;">${activeMetricCopy.personalTrend.title}</h3>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: var(--muted);">${activeMetricCopy.personalTrend.measures}</p>
      ${trendRows || `<p style="font-size: 13px; color: var(--muted);">${L('Появится, когда в одном упражнении наберётся 6 сопоставимых блоков.', 'Will appear once 6 comparable blocks are completed in an exercise.')}</p>`}
      <p style="margin: 8px 0 0 0; font-size: 11px; color: var(--muted);">${activeMetricCopy.personalTrend.cannotConclude}</p>
      <p data-data-sufficiency="${fi.dataSufficiency.level}" style="margin: 8px 0 0 0; font-size: 12px;"><strong>${activeMetricCopy.dataSufficiency.title}:</strong> ${fi.dataSufficiency.label} · ${fi.dataSufficiency.facts}</p>
    </section>
  `;

  const fiExplainHtml = `
    <div id="fi-explainer" style="display: none; margin-top: 16px; padding: 12px; background: var(--fill-muted); border-radius: 8px; font-size: 12px; line-height: 1.5; color: var(--text); text-align: left;">
      <p style="margin: 0 0 8px 0;"><strong>${L('Как работает Fokus Index?', 'How does Fokus Index work?')}</strong></p>
      <p style="margin: 0 0 8px 0; color: var(--muted);">${L(
        'Это прозрачный индикатор вашей текущей тренировочной формы. Он опирается на фактические результаты, а не на выдуманные цифры, и отражает реальную скорость и точность в упражнениях.',
        'This is a transparent indicator of your current training form. It relies on actual performance rather than arbitrary numbers, reflecting your real speed and accuracy across exercises.'
      )}</p>
      <p style="margin: 0 0 8px 0; color: var(--muted);"><strong>${activeMetricCopy.fokusIndex.title}.</strong> ${activeMetricCopy.fokusIndex.measures} ${activeMetricCopy.fokusIndex.cannotConclude}</p>
      <p data-data-sufficiency="${fi.dataSufficiency.level}" style="margin: 0 0 8px 0; color: var(--muted);"><strong>${activeMetricCopy.dataSufficiency.title}: ${fi.dataSufficiency.label}</strong> (${fi.dataSufficiency.facts}). ${activeMetricCopy.dataSufficiency.cannotConclude}</p>
      ${fi.explain.balanceStr ? `<p style="margin: 0 0 8px 0; color: var(--muted);"><strong>${L('Баланс:', 'Balance:')}</strong> ${fi.explain.balanceStr}</p>` : ''}
      <p style="margin: 0; color: var(--muted);">${L(
        'Небольшие колебания индекса — обычный разброс (усталость, сон, время суток). Значения до 12.11.2026 посчитаны по прежней методике (версия 1) и не пересчитывались.',
        'Slight index fluctuations are normal day-to-day variance (fatigue, sleep, time of day). Values before Nov 12, 2026 were computed using the previous methodology (v1) and have not been recalculated.'
      )}</p>
    </div>
  `;

  const btnExplain = `<button id="btn-explain-index" class="btn-text" style="font-size: 11px; color: var(--accent); padding: 4px 0; margin-top: 8px; cursor: pointer; border: none; background: transparent; display: inline-block;" aria-expanded="false" aria-controls="fi-explainer">${L('Как считается индекс?', 'How is the index calculated?')}</button>`;

  const fiHtml = fi.phase === 'established' ? `
    <div class="fi-hero">
      <div class="fi-copy">
        <div class="fi-kicker">Fokus Index</div>
        <div class="fi-value">${fi.value}</div>
        <div class="fi-meta">${L(`${fi.coverage} из 5 областей`, `${fi.coverage} of 5 domains`)} · ${fi.explain.state}</div>
        ${fi.balance !== 'unknown' && fi.explain.balanceStr ? `<div class="fi-meta" style="margin-top: 4px; opacity: 0.8; font-size: 12px; max-width: 280px; margin-left: auto; margin-right: auto; line-height: 1.3;">${fi.explain.balanceStr}</div>` : ''}
        ${bandHtml}
        ${sparkHtml}
        ${legacyNoteHtml}
        ${depthHtml}
        <p class="fi-disclaimer" style="font-size: 10px; color: var(--muted); margin-top: 12px; line-height: 1.3;">${fi.explain.action}</p>
        ${btnExplain}
        ${fiExplainHtml}
      </div>
      <div class="fi-radar" aria-label="${L('Диаграмма Фокус Индекса по областям', 'Fokus Index radar chart by domain')}">${renderRadarChart(fi.byDomain, { size: 200, max: 1200 })}</div>
    </div>
  ` : fi.phase === 'calibrating' ? `
    <div class="fi-hero sparse" style="display: flex; align-items: center; justify-content: center; text-align: center; padding: 32px 16px;">
      <div class="fi-copy" style="width: 100%;">
        <div class="fi-kicker">Fokus Index</div>
        <div class="fi-value" style="font-size: 24px; color: var(--text); opacity: 0.8; margin: 8px 0;">${L('Калибровка...', 'Calibrating...')}</div>
        <div class="fi-meta" style="margin-bottom: 12px; color: var(--text); opacity: 0.9;">${fi.explain.state}<br>${fi.explain.action}</div>
        ${bandHtml}
        ${depthHtml}
        <p class="fi-disclaimer" style="font-size: 10px; color: var(--muted); margin-top: 12px; line-height: 1.3;">${L(
          'Пока данных мало для оценки. Индекс временно скрыт, так как мы не генерируем приблизительные баллы, а опираемся на ваши реальные метрики.',
          'Not enough data yet for evaluation. The index is hidden temporarily because we rely on your real metrics rather than generating arbitrary scores.'
        )}</p>
        ${btnExplain}
        ${fiExplainHtml}
      </div>
    </div>
  ` : `
    <div class="fi-hero empty" style="display: flex; align-items: center; justify-content: center; text-align: center; padding: 32px 16px;">
      <div class="fi-copy" style="width: 100%;">
        <div class="fi-kicker">Fokus Index</div>
        <div class="fi-value" style="font-size: 24px; color: var(--muted); margin: 8px 0;">—</div>
        <div class="fi-meta" style="color: var(--muted);">${fi.explain.state}</div>
        ${bandHtml}
        ${depthHtml}
        <p class="fi-disclaimer" style="font-size: 10px; color: var(--muted); margin-top: 16px; line-height: 1.3;">${fi.explain.action}</p>
        ${btnExplain}
        ${fiExplainHtml}
      </div>
    </div>
  `;

  const nextMile = intel.milestones.find((m) => !m.reached);
  const streakText = intel.adherence.currentStreak > 0
    ? L(`сейчас ${intel.adherence.currentStreak}`, `current ${intel.adherence.currentStreak}`)
    : L('серия начнётся с сегодняшней сессии', 'streak starts with today\'s session');
  const nextMileText = nextMile
    ? L(` · дальше ${nextMile.days}`, ` · next ${nextMile.days}`)
    : '';
  const milestonesHtml = intel.ready ? `
    <div class="intel-card intel-card-compact" style="margin-bottom: 24px;">
      <div class="intel-kicker">${L('Вехи серии', 'Streak milestones')}</div>
      <div class="intel-miles">
        ${intel.milestones.map((m) => {
          const state = m.reached ? 'reached' : nextMile && m.days === nextMile.days ? 'next' : '';
          return `<div class="intel-mile ${state}">
            <div class="intel-mile-mark">${m.reached ? '●' : '○'}</div>
            <div class="intel-mile-n">${m.days}</div>
            <div class="intel-mile-l">${L('дней', 'days')}</div>
          </div>`;
        }).join('')}
      </div>
      <p class="intel-rhythm">${streakText}${nextMileText}</p>
    </div>
  ` : '';

  const goal = getWeeklyGoal();
  const goalProgressPct = Math.min(100, Math.max(0, (goal.progress / goal.target) * 100));
  const weeklyGoalHtml = `
    <div class="surface" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 8px;">${L(`Цель недели: ${domainLabel(goal.domain)}`, `Weekly goal: ${domainLabel(goal.domain)}`)}</h3>
      <p style="font-size: 13px; color: var(--text); opacity: 0.8; margin-bottom: 12px;">${L(
        `Выполните ${goal.target} упражнений для этой области (сейчас это ваше слабое звено).`,
        `Complete ${goal.target} exercises for this domain (currently your focus area).`
      )}</p>
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-weight: 600;">
        <span>${L('Прогресс', 'Progress')}</span>
        <span>${goal.progress} / ${goal.target}</span>
      </div>
      <div class="scale-track" style="height: 6px; background: var(--track);"><div class="scale-fill" style="width: ${goalProgressPct}%; background: var(--dom-${goal.domain});"></div></div>
    </div>
  `;

  const sleepData = ds.filter(d => d.lifestyle?.sleep && d.totalScore > 0);
  const sleepHtml = sleepData.length >= 5 ? `
    <div class="surface" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 16px;">${L('Влияние сна на результат', 'Impact of sleep on performance')}</h3>
      ${renderScatterPlot(
        sleepData.map(d => ({
          x: d.lifestyle!.sleep === 'high' ? 9 : d.lifestyle!.sleep === 'normal' ? 7 : 5,
          y: d.totalScore
        })),
        L('Сон (часы)', 'Sleep (hours)'), L('Очки', 'Points')
      )}
    </div>` : `
    <div class="surface" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 16px;">${L('Влияние сна на результаты', 'Impact of sleep on performance')}</h3>
      <div class="empty-state" style="padding: 32px 24px; text-align: center; border-radius: 12px; background: var(--fill-subtle);">
        <p style="color: var(--muted); font-size: 13px; margin: 0; line-height: 1.5;">${L(
          `Отмечайте качество сна после сессий, чтобы увидеть, как он влияет на вашу форму.<br>(Собрано ${sleepData.length} из 5 необходимых записей для графика)`,
          `Log sleep quality after sessions to see how it affects your performance.<br>(${sleepData.length} of 5 required entries collected for the chart)`
        )}</p>
      </div>
    </div>`;

  const catalogRefsForNorms = catalog.map((c) => ({ id: c.manifest.id, domain: c.manifest.domain }));
  const attemptSamples = collectAttemptSamples(sessions, catalogRefsForNorms, 'accuracy');
  const domainNormRows = normsByDomain(attemptSamples);
  const anyNormReady = domainNormRows.some((r) => r.result.status === 'ok');
  const anyNormAttempts = attemptSamples.length > 0;
  const normsDisclaimer = getLocale() === 'en' ? normsDisclaimerEn() : normsDisclaimerRu();
  const localNormsHtml = `
    <div class="surface local-norms-card" data-local-norms="1" style="margin-bottom: 24px;" role="region" aria-label="${L('Личные нормы', 'Personal norms')}">
      <h3 style="margin-bottom: 8px;">${L('Личные нормы', 'Personal norms')}</h3>
      <p style="font-size: 12px; color: var(--muted); margin: 0 0 12px; line-height: 1.4;">${normsDisclaimer}</p>
      ${!anyNormAttempts ? `
        <div class="empty-state" style="padding: 20px 16px; text-align: center; border-radius: 12px; background: var(--fill-subtle);">
          <p style="color: var(--muted); margin: 0; font-size: 13px; line-height: 1.5;">${L(
            'Пока нет своих попыток.<br>После нескольких тренировок здесь появятся перцентили только по вашей истории.',
            'No attempts yet.<br>After a few sessions, percentiles based strictly on your personal history will appear here.'
          )}</p>
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${domainNormRows.map((row) => {
            const res = row.result;
            if (res.status === 'ok') {
              return `
              <div class="local-norm-row" data-domain="${row.domain}" data-status="ok" style="padding: 12px; border-radius: 10px; background: var(--fill-subtle); border: 1px solid var(--line);">
                <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                  <span style="font-weight: 700; color: var(--dom-${row.domain});">${domainLabel(row.domain)}</span>
                  <span style="font-size: 13px; font-weight: 600; color: var(--accent);">${L(`лучше ${res.latestPercentile}%`, `better than ${res.latestPercentile}%`)}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.4;">
                  ${L(
                    `Свои прошлые попытки: медиана ${Math.round(res.median * 100)}% · типичный диапазон ${Math.round(res.p25 * 100)}–${Math.round(res.p75 * 100)}%`,
                    `Past personal attempts: median ${Math.round(res.median * 100)}% · typical range ${Math.round(res.p25 * 100)}–${Math.round(res.p75 * 100)}%`
                  )}
                </div>
              </div>
            `;
            }
            return `
              <div class="local-norm-row" data-domain="${row.domain}" data-status="insufficient" style="padding: 12px; border-radius: 10px; background: var(--fill-subtle); border: 1px solid var(--line);">
                <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                  <span style="font-weight: 700; color: var(--muted);">${domainLabel(row.domain)}</span>
                  <span style="font-size: 12px; color: var(--muted);">${L(`мало данных (${res.n} из 5)`, `insufficient data (${res.n} of 5)`)}</span>
                </div>
                <div style="font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.4;">
                  ${L(
                    'Нужно ещё несколько попыток в этой области — без выдуманных рейтингов.',
                    'A few more attempts in this domain are needed — no arbitrary ratings.'
                  )}
                </div>
              </div>
            `;
          }).join('')}
        </div>
        ${!anyNormReady ? `<p style="font-size: 12px; color: var(--muted); margin: 12px 0 0; line-height: 1.4;">${L('Данных мало: личные перцентили появятся после 5 попыток в области.', 'Sparse data: personal percentiles will appear after 5 attempts in a domain.')}</p>` : ''}
      `}
    </div>
  `;

  content.innerHTML = `
    <div class="today-head">
      <h2>${L('Статистика', 'Progress')}</h2>
      <p class="today-date">${L('Профиль ваших навыков и аналитика результатов.', 'Your skill profile and performance analytics.')}</p>
    </div>
    ${habitHtml}
    ${fiHtml}
    ${personalTrendHtml}
    ${localNormsHtml}
    <div id="session-feel-agg-slot"></div>
    ${renderQualityCard(ritual.snapshot, { detailed: true })}
    ${rhythmHtml}
    ${milestonesHtml}
    ${generatedInsightsHtml}
    ${insightHtml}
    ${weeklyGoalHtml}
    ${nextStepHtml}
    
    ${sleepHtml}

    ${chartHtml}
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">${L('Последние сессии', 'Recent sessions')}</h3>
      ${historyHtml}
    </div>

    <h3 style="margin: 32px 0 16px 0;">${L('Профиль навыков', 'Skill profile')}</h3>
    ${hasProfileData ? legendHtml : ''}
    ${profileHtml}
  `;

  content.querySelector('#btn-weekly-review')?.addEventListener('click', () => {
    import('../router').then(({navigateTo}) => navigateTo('weekly-review'));
  });

  content.querySelector('#btn-explain-index')?.addEventListener('click', (e) => {
    const btn = e.target as HTMLButtonElement;
    const explainer = content.querySelector('#fi-explainer') as HTMLElement;
    if (explainer) {
      const isHidden = explainer.style.display === 'none';
      explainer.style.display = isHidden ? 'block' : 'none';
      btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    }
  });

  content.querySelectorAll('.empty-cta-today').forEach((btn) => {
    btn.addEventListener('click', () => navigateTo('today'));
  });

  const aggSlot = content.querySelector('#session-feel-agg-slot') as HTMLElement | null;
  if (aggSlot) {
    import('../components/session-feedback').then(({ renderSessionFeelAggregateHtml }) => {
      if (!aggSlot.isConnected) return;
      aggSlot.outerHTML = renderSessionFeelAggregateHtml(7);
    }).catch(() => {});
  }

  import('../components/feedback-panel').then(({ mountFeedbackButton }) => {
    if (typeof document === 'undefined' || !content.isConnected) return;
    if (!content.querySelector('#fokus-feedback-mount')) {
      mountFeedbackButton(content, { screen: 'progress' });
    }
  }).catch(() => {});
}
