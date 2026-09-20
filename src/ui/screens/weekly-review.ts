import { storage } from '../../core/storage';
import { catalog, getManifest } from '../../exercises/catalog';
import { renderShell } from '../shell';
import { navigateTo } from '../router';
import { suggestFocusOfTheWeek } from '../../core/transfer-insights';
import { transferCardFromStorage } from '../components/transfer-card';
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
  let summaryText = '';

  if (totalSessions === 0) {
    atAGlanceHtml = `
      <div class="surface wr-empty-state">
        <h3 class="wr-empty-title">Недостаточно данных</h3>
        <p class="wr-empty-desc">На этой неделе не было тренировок. Fokus собирает данные, чтобы сформировать отчёт.</p>
      </div>
    `;
  } else {
    // Calculate average accuracy
    let totalItems = 0;
    let totalAcc = 0;
    sessions.forEach(s => {
      s.items.forEach(i => {
        totalItems++;
        totalAcc += i.accuracy;
      });
    });
    const avgAcc = totalItems > 0 ? Math.round((totalAcc / totalItems) * 100) : 0;
    
    // Most trained domain
    const domainsPlayed: Record<string, number> = {};
    sessions.forEach(s => {
      s.items.forEach(i => {
        const manifest = getManifest(i.exerciseId);
        if (manifest) {
          domainsPlayed[manifest.domain] = (domainsPlayed[manifest.domain] || 0) + 1;
        }
      });
    });
    
    let topDomainText = '';
    if (Object.keys(domainsPlayed).length > 0) {
      const topDomain = Object.keys(domainsPlayed).sort((a,b) => domainsPlayed[b] - domainsPlayed[a])[0];
      topDomainText = ` Основной фокус был на области «${domainLabel(topDomain)}».`;
    }

    summaryText = `За эту неделю вы провели ${totalSessions} ${totalSessions === 1 ? 'сессию' : (totalSessions >= 2 && totalSessions <= 4) ? 'сессии' : 'сессий'}, охватив ${totalExercises} ${totalExercises === 1 ? 'упражнение' : (totalExercises >= 2 && totalExercises <= 4) ? 'упражнения' : 'упражнений'}.${topDomainText} Средняя точность выполнения составила ${avgAcc}%.`;

    atAGlanceHtml = `
      <section class="surface wr-summary" aria-label="Сводка недели">
        <p class="wr-summary-text">${summaryText}</p>
      </section>
      <div class="wr-stats-grid" aria-label="Статистика тренировок">
        <div class="surface wr-stat">
          <div class="wr-stat-val">${activeDays}</div>
          <div class="wr-stat-label">Дней</div>
        </div>
        <div class="surface wr-stat">
          <div class="wr-stat-val">${totalSessions}</div>
          <div class="wr-stat-label">Сессий</div>
        </div>
        <div class="surface wr-stat">
          <div class="wr-stat-val">${totalExercises}</div>
          <div class="wr-stat-label">Упражнений</div>
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
      name: getManifest(id)?.name || id,
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
      <section class="surface wr-section" aria-labelledby="wr-changed-title">
        <h3 id="wr-changed-title" class="wr-section-title">Что изменилось</h3>
        <ul class="wr-changed-list">
          ${changedFacts.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </section>
    `;
  } else if (totalSessions > 0) {
    whatChangedHtml = `
      <section class="surface wr-section" aria-labelledby="wr-changed-title">
        <h3 id="wr-changed-title" class="wr-section-title">Что изменилось</h3>
        <p class="wr-empty-desc">Пока недостаточно подтверждённых изменений. Fokus продолжает калибровку ваших навыков.</p>
      </section>
    `;
  }

  // INSIGHTS
  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();
  const insightHtml = totalSessions > 0 ? transferCardFromStorage({ prefer: 'week' }) : '';

  // NEXT STEP (from recommendation engine)
  const profile = storage.getProfile();
  const weeklyFocus = suggestFocusOfTheWeek(domains, daySummaries, sessions);
  const plan = planForNow({ durationSec: profile.sessionLengthSec });

  let nextStepHtml = '';
  if (plan.items.length > 0) {
    const nextItem = plan.items[0];
    const nextEx = getManifest(nextItem.exerciseId);
    if (nextEx) {
      nextStepHtml = `
        <section class="surface wr-section wr-next-step" aria-labelledby="wr-next-title">
          <h3 id="wr-next-title" class="wr-section-title">Следующий шаг</h3>
          <div class="wr-next-content">
            <div class="wr-next-info">
              <div class="wr-next-name">${nextEx.name}</div>
              <div class="wr-next-reason">${nextItem.reason}</div>
            </div>
            <img src="${import.meta.env.BASE_URL}art/icon-${nextEx.id}.svg" alt="Иконка упражнения ${nextEx.name}" width="40" height="40" class="wr-next-icon">
          </div>
        </section>
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
    <header class="wr-header">
      <button id="btn-back" class="btn-tiny wr-btn-back" aria-label="Вернуться назад">← Назад</button>
      <div class="wr-header-titles">
        <h2 class="wr-title">Итоги недели</h2>
        <div class="wr-period">${periodStr}</div>
      </div>
    </header>
    
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
