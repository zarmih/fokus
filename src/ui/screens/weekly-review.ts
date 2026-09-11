import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { renderShell } from '../shell';
import { navigateTo } from '../router';
import { generateInsights } from '../../core/insights';
import { planForNow } from '../../core/adaptive-plan';
import { buildCoachIntel, type CoachIntel, type HistoryWindow } from '../../core/coach-intel';
import { renderIndexSparkline } from '../components/charts';
import { domainLabel } from '../../core/labels';

function ruDay(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00Z');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function renderIntelPanel(intel: CoachIntel): string {
  if (!intel.ready) return '';

  const sparkCount = intel.sparkline.points.filter((p) => p.value != null).length;
  const sparkHtml =
    sparkCount >= 2
      ? renderIndexSparkline(intel.sparkline)
      : `<p class="intel-empty">Fokus Index появится на графике после нескольких дней с данными по областям.</p>`;

  const pb = intel.personalBest;
  const pbHtml = pb
    ? `<span class="intel-pb${pb.isLatest ? ' now' : ''}">рекорд ${pb.value} · ${ruDay(pb.date)}</span>`
    : '';

  const domainHtml = intel.domains
    .map((d) => {
      const delta =
        d.windowDelta == null || !d.ready
          ? ''
          : d.windowDelta > 8
            ? `+${d.windowDelta}`
            : d.windowDelta < -8
              ? `${d.windowDelta}`
              : '→';
      const weak = intel.weakDomainId === d.id;
      return `<div class="intel-domain${d.ready ? '' : ' dim'}${weak ? ' weak' : ''}">
        <span class="intel-domain-name">${domainLabel(d.id)}</span>
        <span class="intel-domain-val">${d.ready ? Math.round(d.current) : '—'}</span>
        <span class="intel-domain-d">${delta}</span>
      </div>`;
    })
    .join('');

  const a = intel.adherence;
  const rhythm =
    a.comeback
      ? `возврат после ${a.gapDays} дн.`
      : a.currentStreak > 0
        ? `серия ${a.currentStreak}`
        : 'серия не активна';

  const mileHtml = intel.milestones
    .map((m) => {
      const state = m.reached ? 'reached' : a.currentStreak > 0 && m.days === intel.milestones.find((x) => !x.reached)?.days ? 'next' : '';
      return `<div class="intel-mile ${state}">
        <div class="intel-mile-mark">${m.reached ? '●' : '○'}</div>
        <div class="intel-mile-n">${m.days}</div>
        <div class="intel-mile-l">дней</div>
      </div>`;
    })
    .join('');

  const tipsHtml = intel.tips.length
    ? `<div class="intel-card coach-card">
        <div class="intel-kicker">Коуч недели</div>
        <ul class="intel-tips">
          ${intel.tips
            .map(
              (t) => `<li>
                <div class="intel-tip-title">${t.title}</div>
                <div class="intel-tip-body">${t.body}</div>
              </li>`
            )
            .join('')}
        </ul>
      </div>`
    : '';

  return `
    <section class="intel-block" data-window="${intel.window}">
      <div class="intel-windows" role="tablist" aria-label="Окно истории Fokus Index">
        <button type="button" class="intel-win${intel.window === 14 ? ' active' : ''}" id="intel-win-14" data-window="14">14 дней</button>
        <button type="button" class="intel-win${intel.window === 30 ? ' active' : ''}" id="intel-win-30" data-window="30">30 дней</button>
      </div>

      <div class="intel-card">
        <div class="intel-card-head">
          <div>
            <div class="intel-kicker">Fokus Index</div>
            <div class="intel-delta">${intel.sparkline.deltaLabel}</div>
          </div>
          ${pbHtml}
        </div>
        <div class="intel-spark-wrap">${sparkHtml}</div>
        <div class="intel-domains">${domainHtml}</div>
      </div>

      <div class="intel-card">
        <div class="intel-kicker">Ритм</div>
        <p class="intel-rhythm">${a.playedDays} из ${a.window} дней · ${rhythm}</p>
        <div class="intel-miles" aria-label="Вехи серии 7, 14 и 30 дней">${mileHtml}</div>
      </div>

      ${tipsHtml}
    </section>
  `;
}

