import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { getExerciseIntelligence } from '../../core/selectors';
import { domainLabel } from '../../core/labels';

export function renderTrainers(container: HTMLElement) {
  const content = renderShell(container, { active: 'trainers' });
  const exStates = storage.getExerciseStates();
  
  let gridHtml = registry.map(ex => {
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
      <div class="trainer-card dom-${ex.manifest.domain}" data-id="${ex.manifest.id}" data-domain="${ex.manifest.domain}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="trainer-domain">${domainLabel(ex.manifest.domain)}</div>
          <img src="${import.meta.env.BASE_URL}art/icon-${ex.manifest.id}.svg" width="32" height="32" style="border-radius: 8px;">
        </div>
        <div class="trainer-name">${ex.manifest.name}</div>
        <div class="trainer-instruction">${ex.manifest.instruction}</div>
        <div class="trainer-level">Ур. ${lvl}</div>
        ${intelHtml}
      </div>
    `;
  }).join('');

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
      <p class="today-date">${registry.length} упражнений. Практика без влияния на Fokus Index.</p>
    </div>
    
    <div class="catalog-controls">
      <div class="search-container">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input type="text" id="trainers-search" class="search-input" placeholder="Найти тренажёр..." autocomplete="off" />
      </div>
      <div class="domain-filters">
        ${filters.map((f, i) => `<button class="filter-chip ${i === 0 ? 'active' : ''}" data-dom="${f.id}" type="button">${f.name}</button>`).join('')}
      </div>
    </div>
    
    <div class="trainers-grid" id="trainers-grid">
      ${gridHtml}
    </div>
    
    <div class="empty-state is-hidden" id="trainers-empty">
      <div class="empty-icon">🔍</div>
      <h3 class="empty-title">Ничего не найдено</h3>
      <p class="empty-text">Попробуйте изменить поисковый запрос или выбрать другой домен.</p>
      <button class="btn btn-secondary mt-16" id="reset-filters-btn">Сбросить фильтры</button>
    </div>
  `;

  let currentDomain = 'all';
  let searchQuery = '';

  const grid = content.querySelector('#trainers-grid') as HTMLElement;
  const emptyState = content.querySelector('#trainers-empty') as HTMLElement;
  const searchInput = content.querySelector('#trainers-search') as HTMLInputElement;
  const resetBtn = content.querySelector('#reset-filters-btn') as HTMLButtonElement;

  function updateList() {
    let visibleCount = 0;
    content.querySelectorAll('.trainer-card').forEach(card => {
      const el = card as HTMLElement;
      const dom = el.dataset.domain;
      const name = (el.querySelector('.trainer-name')?.textContent || '').toLowerCase();
      
      const matchDomain = currentDomain === 'all' || dom === currentDomain;
      const matchSearch = name.includes(searchQuery.toLowerCase());
      
      const isVisible = matchDomain && matchSearch;
      el.classList.toggle('is-hidden', !isVisible);
      if (isVisible) visibleCount++;
    });

    if (visibleCount === 0) {
      grid.classList.add('is-hidden');
      emptyState.classList.remove('is-hidden');
    } else {
      grid.classList.remove('is-hidden');
      emptyState.classList.add('is-hidden');
    }
  }

  content.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentDomain = (chip as HTMLElement).dataset.dom || 'all';
      content.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      updateList();
    });
  });

  searchInput.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    updateList();
  });

  resetBtn.addEventListener('click', () => {
    searchQuery = '';
    searchInput.value = '';
    currentDomain = 'all';
    content.querySelectorAll('.filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
    updateList();
  });

  content.querySelectorAll('.trainer-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id;
      if (id) navigateTo('session', { mode: 'practice', items: [{exerciseId: id}] });
    });
  });
}
