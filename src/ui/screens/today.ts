import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { planWithRecovery } from '../../core/recovery';
import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { getLevelProgress } from '../../core/xp';
import { generateInsights } from '../../core/insights';
import { getDailyQuests } from '../../core/quests';
import { getDailySpark } from '../../core/coach';
import { computeFokusIndex, previousFokusIndex, indexDelta } from '../../core/fokus-index';
import { domainLabel, leagueName } from '../../core/labels';
import { renderRadarChart } from '../components/charts';
import { renderQualityCard } from '../components/quality-card';

export function renderToday(container: HTMLElement) {
  const content = renderShell(container, { active: 'today' });
  const profile = storage.getProfile();
  const lvl = getLevelProgress(profile.xp || 0);
  const greetName = profile.displayName || (profile.name !== 'User' ? profile.name : '');

  const ds = storage.getDaySummaries();
  const todayStr = new Date().toISOString().split('T')[0];
  const playedToday = ds.some(d => d.date.startsWith(todayStr));

  let streak = 0;
  let skippedYesterday = false;
  let yesterdayScore = 0;
  if (ds.length > 0) {
    const last = ds[ds.length - 1];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    if (playedToday) {
      streak = last.streak;
      skippedYesterday = !!last.skipped;
    } else if (last.date.startsWith(yesterdayDate.toISOString().split('T')[0])) {
      streak = last.streak;
      yesterdayScore = Math.round(last.totalScore);
    } else {
      skippedYesterday = true;
    }
  }

  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();
  const sessions = storage.getSessions();
  const ritual = planWithRecovery({
    durationSec: profile.sessionLengthSec,
    catalog: registry as any,
    domains,
    skills,
    states,
    primaryGoal: profile.primaryGoal,
    sessions,
    daySummaries: ds,
    recoveryHintsEnabled: profile.recoveryHints !== false
  });
  const plan = ritual.plan;
  const ritualDuration = ritual.snapshot.durationSec;

  const fi = computeFokusIndex(domains);
  const prevFi = previousFokusIndex(ds, new Date().toISOString());
  const fiDelta = indexDelta(fi.value, prevFi);

  const focusText = plan.focusDomains.length > 0
    ? plan.focusDomains.map(d => domainLabel(d)).join(' + ')
    : 'Сбалансированная тренировка';

  const compositionHtml = plan.items.map((item, index) => {
    const r = registry.find(x => x.manifest.id === item.exerciseId);
    const isPrimary = index === 0;
    return `<div class="chip dom-${r?.manifest.domain} workout-chip ${isPrimary ? 'primary' : ''}">
      <img src="${import.meta.env.BASE_URL}art/icon-${r?.manifest.id}.svg" width="18" height="18" alt="">
      <span>${r?.manifest.name}</span>
    </div>`;
  }).join('');

  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер';
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = new Date().toLocaleDateString('ru-RU', dateOptions);

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
    focusDomains: plan.focusDomains
  });

  const insights = generateInsights(domains, skills, states, ds, sessions);
  const topInsight = insights[0];

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
          <div class="scale-track quest-track"><div class="scale-fill" style="width: ${pct}%; background: ${q.completed ? 'var(--ok)' : 'var(--accent)'};"></div></div>
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

  let actionHtml = '';
  if (!profile.calibrated) {
    actionHtml = `
      <div class="workout-card">
        <div class="workout-kicker">Первый шаг</div>
        <h3>Калибровка уровня</h3>
        <p>Три коротких блока, около 90 секунд. После этого Fokus соберёт персональную сессию.</p>
        <button id="btn-start" class="btn-primary">Пройти калибровку</button>
      </div>
    `;
  } else if (playedToday) {
    actionHtml = `
      <div class="workout-card done">
        <div class="workout-kicker">Сегодня</div>
        <h3>План выполнен</h3>
        <p>Дополнительная сессия не ломает прогресс — но лучший эффект даёт завтрашний ритуал.</p>
        <button id="btn-start" class="btn-secondary">Ещё одна сессия</button>
      </div>
    `;
  } else {
    const rest = ritual.snapshot.gate.active;
    actionHtml = `
      <div class="workout-card ${rest ? 'rest-light' : ''}">
        <div class="workout-kicker">${rest ? 'Сегодня легче' : 'Тренировка дня'}</div>
        <h3>${Math.floor(ritualDuration / 60)} минут · ${focusText}</h3>
        <div class="workout-chips">${compositionHtml}</div>
        <button id="btn-start" class="btn-primary">Начать сессию</button>
      </div>
    `;
  }

  content.innerHTML = `
    <div class="today-head">
      <h2>${hello}${greetName ? ', <span class="greet-name">' + greetName + '</span>' : ''}</h2>
      <p class="today-date">${dateStr}</p>
    </div>

    ${heroHtml}

    ${renderQualityCard(ritual.snapshot)}

    ${actionHtml}

    <div class="dashboard-widgets">
      <div class="stat-row">
        <div class="stat-pill">
          <div class="stat-num">${streak}</div>
          <div class="stat-lbl">${streak === 0 ? 'начни серию' : 'дней подряд'}</div>
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
      ${yesterdayScore > 0 && !playedToday ? `<p class="yesterday-hint">Вчерашний результат · <span class="highlight-score">${yesterdayScore} XP</span></p>` : ''}

      <div class="insight-banner coach-${spark.tone}">
        <div class="insight-icon">💡</div>
        <div>
          <div class="insight-kicker">Коуч Fokus · ${spark.title}</div>
          <div class="insight-body">${spark.body}</div>
        </div>
      </div>

      ${topInsight && topInsight.title !== spark.title && topInsight.type !== 'milestone' ? `
        <div class="insight-banner">
          <div class="insight-icon">🧠</div>
          <div>
            <div class="insight-kicker">Инсайт · ${topInsight.confidence === 'high' ? 'уверенный' : topInsight.confidence === 'medium' ? 'подтверждается' : 'изучаем'}</div>
            <div class="insight-body">${topInsight.description}</div>
          </div>
        </div>
      ` : ''}

      ${questsHtml}
    </div>
  `;

  content.querySelector('#btn-start')?.addEventListener('click', () => {
    const startSession = () => {
      if (!profile.calibrated) {
        navigateTo('session', { mode: 'calibration', items: [{ exerciseId: 'odd-one' }, { exerciseId: 'grid-memory' }, { exerciseId: 'stroop' }] });
      } else {
        navigateTo('session', { mode: 'normal', items: plan.items, durationSec: ritualDuration });
      }
    };

    if (!playedToday && profile.calibrated && !profile.skipLifestylePrompt) {
      const modal = document.createElement('div');
      modal.className = 'modal-root';
      modal.innerHTML = `
        <div class="surface modal-card">
          <h3>Как вы сегодня?</h3>
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
        modal.remove();
        startSession();
      };

      modal.querySelector('#btn-ls-done')?.addEventListener('click', closeAndStart);
      modal.querySelector('#btn-ls-skip')?.addEventListener('click', () => {
        modal.remove();
        startSession();
      });
    } else {
      startSession();
    }
  });
}
