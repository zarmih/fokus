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

  const playedCount = exStates.filter(s => (s.attempts && s.attempts > 0) || s.lastPlayedAt).length;
  const untriedCount = catalog.length - playedCount;

  // Build filters explicitly reflecting counts
  let filterHtml = `<button class="filter-chip active" data-dom="all" type="button" aria-pressed="true">Все <span style="opacity:0.6; font-size:11px;">${catalog.length}</span></button>`;
  if (untriedCount > 0) {
    filterHtml += `<button class="filter-chip" data-dom="discovery" type="button" aria-pressed="false" style="color: var(--accent); border-color: rgba(234, 179, 8, 0.3);">Новое <span style="opacity:0.6; font-size:11px;">${untriedCount}</span></button>`;
  }
  filterHtml += validDomains.map((dom, i) => {
    const count = domains.get(dom)!.length;
    const isWeak = count < 5;
    const label = domainLabel(dom);
    const weakFlag = isWeak ? ' <span style="opacity:0.5; font-size:0.9em;">(мало)</span>' : '';
    const isActive = false;
    return `<button class="filter-chip ${isActive ? 'active' : ''}" data-dom="${dom}" type="button" aria-pressed="${isActive ? 'true' : 'false'}">${label} <span style="opacity:0.6; font-size:11px;">${count}</span>${weakFlag}</button>`;
  }).join('');

  let allCardsHtml = '';
  validDomains.forEach((dom, i) => {
    const exercises = domains.get(dom)!;
    const isActive = true;
    
    let gridHtml = exercises.map(ex => {
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
          avgTrend = intel.skills.reduce((sum, s) => sum + (s.trend || 0), 0) / intel.skills.length;
        }
        const trendStr = avgTrend > 0.05 ? '↑' : avgTrend < -0.05 ? '↓' : '→';
        const trendColor = avgTrend > 0.05 ? 'var(--ok)' : avgTrend < -0.05 ? 'var(--danger)' : 'var(--muted)';

        intelHtml = `
          <div style="margin-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 4px;">
              <div style="font-size: 11px; color: ${stateColor}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                ${stateLabels[intel.state] || intel.state}
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
        <button type="button" class="trainer-card press-physics dom-${ex.manifest.domain}" data-id="${ex.manifest.id}" data-untried="${isUntried}" aria-label="${ex.manifest.name}, ${domainLabel(ex.manifest.domain)}, уровень ${lvl}" style="position: relative;">
          ${isUntried ? `<div style="position: absolute; top: -6px; right: -6px; background: var(--accent); color: #000; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 8px; text-transform: uppercase; z-index: 2;">Новое</div>` : ''}
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
    }).join('');

    allCardsHtml += `
      <div class="domain-group ${isActive ? '' : 'is-hidden'}" data-group="${dom}">
        <div class="trainers-grid">
          ${gridHtml}
        </div>
      </div>
    `;
  });

  content.innerHTML = `
    <div class="today-head" style="margin-bottom: 24px;">
      <h2 style="font-size: 28px; letter-spacing: -0.03em; margin-bottom: 8px;">Каталог</h2>
      <p class="today-date" id="catalog-count-label" style="opacity: 0.7;" aria-live="polite">
        ${catalog.length} упражнений. Практика без влияния на Fokus Index.
      </p>
    </div>
    <div style="margin-bottom: 24px; padding: 16px; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--line);">
      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: var(--muted); margin-bottom: 12px;">Покрытие доменов</div>
      <div style="display: flex; gap: 4px; height: 12px; border-radius: 6px; overflow: hidden; margin-bottom: 12px;">
        ${validDomains.map(dom => {
          const count = domains.get(dom)!.length;
          const percent = (count / catalog.length) * 100;
          return `<div style="width: ${percent}%; background: var(--dom-${dom});" title="${domainLabel(dom)}: ${count}"></div>`;
        }).join('')}
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px;">
        ${validDomains.map(dom => {
          const count = domains.get(dom)!.length;
          return `<div style="display: flex; align-items: center; gap: 6px;"><div style="width: 8px; height: 8px; border-radius: 50%; background: var(--dom-${dom});"></div><span style="color: var(--muted);">${domainLabel(dom)}: <strong style="color: var(--text);">${count}</strong></span></div>`;
        }).join('')}
      </div>
    </div>
    <div class="domain-filters" role="group" aria-label="Фильтры доменов">
      ${filterHtml}
    </div>
    <div class="catalog-groups-container">
      ${validDomains.length === 0 ? '<div style="opacity: 0.6; padding: 24px 0;">Нет доступных упражнений</div>' : allCardsHtml}
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
      
      let count = 0;
      content.querySelectorAll('.domain-group').forEach(group => {
        let groupVisibleCount = 0;
        group.querySelectorAll('.trainer-card').forEach(card => {
          const el = card as HTMLElement;
          const show = dom === 'all' || 
                       (dom === 'discovery' && el.dataset.untried === 'true') || 
                       (dom === (group as HTMLElement).dataset.group);
          el.style.display = show ? '' : 'none';
          if (show) groupVisibleCount++;
        });
        
        group.classList.toggle('is-hidden', groupVisibleCount === 0);
        count += groupVisibleCount;
      });
      
      const countLabel = content.querySelector('#catalog-count-label');
      if (countLabel) {
        countLabel.textContent = `${count} упражнений. Практика без влияния на Fokus Index.`;
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
