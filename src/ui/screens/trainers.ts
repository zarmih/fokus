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

  const filters = [
    { id: 'all', name: 'Все' },
    { id: 'attention', name: 'Внимание' },
    { id: 'memory', name: 'Память' },
    { id: 'speed', name: 'Скорость' },
    { id: 'flexibility', name: 'Гибкость' },
    { id: 'logic', name: 'Логика' }
  ];

  content.innerHTML = `
    <style>
      .catalog-search-wrapper { margin: 0 20px 24px; position: relative; }
      .catalog-search-input { width: 100%; background: var(--surface); border: 2px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 14px 16px 14px 44px; color: var(--text); font-size: 16px; transition: border-color 0.2s; outline: none; }
      .catalog-search-input:focus { border-color: var(--accent); }
      .catalog-search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); opacity: 0.5; font-size: 16px; pointer-events: none; }
      .catalog-section { margin-bottom: 32px; }
      .catalog-section-title { font-size: 18px; font-weight: 700; margin-bottom: 16px; color: var(--text); padding: 0 20px; display: flex; align-items: center; gap: 8px; }
      .catalog-section-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px; padding: 0 20px; }
      .catalog-empty { text-align: center; padding: 64px 20px; }
      .catalog-empty-icon { font-size: 48px; opacity: 0.3; margin-bottom: 16px; filter: grayscale(100%); }
      .catalog-empty-title { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
      .catalog-empty-text { font-size: 14px; color: var(--muted); margin-bottom: 24px; max-width: 260px; margin-left: auto; margin-right: auto; line-height: 1.5; }
      .catalog-reset-btn { background: rgba(255,255,255,0.1); border: none; color: var(--text); padding: 10px 20px; border-radius: 20px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
      .catalog-reset-btn:hover { background: rgba(255,255,255,0.15); }
      .domain-filters { margin-bottom: 24px; }
    </style>
    
    <div class="today-head" style="margin-bottom: 20px;">
      <h2>Каталог тренажёров</h2>
      <p class="today-date">${catalog.length} упражнений. Практика без влияния на Fokus Index.</p>
    </div>
    
    <div class="catalog-search-wrapper">
      <div class="catalog-search-icon">🔍</div>
      <input type="text" id="catalog-search" class="catalog-search-input" placeholder="Поиск по названию или навыку..." autocomplete="off">
    </div>

    <div class="domain-filters" id="catalog-filters"></div>

    <div id="catalog-content"></div>
  `;

  const filtersContainer = content.querySelector('#catalog-filters')!;
  const contentContainer = content.querySelector('#catalog-content')!;
  const searchInput = content.querySelector('#catalog-search') as HTMLInputElement;

  let currentDomain = 'all';
  let searchQuery = '';

  const renderFilters = () => {
    filtersContainer.innerHTML = filters.map(f => 
      `<button class="filter-chip ${f.id === currentDomain ? 'active' : ''}" data-dom="${f.id}" type="button" aria-pressed="${f.id === currentDomain ? 'true' : 'false'}">${f.name}</button>`
    ).join('');
    
    filtersContainer.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        currentDomain = (chip as HTMLElement).dataset.dom || 'all';
        renderFilters();
        renderCatalog();
      });
    });
  };

  const getExerciseCardHtml = (ex: any) => {
    const st = exStates.find(s => s.exerciseId === ex.manifest.id);
    const lvl = st ? st.level : 1;
    const intel = getExerciseIntelligence(ex.manifest.id);
    
    let intelHtml = '';
    const stateLabels: Record<string, string> = {
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
      <button type="button" class="trainer-card press-physics dom-${ex.manifest.domain}" data-id="${ex.manifest.id}" aria-label="${ex.manifest.name}, ${domainLabel(ex.manifest.domain)}, уровень ${lvl}">
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
  };

  const renderCatalog = () => {
    let filtered = catalog;
    
    if (currentDomain !== 'all') {
      filtered = filtered.filter(ex => ex.manifest.domain === currentDomain);
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(ex => 
        ex.manifest.name.toLowerCase().includes(q) || 
        ex.manifest.instruction.toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      contentContainer.innerHTML = `
        <div class="catalog-empty">
          <div class="catalog-empty-icon">🤷</div>
          <h3 class="catalog-empty-title">Ничего не найдено</h3>
          <p class="catalog-empty-text">Попробуйте изменить запрос или сбросить фильтры.</p>
          <button class="catalog-reset-btn" id="catalog-reset">Сбросить всё</button>
        </div>
      `;
      contentContainer.querySelector('#catalog-reset')?.addEventListener('click', () => {
        currentDomain = 'all';
        searchQuery = '';
        searchInput.value = '';
        renderFilters();
        renderCatalog();
      });
      return;
    }

    if (!searchQuery && currentDomain === 'all') {
      const domains = ['attention', 'memory', 'speed', 'flexibility', 'logic'];
      contentContainer.innerHTML = domains.map(dom => {
        const exs = filtered.filter(e => e.manifest.domain === dom);
        if (exs.length === 0) return '';
        const domName = filters.find(f => f.id === dom)?.name;
        return `
          <div class="catalog-section">
            <h3 class="catalog-section-title">${domName} <span style="opacity:0.3; font-size:14px; font-weight:normal;">${exs.length}</span></h3>
            <div class="catalog-section-grid">
              ${exs.map(ex => getExerciseCardHtml(ex)).join('')}
            </div>
          </div>
        `;
      }).join('');
    } else {
      contentContainer.innerHTML = `
        <div class="catalog-section-grid" style="padding-bottom: 32px;">
          ${filtered.map(ex => getExerciseCardHtml(ex)).join('')}
        </div>
      `;
    }

    contentContainer.querySelectorAll('.trainer-card').forEach(card => {
      const el = card as HTMLElement;
      const id = el.dataset.id;
      bindPressPhysics(el);
      el.addEventListener('pointerenter', () => { if (id) loadExercise(id); }, { once: true });
      el.addEventListener('focus', () => { if (id) loadExercise(id); }, { once: true });
      el.addEventListener('click', () => {
        if (id) navigateTo('session', { mode: 'practice', items: [{exerciseId: id}] });
      });
    });
  };

  searchInput.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderCatalog();
  });

  renderFilters();
  renderCatalog();
}
