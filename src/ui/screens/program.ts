import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';
import { buildTrainingPlan } from '../../core/session-builder';

export function renderProgram(container: HTMLElement) {
  const shell = renderShell(container, { active: 'program' });
  const profile = storage.getProfile();

  shell.innerHTML = `
    <div class="screen program-screen" style="padding: 20px; animation: fade-in 0.3s ease-out;">
      <h2>Персональная программа</h2>
      <p style="opacity: 0.7; margin-bottom: 24px; font-size: 14px;">Ежедневный ритуал развития Fokus</p>
      
      ${!profile.calibrated ? `
        <div class="card" style="margin-bottom: 24px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <h3>Шаг 1: Калибровка</h3>
          <p style="opacity: 0.8; font-size: 14px; margin: 12px 0; line-height: 1.5;">
            Пройдите серию коротких тестов для определения начального Fokus Index. Мы подберем индивидуальную программу.
          </p>
          <button id="btn-calibrate" class="btn primary" style="width: 100%; margin-top: 8px;">Начать калибровку (~5 мин)</button>
        </div>
      ` : `
        <div class="card" style="margin-bottom: 24px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Дневной ритуал</h3>
            <span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              Фаза ${profile.programPhase || 1}
            </span>
          </div>
          <p style="opacity: 0.8; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
            Ваша персональная программа готова. Начните сессию для улучшения отстающих навыков.
          </p>
          <button id="btn-program-start" class="btn primary" style="width: 100%;">Начать ритуал</button>
        </div>
      `}
      
      <div class="card" style="padding: 20px; background: rgba(255,255,255,0.05); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
        <h3>Каталог навыков</h3>
        <p style="opacity: 0.8; font-size: 14px; margin: 12px 0; line-height: 1.5;">
          Развивайте определенные функции автономно. Выбирайте упражнения по категориям.
        </p>
        <button id="btn-catalog" class="btn" style="width: 100%; background: rgba(255,255,255,0.1); color: white;">Открыть тренажеры</button>
      </div>
    </div>
  `;

  shell.querySelector('#btn-calibrate')?.addEventListener('click', () => {
    navigateTo('session', { mode: 'calibration', items: [
      { exerciseId: 'grid-memory' }, 
      { exerciseId: 'odd-one' }, 
      { exerciseId: 'pattern-next' }, 
      { exerciseId: 'reaction-strike' }, 
      { exerciseId: 'switch-rule' }
    ] });
  });

  shell.querySelector('#btn-program-start')?.addEventListener('click', () => {
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
    navigateTo('session', { mode: 'normal', items: plan.items });
  });

  shell.querySelector('#btn-catalog')?.addEventListener('click', () => {
    navigateTo('trainers');
  });
}