export function renderWeeklyReview(container: HTMLElement, opts?: { window?: HistoryWindow }) {
  const content = renderShell(container, { active: 'progress', hideNav: true });
  const historyWindow: HistoryWindow = opts?.window === 30 ? 30 : 14;

  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  const allSummaries = storage.getDaySummaries(60);
  const sessions = storage.getSessions().filter(s => s.startedAt >= weekAgoStr);
  const daySummaries = allSummaries.filter(ds => ds.date >= weekAgoStr);
  
  const totalSessions = sessions.length;
  const activeDays = daySummaries.length;
  
  const exercisesPlayed = new Set<string>();
  sessions.forEach(s => s.items.forEach(i => exercisesPlayed.add(i.exerciseId)));
  const totalExercises = exercisesPlayed.size;

  let atAGlanceHtml = '';
  if (totalSessions === 0) {
    atAGlanceHtml = `
      <div class="surface" style="text-align: center; padding: 32px 16px;">
        <h3 style="margin-bottom: 8px;">Недостаточно данных</h3>
        <p style="color: var(--muted); margin: 0;">На этой неделе не было тренировок. Fokus собирает данные, чтобы сформировать отчёт.</p>
      </div>
    `;
  } else {
    atAGlanceHtml = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
        <div class="surface" style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">${activeDays}</div>
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase;">Дней</div>
        </div>
        <div class="surface" style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">${totalSessions}</div>
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase;">Сессий</div>
        </div>
        <div class="surface" style="text-align: center; padding: 16px 8px;">
          <div style="font-size: 24px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">${totalExercises}</div>
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase;">Упражнений</div>
        </div>
      </div>
    `;
  }

  // WHAT CHANGED
  const exerciseDeltas = new Map<string, { mBefore: number, mAfter: number, dBefore: number, dAfter: number, conf: number }>();
  
  sessions.forEach(s => {
    s.items.forEach(item => {
      if (!exerciseDeltas.has(item.exerciseId)) {
        exerciseDeltas.set(item.exerciseId, {
          mBefore: item.masteryBefore || 0,
          mAfter: item.masteryAfter || 0,
          dBefore: item.difficultyBefore || item.level,
          dAfter: item.difficultyAfter || item.level,
          conf: item.confidenceAfter || 0
        });
      } else {
        const current = exerciseDeltas.get(item.exerciseId)!;
        current.mAfter = item.masteryAfter || current.mAfter;
        current.dAfter = item.difficultyAfter || current.dAfter;
        current.conf = item.confidenceAfter || current.conf;
      }
    });
  });

  const changedFacts: string[] = [];
  let sortedDeltas = Array.from(exerciseDeltas.entries()).map(([id, data]) => {
    return {
      id,
      name: registry.find(r => r.manifest.id === id)?.manifest.name || id,
      mDelta: data.mAfter - data.mBefore,
      dDelta: data.dAfter - data.dBefore,
      conf: data.conf,
      mAfter: data.mAfter
    };
  }).filter(d => d.conf >= 20); // Need evidence (>= 3 attempts)

  sortedDeltas.sort((a, b) => b.mDelta - a.mDelta);

  if (sortedDeltas.length > 0) {
    const best = sortedDeltas[0];
    if (best.mDelta > 0) {
      changedFacts.push(`Уровень освоения <strong>${best.name}</strong> вырос на ${best.mDelta}.`);
    }
    const hardest = [...sortedDeltas].sort((a, b) => b.dDelta - a.dDelta)[0];
    if (hardest && hardest.dDelta > 0 && hardest.id !== best.id) {
      changedFacts.push(`Fokus повысил сложность в <strong>${hardest.name}</strong> на ${hardest.dDelta.toFixed(1)}.`);
    }
    const plateau = sortedDeltas.find(d => d.mDelta === 0 && d.mAfter > 50);
    if (plateau && changedFacts.length < 3) {
      changedFacts.push(`Результат в <strong>${plateau.name}</strong> стабилен, навык закрепляется.`);
    }
  }

  let whatChangedHtml = '';
  if (changedFacts.length > 0) {
    whatChangedHtml = `
      <div class="surface" style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 16px;">Что изменилось</h3>
        <ul style="padding-left: 16px; margin: 0; color: var(--text); font-size: 14px; line-height: 1.5;">
          ${changedFacts.map(f => `<li style="margin-bottom: 8px;">${f}</li>`).join('')}
        </ul>
      </div>
    `;
  } else if (totalSessions > 0) {
    whatChangedHtml = `
      <div class="surface" style="margin-bottom: 24px;">
        <h3 style="margin-bottom: 12px;">Что изменилось</h3>
        <p style="color: var(--muted); margin: 0; font-size: 14px;">Пока недостаточно подтверждённых изменений. Fokus продолжает калибровку ваших навыков.</p>
      </div>
    `;
  }

  // INSIGHTS
  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();
  const insights = generateInsights(domains, skills, states, daySummaries, sessions);
  
  let insightHtml = '';
  if (insights.length > 0 && totalSessions > 0) {
    insightHtml = `
      <div class="surface" style="margin-bottom: 24px; border-left: 4px solid var(--accent);">
        <h3 style="margin-bottom: 12px;">Что Fokus заметил</h3>
        <p style="margin: 0; font-size: 14px; line-height: 1.4;">${insights[0].description}</p>
      </div>
    `;
  }

  // NEXT STEP (from recommendation engine)
  const profile = storage.getProfile();
  const plan = planForNow({ durationSec: profile.sessionLengthSec });

  let nextStepHtml = '';
  if (plan.items.length > 0) {
    const nextItem = plan.items[0];
    const nextEx = registry.find(r => r.manifest.id === nextItem.exerciseId)?.manifest;
    if (nextEx) {
      nextStepHtml = `
        <div class="surface" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%);">
          <h3 style="margin-bottom: 16px;">Следующий шаг</h3>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 16px; font-weight: 700; color: var(--accent); margin-bottom: 4px;">${nextEx.name}</div>
              <div style="font-size: 13px; color: var(--text); opacity: 0.8;">${nextItem.reason}</div>
            </div>
            <img src="${import.meta.env.BASE_URL}art/icon-${nextEx.id}.svg" alt="" width="40" height="40" style="border-radius: 8px; opacity: 0.9;">
          </div>
        </div>
      `;
    }
  }
  
  const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
  const periodStr = `${dateFormatter.format(weekAgo)} — ${dateFormatter.format(now)}`;

  const intel = buildCoachIntel({
    summaries: allSummaries,
    domains,
    window: historyWindow,
    asOf: now.toISOString()
  });
  const intelHtml = renderIntelPanel(intel);

  content.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <button id="btn-back" class="btn-tiny" style="margin-right: 16px; margin-bottom: 0;">← Назад</button>
      <div>
        <h2 style="margin: 0; font-size: 20px;">Итоги недели</h2>
        <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${periodStr}</div>
      </div>
    </div>
    
    ${atAGlanceHtml}
    ${intelHtml}
    ${whatChangedHtml}
    ${insightHtml}
    ${nextStepHtml}
  `;

  content.querySelector('#btn-back')?.addEventListener('click', () => {
    navigateTo('progress');
  });

  content.querySelector('#intel-win-14')?.addEventListener('click', () => {
    renderWeeklyReview(container, { window: 14 });
  });
  content.querySelector('#intel-win-30')?.addEventListener('click', () => {
    renderWeeklyReview(container, { window: 30 });
  });
}
