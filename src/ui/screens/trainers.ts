import { navigateTo } from '../router';
import { catalog } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { getExerciseIntelligence } from '../../core/selectors';
import { domainLabel } from '../../core/labels';
import { bindPressPhysics } from '../../core/motion';

export function renderTrainers(container: HTMLElement) {
  const content = renderShell(container, { active: 'trainers' });
  const exStates = storage.getExerciseStates();
  
  let gridHtml = catalog.map(ex => {
    const st = exStates.find(s => s.exerciseId === ex.manifest.id);
    const lvl = st ? st.level : 1;
    const intel = getExerciseIntelligence(ex.manifest.id);
    
    let intelHtml = '';
    const stateLabels = {
      'CALIBRATING': 'Калибровка',
      'DEVELOPING': 'Освоение',
      'STABLE': 'Стабильно',
      'CHALLENGE': 'Вызов',
      'PLATEAU': 'Плато'
    };

    if (intel.state === 'CALIBRATING') {
      intelHtml = `
        <div style="margin-top: 12px;">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Калибровка (${intel.attempts}/3)</div>
          <div class="scale-track" style="height: 4px; opacity: 0.3; margin: 0;"><div class="scale-fill" style="width: 100%; background: var(--muted);"></div></div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Сложность: ${intel.difficulty}</div>
        </div>`;
    } else {
      const stateColor = intel.state === 'STABLE' ? 'var(--ok)' : intel.state === 'CHALLENGE' ? 'var(--accent)' : intel.state === 'PLATEAU' ? 'var(--danger)' : 'var(--text)';
      let avgTrend = 0;
      if (intel.skills.length > 0) {
        avgTrend = intel.skills.reduce((sum, s) => sum + s.trend, 0) / intel.skills.length;
      }
      const trendStr = avgTrend > 0.05 ? '↑' : avgTrend < -0.05 ? '↓' : '→';
      const trendColor = avgTrend > 0.05 ? 'var(--ok)' : avgTrend < -0.05 ? 'var(--danger)' : 'var(--muted)';

      intelHtml = `
        <div style="margin-top: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px;">
            <div style="font-size: 11px; color: ${stateColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              ${stateLabels[intel.state]}
            </div>
            <div style="font-size: 12px; font-weight: 700;">
              ${intel.mastery}<span style="font-size: 10px; color: var(--muted); font-weight: 500;">/100</span>
            </div>
          </div>
          <div class="scale-track" style="height: 4px; margin: 0 0 6px 0; background: rgba(255,255,255,0.05);">
            <div class="scale-fill" style="width: ${intel.mastery}%; background: ${stateColor};"></div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--muted);">
            <div>Сложность: <span style="color: var(--text);">${intel.difficulty}</span></div>
            <div>Тренд: <span style="color: ${trendColor}; font-weight: 700;">${trendStr}</span></div>
          </div>
        </div>
      `;
    }

    return `
      <button type="button" class="trainer-card press-physics dom-${ex.manifest.domain}" data-id="${ex.manifest.id}" data-domain="${ex.manifest.domain}" aria-label="${ex.manifest.name}, ${domainLabel(ex.manifest.domain)}, уровень ${lvl}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="trainer-domain">${domainLabel(ex.manifest.domain)}</div>
          <img src="${import.meta.env.BASE_URL}art/icon-${ex.manifest.id}.svg" width="32" height="32" alt="" decoding="async" loading="lazy" style="border-radius: 8px;">
        </div>
        <div class="trainer-name">${ex.manifest.name}</div>
        <div class="trainer-instruction">${ex.manifest.instruction}</div>
        <div class="trainer-level">Ур. ${lvl}</div>
        ${intelHtml}
      </button>
    `;
  }).join('');

  if (catalog.length === 0) {
    gridHtml = `
      <div class="catalog-empty" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; border-radius: 16px; background: rgba(255,255,255,0.02);">
        <div style="font-size: 48px; opacity: 0.5; margin-bottom: 16px;">📭</div>
        <h3 style="margin-bottom: 8px; color: var(--text); font-size: 18px; font-weight: 600;">Тренажёры в разработке</h3>
        <p style="color: var(--muted); font-size: 14px; max-width: 320px; margin: 0 auto; line-height: 1.5;">Здесь появятся упражнения для развития когнитивных навыков. Возвращайтесь позже!</p>
      </div>
    `;
  }

  const filters = [
    { id: 'all', name: 'Все' },
    { id: 'attention', name: 'Внимание' },
    { id: 'memory', name: 'Память' },
    { id: 'speed', name: 'Скорость' },
    { id: 'flexibility', name: 'Гибкость' },
    { id: 'logic', name: 'Логика' }
  ];

  content.innerHTML = `
    <div class="today-head">
      <h2>Каталог тренажёров</h2>
      <p class="today-date">${catalog.length} упражнений. Практика без влияния на Fokus Index.</p>
    </div>
    <div class="domain-filters">
      ${filters.map((f, i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" data-dom="${f.id}" type="button" aria-pressed="${i === 0 ? 'true' : 'false'}">${f.name}</button>`).join('')}
    </div>
    <div class="trainers-grid">
      ${gridHtml}
    </div>
  `;

  content.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const dom = (chip as HTMLElement).dataset.dom;
      content.querySelectorAll('.filter-chip').forEach(c => {
        const on = c === chip;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      let visibleCount = 0;
      content.querySelectorAll('.trainer-card').forEach(card => {
        const match = dom === 'all' || (card as HTMLElement).dataset.domain === dom;
        card.classList.toggle('is-hidden', !match);
        if (match) visibleCount++;
      });

      let emptyMsg = content.querySelector('.filter-empty') as HTMLElement;
      if (visibleCount === 0 && catalog.length > 0) {
        if (!emptyMsg) {
          emptyMsg = document.createElement('div');
          emptyMsg.className = 'filter-empty';
          emptyMsg.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 40px 20px; border-radius: 12px; background: rgba(255,255,255,0.02); margin-top: 16px;';
          emptyMsg.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 12px; opacity: 0.4;">🔍</div>
            <h3 style="color: var(--text); margin-bottom: 8px; font-size: 16px; font-weight: 600;">Ничего не найдено</h3>
            <p style="font-size: 14px; color: var(--muted);">В этой категории пока нет доступных тренажёров.</p>
          `;
          content.querySelector('.trainers-grid')?.appendChild(emptyMsg);
        }
        emptyMsg.style.display = 'block';
      } else if (emptyMsg) {
        emptyMsg.style.display = 'none';
      }
    });
  });

  content.querySelectorAll('.trainer-card').forEach(card => {
    const el = card as HTMLElement;
    const id = el.dataset.id;
    bindPressPhysics(el);
    el.addEventListener('pointerenter', () => { if (id) loadExercise(id); }, { once: true });
    el.addEventListener('focus', () => { if (id) loadExercise(id); }, { once: true });
    el.addEventListener('click', () => {
      if (id) navigateTo('session', { mode: 'practice', items: [{exerciseId: id}] });
    });
  });
}
