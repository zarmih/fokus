import { navigateTo } from '../router';
import { catalog } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { getExerciseIntelligence, ProgressionState } from '../../core/selectors';
import { domainLabel, skillLabel } from '../../core/labels';
import { bindPressPhysics } from '../../core/motion';

const STATE_LABELS: Record<string, string> = {
  'CALIBRATING': 'Калибровка',
  'DEVELOPING': 'Освоение',
  'STABLE': 'Стабильно',
  'CHALLENGE': 'Вызов',
  'PLATEAU': 'Плато'
};

const FORMAT_LABELS: Record<string, string> = {
  'speed-accuracy': 'Скорость и точность',
  'memory-span': 'Объём памяти',
  'timing-precision': 'Точность тайминга',
  'logic-correctness': 'Логическая верность',
  'sequence-accuracy': 'Точность порядка',
  'capacity': 'Вместимость'
};

export function renderTrainers(container: HTMLElement) {
  const content = renderShell(container, { active: 'trainers' });
  const exStates = storage.getExerciseStates();
  
  // Extract unique filters
  const skillsSet = new Set<string>();
  const formatsSet = new Set<string>();
  catalog.forEach(ex => {
    ex.manifest.skills.forEach(s => skillsSet.add(s));
    if (ex.manifest.metricModel) formatsSet.add(ex.manifest.metricModel);
  });
  
  const allSkills = Array.from(skillsSet).sort();
  const allFormats = Array.from(formatsSet).sort();

  // Initial State
  const state = {
    query: '',
    domain: 'all',
    skill: 'all',
    format: 'all',
    difficulty: 'all',
    group: 'domain'
  };

  // Build UI
  content.innerHTML = `
    <div class="today-head">
      <h2>Каталог тренажёров</h2>
      <p class="today-date">Практика без влияния на Fokus Index.</p>
    </div>
    
    <div class="catalog-discovery">
      <div class="catalog-search-wrap">
        <input type="search" class="catalog-search" placeholder="Поиск по названию или описанию..." aria-label="Поиск упражнений">
      </div>
      <div class="catalog-filters">
        <select class="catalog-select" data-filter="domain" aria-label="Фильтр по навыку (Домен)">
          <option value="all">Все области</option>
          <option value="attention">Внимание</option>
          <option value="memory">Память</option>
          <option value="speed">Скорость</option>
          <option value="flexibility">Гибкость</option>
          <option value="logic">Логика</option>
        </select>
        <select class="catalog-select" data-filter="skill" aria-label="Фильтр по когнитивному навыку">
          <option value="all">Все навыки</option>
          ${allSkills.map(s => `<option value="${s}">${skillLabel(s)}</option>`).join('')}
        </select>
        <select class="catalog-select" data-filter="format" aria-label="Фильтр по формату">
          <option value="all">Все форматы</option>
          ${allFormats.map(f => `<option value="${f}">${FORMAT_LABELS[f] || f}</option>`).join('')}
        </select>
        <select class="catalog-select" data-filter="difficulty" aria-label="Фильтр по статусу (сложности)">
          <option value="all">Любой статус</option>
          ${Object.entries(STATE_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
        <select class="catalog-select" data-filter="group" aria-label="Группировка">
          <option value="domain">Группировка: Область</option>
          <option value="format">Группировка: Формат</option>
          <option value="none">Без группировки</option>
        </select>
        <button type="button" class="catalog-reset btn-secondary" style="padding: 8px 12px;" aria-label="Сбросить фильтры">Сброс</button>
      </div>
    </div>
    
    <div class="catalog-results-count" aria-live="polite"></div>
    
    <div class="catalog-empty is-hidden">
      <h3>Ничего не найдено</h3>
      <p>Попробуйте изменить запрос или сбросить фильтры.</p>
      <button type="button" class="btn-primary catalog-reset-empty" style="margin-top: 16px;">Сбросить фильтры</button>
    </div>
    
    <div class="catalog-grid-container"></div>
  `;

  const gridContainer = content.querySelector('.catalog-grid-container') as HTMLElement;
  
  // Pre-calculate data for each exercise to avoid doing it on every filter update
  const exercisesData = catalog.map(ex => {
    const st = exStates.find(s => s.exerciseId === ex.manifest.id);
    const lvl = st ? st.level : 1;
    const intel = getExerciseIntelligence(ex.manifest.id);
    return {
      manifest: ex.manifest,
      level: lvl,
      intel,
      searchString: `${ex.manifest.name} ${ex.manifest.instruction} ${ex.manifest.id}`.toLowerCase()
    };
  });

  // Create groups
  const groups: Record<string, Record<string, typeof exercisesData>> = {
    domain: {},
    format: {},
    none: { 'Все упражнения': exercisesData }
  };
  
  exercisesData.forEach(item => {
    // By domain
    const dLabel = domainLabel(item.manifest.domain);
    if (!groups.domain[dLabel]) groups.domain[dLabel] = [];
    groups.domain[dLabel].push(item);
    
    // By format
    const fLabel = item.manifest.metricModel ? (FORMAT_LABELS[item.manifest.metricModel] || item.manifest.metricModel) : 'Прочее';
    if (!groups.format[fLabel]) groups.format[fLabel] = [];
    groups.format[fLabel].push(item);
  });

  // Render all cards and groups once
  const cardElements = new Map<string, HTMLElement>();
  
  function createCardHTML(item: typeof exercisesData[0]) {
    const { manifest, level, intel } = item;
    
    let intelHtml = '';
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
              ${STATE_LABELS[intel.state] || intel.state}
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
      <button type="button" class="trainer-card press-physics dom-${manifest.domain}" data-id="${manifest.id}" aria-label="${manifest.name}, ${domainLabel(manifest.domain)}, уровень ${level}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="trainer-domain">${domainLabel(manifest.domain)}</div>
          <img src="${import.meta.env.BASE_URL}art/icon-${manifest.id}.svg" width="32" height="32" alt="" decoding="async" loading="lazy" style="border-radius: 8px;">
        </div>
        <div class="trainer-name">${manifest.name}</div>
        <div class="trainer-instruction">${manifest.instruction}</div>
        <div class="trainer-level">Ур. ${level}</div>
        ${intelHtml}
      </button>
    `;
  }

  // Render group containers
  const groupRenderers = {
    domain: '',
    format: '',
    none: ''
  };

  for (const groupType of ['domain', 'format', 'none'] as const) {
    let html = `<div class="catalog-group-wrap catalog-group-wrap-${groupType}">`;
    for (const [gName, items] of Object.entries(groups[groupType])) {
      html += `
        <div class="catalog-group" data-group-name="${gName}">
          ${groupType !== 'none' ? `<h3 class="catalog-group-title">${gName} <span class="catalog-group-count"></span></h3>` : ''}
          <div class="trainers-grid">
            ${items.map(item => {
              const cardId = `${groupType}-${item.manifest.id}`;
              return `<div id="wrap-${cardId}" data-ex-id="${item.manifest.id}">${createCardHTML(item)}</div>`;
            }).join('')}
          </div>
        </div>
      `;
    }
    html += `</div>`;
    groupRenderers[groupType] = html;
  }

  gridContainer.innerHTML = groupRenderers.domain + groupRenderers.format + groupRenderers.none;

  // Bind interactions for all cards
  gridContainer.querySelectorAll('.trainer-card').forEach(card => {
    const el = card as HTMLElement;
    const wrap = el.parentElement!;
    const id = wrap.dataset.exId!;
    cardElements.set(wrap.id, wrap);

    bindPressPhysics(el);
    el.addEventListener('pointerenter', () => { if (id) loadExercise(id); }, { once: true });
    el.addEventListener('focus', () => { if (id) loadExercise(id); }, { once: true });
    el.addEventListener('click', () => {
      if (id) navigateTo('session', { mode: 'practice', items: [{exerciseId: id}] });
    });
  });

  const searchInput = content.querySelector('.catalog-search') as HTMLInputElement;
  const selects = content.querySelectorAll('.catalog-select') as NodeListOf<HTMLSelectElement>;
  const countEl = content.querySelector('.catalog-results-count') as HTMLElement;
  const emptyEl = content.querySelector('.catalog-empty') as HTMLElement;
  const resetBtns = content.querySelectorAll('.catalog-reset, .catalog-reset-empty');

  function update() {
    let visibleCount = 0;
    const query = state.query.toLowerCase();

    // Hide/show group wrappers based on selected group mode
    content.querySelectorAll('.catalog-group-wrap').forEach(w => {
      (w as HTMLElement).classList.toggle('is-hidden', !w.classList.contains(`catalog-group-wrap-${state.group}`));
    });

    const activeWrap = content.querySelector(`.catalog-group-wrap-${state.group}`) as HTMLElement;
    if (!activeWrap) return;

    // Filter cards
    activeWrap.querySelectorAll('.catalog-group').forEach(groupEl => {
      let groupVisibleCount = 0;
      
      groupEl.querySelectorAll('[data-ex-id]').forEach(wrapEl => {
        const id = (wrapEl as HTMLElement).dataset.exId!;
        const data = exercisesData.find(d => d.manifest.id === id)!;
        
        const matchQuery = !query || data.searchString.includes(query);
        const matchDomain = state.domain === 'all' || data.manifest.domain === state.domain;
        const matchSkill = state.skill === 'all' || data.manifest.skills.includes(state.skill as any);
        const matchFormat = state.format === 'all' || data.manifest.metricModel === state.format;
        const matchDiff = state.difficulty === 'all' || data.intel.state === state.difficulty;

        const isVisible = matchQuery && matchDomain && matchSkill && matchFormat && matchDiff;
        
        (wrapEl as HTMLElement).classList.toggle('is-hidden', !isVisible);
        if (isVisible) {
          groupVisibleCount++;
          visibleCount++;
        }
      });

      (groupEl as HTMLElement).classList.toggle('is-hidden', groupVisibleCount === 0);
      const countLabel = groupEl.querySelector('.catalog-group-count');
      if (countLabel) countLabel.textContent = `(${groupVisibleCount})`;
    });

    // Update count & empty state
    countEl.textContent = visibleCount > 0 ? `Найдено упражнений: ${visibleCount}` : '';
    emptyEl.classList.toggle('is-hidden', visibleCount > 0);
  }

  // Event Listeners
  searchInput.addEventListener('input', (e) => {
    state.query = (e.target as HTMLInputElement).value;
    update();
  });

  selects.forEach(sel => {
    sel.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      const filter = target.dataset.filter as keyof typeof state;
      state[filter] = target.value;
      update();
    });
  });

  resetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      state.query = '';
      state.domain = 'all';
      state.skill = 'all';
      state.format = 'all';
      state.difficulty = 'all';
      
      searchInput.value = '';
      selects.forEach(s => {
        if (s.dataset.filter !== 'group') s.value = 'all';
      });
      update();
      searchInput.focus();
    });
  });

  // Initial update
  update();
}
