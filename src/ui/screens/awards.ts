import { storage } from '../../core/storage';
import { getDailyQuests } from '../../core/quests';
import { ACHIEVEMENTS_DEF } from '../../core/achievements';
import { renderShell } from '../shell';
import { getLevelProgress } from '../../core/xp';

export function renderAwards(container: HTMLElement) {
  const content = renderShell(container, { active: 'progress' }); 
  const profile = storage.getProfile();
  const xp = profile.xp || 0;
  const lvl = getLevelProgress(xp);
  const quests = getDailyQuests();
  const userAchievements = profile.achievements || [];

  content.innerHTML = `
    <div class="awards-header" style="margin-bottom: 24px; text-align: center;">
      <h2 style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, var(--accent-2), var(--accent)); -webkit-background-clip: text; color: transparent; margin-bottom: 8px;">Зал Славы</h2>
      <p style="color: var(--muted); font-size: 14px;">Ваш честный прогресс и ежедневные вызовы</p>
    </div>

    <div class="surface" style="padding: 20px; border-radius: 24px; margin-bottom: 24px; background: linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%); position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05);">
      <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: var(--accent-glow); filter: blur(40px); border-radius: 50%;"></div>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; position: relative; z-index: 1;">
        <div>
          <div style="font-size: 12px; font-weight: 700; color: var(--accent-2); text-transform: uppercase; letter-spacing: 1px;">Текущий уровень</div>
          <div style="font-size: 32px; font-weight: 800; color: var(--text);">${lvl.currentLevel}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 12px; color: var(--muted);">XP до след. уровня</div>
          <div style="font-size: 16px; font-weight: 600; color: var(--text);">${Math.round(lvl.nextLevelXP - lvl.currentXP)} <span style="color: var(--accent-2); font-size: 12px;">XP</span></div>
        </div>
      </div>
      <div class="scale-track" style="height: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; overflow: hidden; position: relative; z-index: 1;">
        <div class="scale-fill" style="width: ${lvl.progressPct}%; background: linear-gradient(90deg, var(--accent-2), var(--accent)); border-radius: 4px; box-shadow: 0 0 10px var(--accent-glow);"></div>
      </div>
    </div>

    <h3 style="display: flex; align-items: center; gap: 8px; font-size: 18px; margin-bottom: 16px;">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--accent)"><path d="M12 2L4 5v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12.99H5V6.3l7-2.62v9.31z"/></svg>
      Квесты дня
    </h3>
    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">
      ${quests.map((q: any, i: number) => {
        const pct = Math.min(100, (q.progress / q.target) * 100);
        const done = q.completed;
        return `
          <div class="surface" style="padding: 16px; border-radius: 16px; display: flex; align-items: center; gap: 16px; position: relative; overflow: hidden; transition: transform 0.2s ease, box-shadow 0.2s ease; ${done ? 'background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2);' : ''}">
            ${done ? '<div style="position: absolute; inset: 0; background: linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,0.05) 100%); pointer-events: none;"></div>' : ''}
            <div style="width: 48px; height: 48px; border-radius: 12px; background: ${done ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}; display: flex; align-items: center; justify-content: center; font-size: 20px; color: ${done ? 'var(--ok)' : 'var(--accent-2)'}; flex-shrink: 0;">
              ${done ? '✓' : (i + 1)}
            </div>
            <div style="flex: 1; z-index: 1;">
              <div style="font-weight: 700; font-size: 15px; margin-bottom: 4px; color: ${done ? 'var(--ok)' : 'var(--text)'};">${q.title}</div>
              <div style="font-size: 13px; color: var(--muted); margin-bottom: 8px;">${q.description}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <div class="scale-track" style="flex: 1; height: 6px; background: rgba(0,0,0,0.2); border-radius: 3px;">
                  <div class="scale-fill" style="width: ${pct}%; background: ${done ? 'var(--ok)' : 'var(--accent-2)'}; border-radius: 3px; transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1);"></div>
                </div>
                <div style="font-size: 11px; font-weight: 600; color: ${done ? 'var(--ok)' : 'var(--muted)'}; min-width: 32px; text-align: right;">${q.progress}/${q.target}</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <h3 style="display: flex; align-items: center; justify-content: space-between; font-size: 18px; margin-bottom: 16px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="var(--accent)"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        Достижения
      </div>
      <div style="font-size: 14px; font-weight: 600; color: var(--muted);">${userAchievements.length} / ${ACHIEVEMENTS_DEF.length}</div>
    </h3>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
      ${ACHIEVEMENTS_DEF.map((def) => {
        const unlocked = userAchievements.includes(def.id);
        return `
          <div class="surface" style="padding: 16px 8px; text-align: center; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; transition: transform 0.2s ease; ${unlocked ? 'background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.05) 100%); border: 1px solid rgba(139, 92, 246, 0.3); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.1);' : 'opacity: 0.5; filter: grayscale(100%);'}">
            <div style="font-size: 32px; margin-bottom: 8px; ${unlocked ? 'filter: drop-shadow(0 2px 8px rgba(139, 92, 246, 0.6)); transform: scale(1.1);' : 'opacity: 0.3;'}">${def.icon}</div>
            <div style="font-size: 11px; font-weight: 700; line-height: 1.2; color: ${unlocked ? 'var(--text)' : 'var(--muted)'};">${def.name}</div>
            ${!unlocked ? `<div style="font-size: 9px; color: var(--muted); margin-top: 4px; opacity: 0.7;">${def.description}</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}
