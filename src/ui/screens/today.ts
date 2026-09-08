import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { buildTrainingPlan } from '../../core/session-builder';
import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { getLevelProgress } from '../../core/xp';
import { generateInsights } from '../../core/insights';
import { getDailyQuests } from '../../core/quests';

export function renderToday(container: HTMLElement) {
  const content = renderShell(container, { active: 'today' });
  const profile = storage.getProfile();
  const lvl = getLevelProgress(profile.xp || 0);
  
  const getLeagueName = (level: number) => {
    if (level < 10) return 'Бронза';
    if (level < 20) return 'Серебро';
    if (level < 30) return 'Золото';
    if (level < 40) return 'Платина';
    return 'Алмаз';
  };

  const ds = storage.getDaySummaries();
  const todayStr = new Date().toISOString().split('T')[0];
  const playedToday = ds.some(d => d.date.startsWith(todayStr));
  
  let streak = 0;
  let yesterdayScore = 0;
  if (ds.length > 0) {
    const last = ds[ds.length - 1];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    if (playedToday) streak = last.streak;
    else if (last.date.startsWith(yesterdayDate.toISOString().split('T')[0])) {
      streak = last.streak;
      yesterdayScore = Math.round(last.totalScore);
    }
  }

  // Pre-build session to show composition
  const domains = storage.getDomains();
  const skills = storage.getSkills();
  const states = storage.getExerciseStates();
  const plan = buildTrainingPlan({
    durationSec: profile.sessionLengthSec,
    catalog: registry as any,
    domains,
    skills,
    states,
    primaryGoal: profile.primaryGoal
  });

  const allDomains = [
    {id: 'attention', name: 'Внимание'},
    {id: 'memory', name: 'Память'},
    {id: 'speed', name: 'Скорость'},
    {id: 'flexibility', name: 'Гибкость'},
    {id: 'logic', name: 'Логика'}
  ];

  let domainsHtml = allDomains.map(d => {
    const val = domains.find(x => x.domain === d.id)?.value || 0;
    const isZero = val === 0;
    const displayVal = Math.round(isZero ? 500 : val);
    const pct = Math.min(100, Math.max(0, displayVal / 15));
    return `
      <div class="scale-row dom-${d.id} ${isZero ? 'scale-empty' : ''}">
        <div class="scale-label">${d.name}</div>
        <div class="scale-track"><div class="scale-fill" style="width: ${isZero ? 0 : pct}%"></div></div>
        <div class="scale-value" style="${isZero ? 'color: var(--muted)' : ''}">${isZero ? 'Н/Д' : displayVal}</div>
      </div>
    `;
  }).join('');

  const focusText = plan.focusDomains.length > 0 
    ? plan.focusDomains.map(d => allDomains.find(x => x.id === d)?.name?.toUpperCase()).join(' + ')
    : 'СБАЛАНСИРОВАННАЯ ТРЕНИРОВКА';

  let compositionHtml = plan.items.map((item, index) => {
    const r = registry.find(x => x.manifest.id === item.exerciseId);
    const isPrimary = index === 0;
    
    return `<div class="chip dom-${r?.manifest.domain}" style="margin-bottom: 12px; display: flex; flex-direction: column; width: 100%; padding: 12px 16px; border-radius: 12px; border: ${isPrimary ? '1px solid var(--accent)' : '1px solid var(--line)'}; position: relative;">
      ${isPrimary ? `<div style="position: absolute; top: -10px; left: 16px; background: var(--surface); padding: 0 8px; font-size: 11px; color: var(--accent); font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Главный фокус</div>` : ''}
      <button class="expand-btn" aria-expanded="false" aria-controls="exp-${item.exerciseId}">
        <span style="display: flex; align-items: center; font-weight: 600; font-size: 15px;"><img src="${import.meta.env.BASE_URL}art/icon-${r?.manifest.id}.svg" width="20" height="20" style="margin-right: 8px; border-radius: 6px;">${r?.manifest.name}</span>
        <span style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px;">${r?.manifest.domain}</span>
          <svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </span>
      </button>
      <div id="exp-${item.exerciseId}" class="expand-content" style="display: none;">
        <div style="display: flex; gap: 8px;">
          <span style="color: var(--accent);">✦</span> <span>${item.reason}</span>
        </div>
      </div>
    </div>`;
  }).join('');

  let topCard = '';
  if (streak > 0) {
    topCard = `
      <div class="streak-card">
        <div class="streak-num">${streak}</div>
        <div class="streak-text">дней подряд</div>
        ${yesterdayScore > 0 && !playedToday ? `<div style="font-size: 12px; margin-top: 16px; color: rgba(255,255,255,0.7);">Вчера · ${yesterdayScore} очков</div>` : ''}
      </div>
    `;
  } else {
    topCard = `
      <div class="streak-card">
        <div class="streak-num">0</div>
        <div class="streak-text">начни серию</div>
      </div>
    `;
  }

  let actionHtml = '';
  if (!profile.calibrated) {
    actionHtml = `
      <div class="surface" style="text-align: center;">
        <p style="margin-bottom: 20px;">Сначала короткая настройка уровня, ~90 сек</p>
        <button id="btn-start" class="btn-primary" style="margin-bottom: 0;">Пройти калибровку</button>
      </div>
    `;
  } else if (playedToday) {
    actionHtml = `
      <button id="btn-start" class="btn-secondary">Повторить сессию</button>
    `;
  } else {
    actionHtml = `
      <div class="surface" style="padding-bottom: 4px;">
        <div style="text-align: center; margin-bottom: 16px;">
          <div style="font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Фокус сегодня</div>
          <div style="color: var(--accent); font-weight: 700; font-size: 15px;">${focusText}</div>
        </div>
        <div style="margin-bottom: 20px;">${compositionHtml}</div>
        <button id="btn-start" class="btn-primary" style="margin-bottom: 12px;">Начать ${Math.floor(profile.sessionLengthSec/60)} мин</button>
      </div>
    `;
  }

  const insights = generateInsights(domains, skills, states, ds);
  let insightHtml = '';
  if (insights.length > 0) {
    const topInsight = insights[0];
    const confText = topInsight.confidence === 'high' ? 'Уверенный' : (topInsight.confidence === 'medium' ? 'Подтверждается' : 'Изучаем');
    insightHtml = `
      <div class="insight-banner">
        <div style="flex: 1;">
          <div style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: bold; letter-spacing: 0.5px; margin-bottom: 2px;">
            Инсайт • ${confText}
          </div>
          <div style="color: var(--text); font-weight: 500; line-height: 1.3;">
            ${topInsight.description}
          </div>
        </div>
      </div>
    `;
  }

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
  const dateStr = new Date().toLocaleDateString('ru-RU', dateOptions);

  const quests = getDailyQuests();
  let questsHtml = `
    <div class="surface" style="margin-bottom: 24px;">
      <h3 style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        Квесты дня
        <span style="font-size: 11px; background: var(--accent); color: #fff; padding: 2px 6px; border-radius: 4px;">XP</span>
      </h3>
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${quests.map(q => {
          const pct = Math.min(100, (q.progress / q.target) * 100);
          return `
            <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--line); border-radius: 8px; padding: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                  <div style="font-weight: bold; color: ${q.completed ? 'var(--ok)' : 'var(--text)'};">${q.title} ${q.completed ? '✓' : ''}</div>
                  <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">${q.description}</div>
                </div>
                <div style="font-size: 12px; font-weight: bold; color: var(--muted);">${q.progress}/${q.target}</div>
              </div>
              <div class="scale-track" style="height: 6px; margin: 0; background: rgba(0,0,0,0.2);">
                <div class="scale-fill" style="width: ${pct}%; background: ${q.completed ? 'var(--ok)' : 'var(--accent)'};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  content.innerHTML = `
    <h2 style="text-transform: capitalize; margin-bottom: 4px;">Сегодня</h2>
    <p style="margin-bottom: 24px;">${dateStr}</p>
    
    ${topCard}
    
    ${insightHtml}
    
    ${questsHtml}
    
    <div class="surface">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px;">
        <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">
          Уровень ${lvl.currentLevel}
          <span style="font-size: 11px; background: var(--surface); color: var(--accent); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--accent);">${getLeagueName(lvl.currentLevel)}</span>
        </h3>
        <div style="font-size: 13px; color: var(--muted);">${Math.round(lvl.currentXP)} / ${Math.round(lvl.nextLevelXP)} XP</div>
      </div>
      <div class="scale-track" style="height: 8px; border-radius: 4px; overflow: hidden;"><div class="scale-fill" style="width: ${lvl.progressPct}%; background: var(--accent);"></div></div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Когнитивный профиль</h3>
      ${domainsHtml}
    </div>

    ${actionHtml}
  `;

  content.querySelector('#btn-start')?.addEventListener('click', () => {
    const startSession = () => {
      if (!profile.calibrated) {
        navigateTo('session', {mode: 'calibration', items: [{exerciseId: 'odd-one'}, {exerciseId: 'grid-memory'}, {exerciseId: 'stroop'}]});
      } else {
        navigateTo('session', {mode: 'normal', items: plan.items});
      }
    };

    if (!playedToday && profile.calibrated) {
      // Show lifestyle modal
      const modal = document.createElement('div');
      modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px;';
      modal.innerHTML = `
        <div class="surface" style="width: 100%; max-width: 400px;">
          <h3 style="margin-bottom: 16px; text-align: center;">Факторы среды</h3>
          <p style="font-size: 13px; color: var(--muted); margin-bottom: 24px; text-align: center;">Для анализа корреляций ваших результатов</p>
          
          <div style="margin-bottom: 20px;">
            <div style="margin-bottom: 8px; font-weight: 500;">Сон сегодня:</div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-ls-sleep btn-secondary" data-val="low" style="flex: 1; padding: 8px;">&lt; 6 ч</button>
              <button class="btn-ls-sleep btn-secondary" data-val="normal" style="flex: 1; padding: 8px;">6-8 ч</button>
              <button class="btn-ls-sleep btn-secondary" data-val="high" style="flex: 1; padding: 8px;">&gt; 8 ч</button>
            </div>
          </div>
          
          <div style="margin-bottom: 24px;">
            <div style="margin-bottom: 8px; font-weight: 500;">Уровень стресса:</div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-ls-stress btn-secondary" data-val="low" style="flex: 1; padding: 8px;">Низкий</button>
              <button class="btn-ls-stress btn-secondary" data-val="normal" style="flex: 1; padding: 8px;">Средний</button>
              <button class="btn-ls-stress btn-secondary" data-val="high" style="flex: 1; padding: 8px;">Высокий</button>
            </div>
          </div>
          
          <button id="btn-ls-done" class="btn-primary" style="width: 100%;" disabled>Начать тренировку</button>
        </div>
      `;
      document.body.appendChild(modal);

      let sleepVal: string | null = null;
      let stressVal: string | null = null;

      const checkDone = () => {
        const btnDone = modal.querySelector('#btn-ls-done') as HTMLButtonElement;
        if (sleepVal && stressVal) {
          btnDone.disabled = false;
        }
      };

      modal.querySelectorAll('.btn-ls-sleep').forEach(b => {
        b.addEventListener('click', (e) => {
          modal.querySelectorAll('.btn-ls-sleep').forEach(x => x.classList.remove('btn-primary'));
          modal.querySelectorAll('.btn-ls-sleep').forEach(x => x.classList.add('btn-secondary'));
          (e.target as HTMLElement).classList.remove('btn-secondary');
          (e.target as HTMLElement).classList.add('btn-primary');
          sleepVal = (e.target as HTMLElement).dataset.val || null;
          checkDone();
        });
      });

      modal.querySelectorAll('.btn-ls-stress').forEach(b => {
        b.addEventListener('click', (e) => {
          modal.querySelectorAll('.btn-ls-stress').forEach(x => x.classList.remove('btn-primary'));
          modal.querySelectorAll('.btn-ls-stress').forEach(x => x.classList.add('btn-secondary'));
          (e.target as HTMLElement).classList.remove('btn-secondary');
          (e.target as HTMLElement).classList.add('btn-primary');
          stressVal = (e.target as HTMLElement).dataset.val || null;
          checkDone();
        });
      });

      modal.querySelector('#btn-ls-done')?.addEventListener('click', () => {
        const p = storage.getProfile();
        p.lastLifestyle = { sleep: sleepVal, stress: stressVal, date: todayStr };
        storage.setProfile(p);
        document.body.removeChild(modal);
        startSession();
      });
    } else {
      startSession();
    }
  });

  content.querySelectorAll('.expand-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.currentTarget as HTMLButtonElement;
      const targetId = button.getAttribute('aria-controls');
      const target = document.getElementById(targetId || '');
      const chevron = button.querySelector('.chevron') as HTMLElement;
      if (target && chevron) {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
          button.setAttribute('aria-expanded', 'false');
          target.style.display = 'none';
          chevron.style.transform = 'rotate(0deg)';
        } else {
          button.setAttribute('aria-expanded', 'true');
          target.style.display = 'block';
          chevron.style.transform = 'rotate(180deg)';
        }
      }
    });
  });
}
