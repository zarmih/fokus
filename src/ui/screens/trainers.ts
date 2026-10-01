import { navigateTo } from '../router';
import { catalog } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { getExerciseIntelligence } from '../../core/selectors';
import { domainLabel, DOMAIN_ORDER, skillLabel } from '../../core/labels';
import { bindPressPhysics } from '../../core/motion';

export function renderTrainers(container: HTMLElement) {
  const content = renderShell(container, { active: 'trainers' });
  const exStates = storage.getExerciseStates();
  
  // Compute honest counts and groups from visible data
  const domains = new Map<string, any[]>();
  catalog.forEach(ex => {
    const d = ex.manifest.domain;
    if (!domains.has(d)) domains.set(d, []);
    domains.get(d)!.push(ex);
  });

  const validDomains = DOMAIN_ORDER.filter(d => domains.has(d) && domains.get(d)!.length > 0);
  // Also collect any other domains that might be in the catalog but not in DOMAIN_ORDER
  domains.forEach((_, d) => {
    if (!validDomains.includes(d as any) && domains.get(d)!.length > 0) {
      validDomains.push(d as any);
    }
  });

  const untriedExercises = catalog.filter(ex => {
    const st = exStates.find(s => s.exerciseId === ex.manifest.id);
    return !st || (st.attempts === undefined ? !st.lastPlayedAt : st.attempts === 0);
  });
  const untriedCount = untriedExercises.length;

  // Build filters explicitly reflecting counts
  function renderCard(ex: any) {
    const st = exStates.find(s => s.exerciseId === ex.manifest.id);
    const isUntried = !st || (st.attempts === undefined ? !st.lastPlayedAt : st.attempts === 0);
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

    const currentStateLabel = stateLabels[intel.state] || intel.state;

    if (intel.state === 'CALIBRATING') {
      intelHtml = `
        <div style="margin-top: 12px;" aria-hidden="true">
          <div style="font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Калибровка (${intel.attempts}/3)</div>
          <div class="scale-track" style="height: 4px; opacity: 0.3; margin: 0;"><div class="scale-fill" style="width: 100%; background: var(--muted);"></div></div>
          <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">Сложность: ${intel.difficulty}</div>
        </div>`;
    } else {
      const stateColor = intel.state === 'STABLE' ? 'var(--ok)' : intel.state === 'CHALLENGE' ? 'var(--accent)' : intel.state === 'PLATEAU' ? 'var(--danger)' : 'var(--text)';
      let avgTrend = 0;
      if (intel.skills.length > 0) {
        avgTrend = intel.skills.reduce((sum, s) => sum + (s.trend || 0), 0) / intel.skills.length;
      }
      const trendStr = avgTrend > 0.05 ? '↑' : avgTrend < -0.05 ? '↓' : '→';
      const trendColor = avgTrend > 0.05 ? 'var(--ok)' : avgTrend < -0.05 ? 'var(--danger)' : 'var(--muted)';

      intelHtml = `
        <div style="margin-top: 12px;" aria-hidden="true">
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px;">
            <div style="font-size: 11px; color: ${stateColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
              ${currentStateLabel}
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

    const searchableText = `${ex.manifest.name} ${ex.manifest.instruction} ${domainLabel(ex.manifest.domain)} ${(ex.manifest.skills || []).map(skillLabel).join(' ')}`.toLowerCase();
    const ariaLabel = `${ex.manifest.name}. Домен: ${domainLabel(ex.manifest.domain)}. Статус: ${currentStateLabel}. Уровень сложности: ${intel.difficulty}. Нажмите, чтобы начать тренировку.`;

    return `
      <button type="button" class="trainer-card press-physics dom-${ex.manifest.domain}" data-id="${ex.manifest.id}" data-untried="${isUntried}" data-search="${searchableText.replace(/"/g, '&quot;')}" aria-label="${ariaLabel}" style="position: relative;">
        <div class="trainer-header-row">
          <div class="trainer-domain">${domainLabel(ex.manifest.domain)}</div>
          <div class="trainer-icon-wrap">
            <img src="${import.meta.env.BASE_URL}art/icon-${ex.manifest.id}.svg" width="24" height="24" alt="" decoding="async" loading="lazy">
          </div>
        </div>
        <div class="trainer-name">${ex.manifest.name}</div>
        <div class="trainer-instruction">${ex.manifest.instruction}</div>
        <div style="margin-bottom: 8px;">
          ${(ex.manifest.skills || []).slice(0, 2).map((s: string) => `<span style="display: inline-block; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 9px; text-transform: uppercase; margin-right: 4px; margin-top: 6px;">${skillLabel(s)}</span>`).join('')}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto; width: 100%;">
          <div class="trainer-level">Ур. ${lvl}</div>
        </div>
        ${intelHtml}
      </button>
    `;
  }

  const DOMAIN_ICONS: Record<string, string> = {
    attention: '🎯',
    memory: '🧠',
    speed: '⚡',
    flexibility: '🔀',
    logic: '🧩'
  };

  const DOMAIN_DESCRIPTIONS: Record<string, string> = {
    attention: 'Концентрация и устойчивость к отвлечениям',
    memory: 'Удержание и точное воспроизведение информации',
    speed: 'Скорость реакции и обработки визуальных данных',
    flexibility: 'Быстрое переключение между правилами и задачами',
    logic: 'Анализ, пространственное мышление и вычисления'
  };

  let filterHtml = `<button class="filter-chip active" data-dom="all" type="button" aria-pressed="true">
    <span style="font-size:14px; margin-right:4px;">🌐</span> Все <span class="chip-count" style="opacity:0.6; font-size:11px; margin-left:4px;">${catalog.length}</span>
  </button>`;
  
  filterHtml += `<button class="filter-chip" data-dom="discovery" type="button" aria-pressed="false">
    <span style="font-size:14px; margin-right:4px;">✨</span> Новое <span class="chip-count" style="opacity:0.6; font-size:11px; margin-left:4px;">${untriedCount}</span>
  </button>`;

  filterHtml += `<div style="width: 1px; height: 24px; background: var(--line); margin: 0 8px; align-self: center; opacity: 0.5;"></div>`;

  filterHtml += validDomains.map((dom) => {
    const count = domains.get(dom)!.length;
    const label = domainLabel(dom);
    const icon = DOMAIN_ICONS[dom] || '▪️';
    return `<button class="filter-chip" data-dom="${dom}" type="button" aria-pressed="false">
      <span style="font-size:14px; margin-right:4px;">${icon}</span> ${label} <span class="chip-count" style="opacity:0.6; font-size:11px; margin-left:4px;">${count}</span>
    </button>`;
  }).join('');

  let allCardsHtml = '';

  validDomains.forEach((dom) => {
    const exercises = domains.get(dom)!.sort((a, b) => {
      const intelA = getExerciseIntelligence(a.manifest.id);
      const intelB = getExerciseIntelligence(b.manifest.id);
      const diffA = Number(intelA.difficulty);
      const diffB = Number(intelB.difficulty);
      if (diffA !== diffB) {
        return diffA - diffB;
      }
      return a.manifest.name.localeCompare(b.manifest.name, 'ru');
    });
    
    let gridHtml = exercises.map(renderCard).join('');
    const icon = DOMAIN_ICONS[dom] || '▪️';
    const desc = DOMAIN_DESCRIPTIONS[dom] || '';

    allCardsHtml += `
      <div class="domain-group" data-group="${dom}" style="margin-bottom: 40px;">
        <div style="margin-bottom: 20px; padding-left: 4px;">
          <h3 style="font-size: 22px; font-weight: 700; margin: 0 0 4px 0; letter-spacing: -0.02em; display: flex; align-items: center; gap: 8px; color: var(--text);">
            <span style="font-size: 24px;">${icon}</span> ${domainLabel(dom)}
            <span class="domain-visible-count" style="font-size: 13px; font-weight: 600; color: var(--muted); background: var(--surface); border: 1px solid var(--line); padding: 2px 10px; border-radius: 12px; margin-left: 4px;">${exercises.length}</span>
          </h3>
          ${desc ? `<p style="font-size: 14px; color: var(--muted); margin: 0; padding-left: 36px; line-height: 1.4;">${desc}</p>` : ''}
        </div>
        <div class="trainers-grid">
          ${gridHtml}
        </div>
      </div>
    `;
  });

  content.innerHTML = `
    <div class="today-head" style="margin-bottom: 24px;">
      <h2 style="font-size: 28px; letter-spacing: -0.03em; margin-bottom: 8px; font-weight: 700;">Каталог</h2>
      <p class="today-date" id="catalog-count-label" style="opacity: 0.7; font-size: 15px;" aria-live="polite">
        Свободная практика — тренируйтесь без влияния на Fokus Index. Всего ${catalog.length} упражнений.
      </p>
    </div>
    
    <div style="margin-bottom: 24px; position: relative;">
      <span style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); opacity: 0.5; pointer-events: none; font-size: 16px;">🔍</span>
      <input type="search" id="catalog-search" placeholder="Поиск по названию или навыку..." style="width: 100%; padding: 14px 16px 14px 44px; border-radius: 16px; border: 1px solid var(--line); background: var(--surface); color: var(--text); font-size: 15px; outline: none; transition: all 0.2s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);" aria-label="Поиск упражнений" autocomplete="off">
    </div>

    <div class="domain-filters" role="group" aria-label="Фильтры доменов" style="margin-bottom: 32px; display: flex; flex-wrap: wrap; gap: 8px;">
      ${filterHtml}
    </div>
    
    <div class="catalog-groups-container" aria-live="polite">
      ${validDomains.length === 0 ? `
        <div style="padding: 48px 24px; text-align: center; background: var(--surface); border-radius: 20px; border: 1px solid var(--line);">
          <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📭</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Каталог пуст</div>
          <div style="color: var(--muted); font-size: 14px;">Упражнения временно недоступны.</div>
        </div>
      ` : allCardsHtml}
      <div id="catalog-empty-state" style="display: none; padding: 56px 24px; text-align: center; background: linear-gradient(145deg, rgba(255,255,255,0.02), transparent); border-radius: 24px; border: 1px dashed var(--line);" role="status">
        <div id="empty-state-icon" style="font-size: 56px; margin-bottom: 20px; opacity: 0.8; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));" aria-hidden="true">🔍</div>
        <div id="empty-state-title" style="font-size: 20px; font-weight: 700; margin-bottom: 12px; letter-spacing: -0.01em;">Ничего не найдено</div>
        <div id="empty-state-desc" style="color: var(--muted); font-size: 15px; margin-bottom: 28px; max-width: 400px; margin-left: auto; margin-right: auto; line-height: 1.5;">По вашему запросу не нашлось упражнений. Попробуйте изменить текст поиска или выбрать другой раздел.</div>
        <button type="button" id="catalog-clear-search" style="padding: 12px 24px; background: var(--accent); color: var(--bg); border: none; border-radius: 12px; font-weight: 700; font-size: 15px; cursor: pointer; transition: transform 0.2s, background 0.2s; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">Сбросить поиск</button>
      </div>
    </div>
  `;

  const searchInput = content.querySelector('#catalog-search') as HTMLInputElement;
  const emptyState = content.querySelector('#catalog-empty-state') as HTMLElement;
  const clearSearchBtn = content.querySelector('#catalog-clear-search') as HTMLButtonElement;
  let activeDom = 'all';

  function updateVisibility() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    let count = 0;
    
    let allMatches = 0;
    let discoveryMatches = 0;
    const domainMatches = new Map<string, number>();

    content.querySelectorAll('.domain-group').forEach(group => {
      let groupVisibleCount = 0;
      let groupMatchCount = 0;
      const groupDom = (group as HTMLElement).dataset.group;
      
      group.querySelectorAll('.trainer-card').forEach(card => {
        const el = card as HTMLElement;
        const isUntried = el.dataset.untried === 'true';
        const matchesSearch = query === '' || (el.dataset.search && el.dataset.search.includes(query));
        
        if (matchesSearch) {
          allMatches++;
          if (isUntried) discoveryMatches++;
          groupMatchCount++;
        }

        let matchesDom = false;
        if (activeDom === 'all') {
          matchesDom = true;
        } else if (activeDom === 'discovery') {
          matchesDom = isUntried;
        } else {
          matchesDom = activeDom === groupDom;
        }
        
        const show = matchesDom && matchesSearch;
        el.style.display = show ? '' : 'none';
        if (show) groupVisibleCount++;
      });
      
      if (groupDom) domainMatches.set(groupDom, groupMatchCount);
      group.classList.toggle('is-hidden', groupVisibleCount === 0);
      const countEl = group.querySelector('.domain-visible-count');
      if (countEl) countEl.textContent = groupVisibleCount.toString();
      count += groupVisibleCount;
    });

    content.querySelectorAll('.filter-chip').forEach(chip => {
      const c = chip as HTMLButtonElement;
      const dom = c.dataset.dom;
      let matches = 0;
      if (dom === 'all') matches = allMatches;
      else if (dom === 'discovery') matches = discoveryMatches;
      else if (dom) matches = domainMatches.get(dom) || 0;
      
      const countSpan = c.querySelector('.chip-count');
      if (countSpan) countSpan.textContent = matches.toString();
      
      c.disabled = matches === 0 && activeDom !== dom;
      c.style.opacity = (matches === 0 && activeDom !== dom) ? '0.4' : '1';
    });
    
    const countLabel = content.querySelector('#catalog-count-label');
    if (countLabel) {
      function pluralize(n: number, forms: [string, string, string]) {
        const n10 = n % 10;
        const n100 = n % 100;
        if (n10 === 1 && n100 !== 11) return forms[0];
        if ([2, 3, 4].includes(n10) && ![12, 13, 14].includes(n100)) return forms[1];
        return forms[2];
      }
      const labelText = count === catalog.length 
        ? `${catalog.length} упражнений. Свободная практика — без влияния на Fokus Index.`
        : `Найдено ${count} ${pluralize(count, ['упражнение', 'упражнения', 'упражнений'])}.`;
      countLabel.textContent = labelText;
    }
    
    if (emptyState) {
      if (count === 0) {
        emptyState.style.display = 'block';
        const icon = emptyState.querySelector('#empty-state-icon');
        const title = emptyState.querySelector('#empty-state-title');
        const desc = emptyState.querySelector('#empty-state-desc');
        const btn = emptyState.querySelector('#catalog-clear-search') as HTMLElement;
        if (activeDom === 'discovery' && query === '') {
          if (icon) icon.textContent = '🎉';
          if (title) title.textContent = 'Вы попробовали все упражнения!';
          if (desc) desc.textContent = 'Новых упражнений в каталоге сейчас нет — это нормально. Можно вернуться к знакомым блокам или открыть все разделы.';
          if (btn) btn.style.display = 'none';
        } else if (activeDom !== 'all' && query === '') {
          if (icon) icon.textContent = '📂';
          if (title) title.textContent = 'В этом разделе пусто';
          if (desc) desc.textContent = 'В выбранном домене сейчас нет упражнений по фильтру. Откройте «Все» или другой раздел.';
          if (btn) btn.style.display = 'none';
        } else {
          if (icon) icon.textContent = '🔍';
          if (title) title.textContent = 'Ничего не найдено';
          if (desc) desc.textContent = 'По этому запросу и фильтру ничего нет. Сбросьте поиск или выберите другой раздел — без потери прогресса.';
          if (btn) btn.style.display = 'inline-block';
        }
      } else {
        emptyState.style.display = 'none';
      }
    }
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      activeDom = 'all';
      content.querySelectorAll('.filter-chip').forEach(c => {
        const on = (c as HTMLElement).dataset.dom === 'all';
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      updateVisibility();
      if (searchInput) searchInput.focus();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', updateVisibility);
    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = 'var(--accent)';
    });
    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = 'var(--line)';
    });
  }

  content.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      activeDom = (chip as HTMLElement).dataset.dom || 'all';
      
      content.querySelectorAll('.filter-chip').forEach(c => {
        const on = c === chip;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      
      updateVisibility();
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

