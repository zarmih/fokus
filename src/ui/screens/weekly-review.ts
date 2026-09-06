import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { renderShell } from '../shell';
import { navigateTo } from '../router';
import { generateInsights } from '../../core/insights';
import { buildTrainingPlan } from '../../core/session-builder';

export function renderWeeklyReview(container: HTMLElement) {
  const content = renderShell(container, { active: 'progress', hideNav: true });
  
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();
  
  const sessions = storage.getSessions().filter(s => s.startedAt >= weekAgoStr);
  const daySummaries = storage.getDaySummaries().filter(ds => ds.date >= weekAgoStr);
  
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
  const insights = generateInsights(domains, skills, states, daySummaries);
  
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
  const plan = buildTrainingPlan({
    durationSec: profile.sessionLengthSec,
    catalog: registry as any,
    domains,
    skills,
    states,
    primaryGoal: profile.primaryGoal
  });

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

  content.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 24px;">
      <button id="btn-back" class="btn-tiny" style="margin-right: 16px; margin-bottom: 0;">← Назад</button>
      <div>
        <h2 style="margin: 0; font-size: 20px;">Итоги недели</h2>
        <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${periodStr}</div>
      </div>
    </div>
    
    ${atAGlanceHtml}
    ${whatChangedHtml}
    ${insightHtml}
    ${nextStepHtml}
  `;

  content.querySelector('#btn-back')?.addEventListener('click', () => {
    navigateTo('progress');
  });
}
