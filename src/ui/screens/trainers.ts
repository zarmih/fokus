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

  const filters = [
    { id: 'all', name: 'Все', count: catalog.length },
    { id: 'attention', name: 'Внимание', count: catalog.filter(c => c.manifest.domain === 'attention').length },
    { id: 'memory', name: 'Память', count: catalog.filter(c => c.manifest.domain === 'memory').length },
    { id: 'speed', name: 'Скорость', count: catalog.filter(c => c.manifest.domain === 'speed').length },
    { id: 'flexibility', name: 'Гибкость', count: catalog.filter(c => c.manifest.domain === 'flexibility').length },
    { id: 'logic', name: 'Логика', count: catalog.filter(c => c.manifest.domain === 'logic').length }
  ];

  content.innerHTML = `
    <div class="catalog-header">
      <h2>Библиотека нейротренажёров</h2>
      <p class="catalog-subtitle">Свободная практика для развития когнитивных навыков. Результаты тренировок здесь не влияют на глобальный Fokus Index.</p>
    </div>
    <div class="domain-filters">
      ${filters.map((f, i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" data-dom="${f.id}" type="button" aria-pressed="${i === 0 ? 'true' : 'false'}">
        <span class="filter-name">${f.name}</span>
        <span class="filter-count">${f.count}</span>
      </button>`).join('')}
    </div>
    <div class="trainers-grid">
      ${gridHtml}
      <div class="catalog-empty is-hidden" id="catalog-empty">
        <div class="catalog-empty-icon">🧠</div>
        <h3>В этой категории пока пусто</h3>
        <p>Мы активно разрабатываем новые нейротренажёры. Попробуйте выбрать другую категорию.</p>
      </div>
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
      
      const emptyState = content.querySelector('#catalog-empty');
      if (emptyState) {
        emptyState.classList.toggle('is-hidden', visibleCount > 0);
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
