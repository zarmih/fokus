import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';
import { currentModel, planForNow, snoozeRecalibration } from '../../core/adaptive-plan';
import { SLOT_LABEL, confidencePct, getDomain, isRecalibrationActive } from '../../core/engine';
import { DOMAIN_IDS } from '../../core/engine/constants';
import { domainLabel } from '../../core/labels';
import type { DomainId } from '../../core/engine/types';

/**
 * Personal plan screen. Lives on main even if Phase 2 program PRs are not
 * merged: it reads optional profile.programDay / programWeek when present
 * and otherwise derives a week-from-start from day summaries.
 */
export function renderProgram(container: HTMLElement) {
  const shell = renderShell(container, { active: 'program' });
  const profile = storage.getProfile();
  const ds = storage.getDaySummaries();
  const todayStr = new Date().toISOString().split('T')[0];
  const playedToday = ds.some((d) => d.date.startsWith(todayStr));
  const plan = planForNow({ durationSec: profile.sessionLengthSec || 900 });
  const recal = plan.recalibration;
  const showRecal = profile.calibrated && isRecalibrationActive(recal);
  const model = currentModel();

  const programDay = (profile as { programDay?: number }).programDay;
  const programWeek = (profile as { programWeek?: number }).programWeek;
  const dayIndex = programDay || Math.max(1, ((ds.length) % 7) + 1);
  const weekIndex = programWeek || Math.max(1, Math.floor(ds.length / 7) + 1);

  const abilityHtml = DOMAIN_IDS.map((id: DomainId) => {
    const d = getDomain(model, id);
    const conf = confidencePct(d.precision, d.sources.length);
    const pct = Math.max(4, Math.min(100, (d.theta / 20) * 100));
    return `
      <div class="ability-row">
        <div class="ability-meta">
          <span>${domainLabel(id)}</span>
          <span class="muted">θ ${d.theta.toFixed(1)} · ${conf}%</span>
        </div>
        <div class="scale-track"><div class="scale-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');

  const ritualHtml = plan.items.map((item, i) => {
    const r = registry.find((x) => x.manifest.id === item.exerciseId);
    const slot = item.slot ? SLOT_LABEL[item.slot] : '';
    const p = item.pSuccess != null ? Math.round(item.pSuccess * 100) : null;
    return `
      <div class="ritual-row">
        <div class="ritual-idx">${i + 1}</div>
        <img src="${import.meta.env.BASE_URL}art/icon-${r?.manifest.id}.svg" width="28" height="28" alt="">
        <div class="ritual-copy">
          <div class="ritual-name">${r?.manifest.name || item.exerciseId}</div>
          <div class="muted">${item.reason}${p != null ? ` · P≈${p}%` : ''}</div>
        </div>
        ${slot ? `<span class="slot-tag">${slot}</span>` : ''}
      </div>
    `;
  }).join('');

  let hero = '';
  if (!profile.calibrated) {
    hero = `
      <div class="workout-card">
        <div class="workout-kicker">Шаг 1</div>
        <h3>Первый ритуал</h3>
        <p>Три коротких блока. После этого Fokus соберёт персональный ритуал на ~15 минут.</p>
        <button id="btn-calibrate" class="btn-primary" type="button">Начать первый ритуал</button>
      </div>
    `;
  } else if (showRecal) {
    hero = `
      <div class="workout-card recal-card">
        <div class="workout-kicker">Мягкая перекалибровка</div>
        <h3>Сверить оценку</h3>
        <p>${recal.summary || 'Короткая сверка сложности. Серия не сбрасывается.'}</p>
        <div class="recal-actions">
          <button id="btn-recal" class="btn-primary" type="button">Пройти (~90 сек)</button>
          <button id="btn-recal-later" class="btn-secondary" type="button">Позже</button>
        </div>
      </div>
    `;
  } else if (playedToday) {
    hero = `
      <div class="workout-card done">
        <div class="workout-kicker">Сегодня закрыто</div>
        <h3>Ритуал выполнен</h3>
        <p>Дополнительная сессия не ломает прогресс — лучший эффект даёт завтрашний слот.</p>
        <button id="btn-program-start" class="btn-secondary" type="button">Ещё одна сессия</button>
      </div>
    `;
  } else {
    hero = `
      <div class="workout-card">
        <div class="workout-kicker">Неделя ${weekIndex} · День ${dayIndex}/7</div>
        <h3>${Math.round((profile.sessionLengthSec || 900) / 60)} минут · персональный ритуал</h3>
        <p class="muted">Слоты: просроченное повторение, слот дня, новый стимул. Сложность — зона вызова (IRT).</p>
        <button id="btn-program-start" class="btn-primary" type="button">Начать ритуал</button>
      </div>
    `;
  }

  shell.innerHTML = `
    <div class="program-screen">
      <div class="today-head">
        <h2>Персональный план</h2>
        <p class="today-date">Адаптивный движок v2 · не копия чужих методик</p>
      </div>
      ${hero}
      ${profile.calibrated ? `
        <div class="surface">
          <h3>Вектор способностей</h3>
          <p class="muted" style="margin-bottom:12px">EWMA-форма и байесовская уверенность по пяти областям.</p>
          ${abilityHtml}
        </div>
        <div class="surface" style="margin-top:16px">
          <h3>Ритуал дня</h3>
          <div class="ritual-list">${ritualHtml || '<p class="muted">Каталог пуст — откройте тренажёры.</p>'}</div>
        </div>
      ` : ''}
      <div class="surface" style="margin-top:16px">
        <h3>Каталог</h3>
        <p class="muted" style="margin-bottom:12px">Отдельные упражнения не ломают ритуал.</p>
        <button id="btn-catalog" class="btn-secondary" type="button">Открыть тренажёры</button>
      </div>
    </div>
  `;

  const startCalibration = () => {
    navigateTo('session', {
      mode: 'calibration',
      items: [{ exerciseId: 'odd-one' }, { exerciseId: 'grid-memory' }, { exerciseId: 'stroop' }]
    });
  };
  const startRitual = () => {
    navigateTo('session', { mode: 'normal', items: plan.items });
  };
  const startRecal = () => {
    const items = (recal.probe.length ? recal.probe : [
      { exerciseId: 'odd-one' },
      { exerciseId: 'grid-memory' },
      { exerciseId: 'stroop' }
    ]).map((p) => ({ exerciseId: p.exerciseId }));
    navigateTo('session', { mode: 'recalibration', items });
  };

  shell.querySelector('#btn-calibrate')?.addEventListener('click', startCalibration);
  shell.querySelector('#btn-program-start')?.addEventListener('click', startRitual);
  shell.querySelector('#btn-recal')?.addEventListener('click', startRecal);
  shell.querySelector('#btn-recal-later')?.addEventListener('click', () => {
    snoozeRecalibration();
    renderProgram(container);
  });
  shell.querySelector('#btn-catalog')?.addEventListener('click', () => navigateTo('trainers'));
}
