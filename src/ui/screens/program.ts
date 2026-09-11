import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';
import { buildTrainingPlan } from '../../core/session-builder';

export function renderProgram(container: HTMLElement) {
  const shell = renderShell(container, { active: 'program' });
  const profile = storage.getProfile();
  const active = storage.getActiveSession();
  const ds = storage.getDaySummaries();
  const todayStr = new Date().toISOString().split('T')[0];
  const playedToday = ds.some(d => d.date.startsWith(todayStr));

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
      ` : profile.needsRecalibration && !profile.recalibrationPostponed ? `
        <div class="card" style="margin-bottom: 24px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 1px solid rgba(99,102,241,0.5);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Мягкая перекалибровка</h3>
          </div>
          <p style="opacity: 0.8; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
            Вы завершили 7 дней тренировок. Давайте обновим базовые показатели для точной настройки сложности.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="btn-recalibrate-prog" class="btn primary" style="flex: 2;">Пройти (90 сек)</button>
            <button id="btn-recalibrate-postpone-prog" class="btn secondary" style="flex: 1;">Позже</button>
          </div>
        </div>
      ` : playedToday ? `
        <div class="card" style="margin-bottom: 24px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Сегодня закрыто</h3>
          </div>
          <p style="opacity: 0.8; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
            Ритуал выполнен. Дополнительная сессия не ломает прогресс — но лучший эффект даёт завтрашний ритуал.
          </p>
          <button id="btn-program-start" class="btn secondary" style="width: 100%;">Ещё одна сессия</button>
        </div>
      ` : active ? `
        <div class="card" style="margin-bottom: 24px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Дневной ритуал (в процессе)</h3>
          </div>
          <p style="opacity: 0.8; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5;">
            Выполнено ${active.items.length} из ${active.planItems.length} блоков. Осталось ${Math.ceil(active.timeLeft / 60)} мин.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="btn-resume" class="btn primary" style="flex: 1;">Продолжить</button>
            <button id="btn-restart" class="btn secondary" style="flex: 1; background: rgba(255,255,255,0.1);">Заново</button>
          </div>
        </div>
      ` : `
        <div class="card" style="margin-bottom: 24px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0;">Дневной ритуал</h3>
            <span style="background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">
              Неделя ${profile.programWeek || 1} · День ${profile.programDay || 1}/7
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

  shell.querySelector('#btn-recalibrate-prog')?.addEventListener('click', () => {
    navigateTo('session', { mode: 'calibration', items: [
      { exerciseId: 'grid-memory' }, 
      { exerciseId: 'odd-one' }, 
      { exerciseId: 'pattern-next' }, 
      { exerciseId: 'reaction-strike' }, 
      { exerciseId: 'switch-rule' }
    ] });
  });

  shell.querySelector('#btn-recalibrate-postpone-prog')?.addEventListener('click', () => {
    const p = storage.getProfile();
    p.recalibrationPostponed = true;
    storage.setProfile(p);
    renderProgram(container);
  });

  const startNormalSession = (isResume: boolean = false) => {
    const domains = storage.getDomains();
    const skills = storage.getSkills();
    const states = storage.getExerciseStates();
    const plan = buildTrainingPlan({
      durationSec: profile.sessionLengthSec,
      catalog: registry as any,
      domains,
      skills,
      states,
      primaryGoal: profile.primaryGoal,
      programDay: profile.programDay || 1
    });
    navigateTo('session', { mode: 'normal', items: plan.items, isResume });
  };

  shell.querySelector('#btn-program-start')?.addEventListener('click', () => {
    storage.clearActiveSession();
    startNormalSession(false);
  });

  shell.querySelector('#btn-resume')?.addEventListener('click', () => {
    startNormalSession(true);
  });

  shell.querySelector('#btn-restart')?.addEventListener('click', () => {
    storage.clearActiveSession();
    startNormalSession(false);
  });

  shell.querySelector('#btn-catalog')?.addEventListener('click', () => {
    navigateTo('trainers');
  });
}
