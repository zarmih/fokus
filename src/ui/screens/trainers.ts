import { navigateTo } from '../router';
import { catalog } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { getExerciseIntelligence } from '../../core/selectors';
import { domainLabel, DOMAIN_ORDER } from '../../core/labels';
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

  // Build filters explicitly reflecting counts
  const filterHtml = validDomains.map((dom, i) => {
    const count = domains.get(dom)!.length;
    const isWeak = count < 5;
    const label = domainLabel(dom);
    const weakFlag = isWeak ? ' <span style="opacity:0.5; font-size:0.9em;">(мало)</span>' : '';
    // default to first valid domain, removing 'all' to avoid noisy wall of cards
    const isActive = i === 0;
    return `<button class="filter-chip ${isActive ? 'active' : ''}" data-dom="${dom}" type="button" aria-pressed="${isActive ? 'true' : 'false'}">${label} <span style="opacity:0.6; font-size:11px;">${count}</span>${weakFlag}</button>`;
  }).join('');

  let allCardsHtml = '';
  validDomains.forEach((dom, i) => {
    const exercises = domains.get(dom)!;
    const isActive = i === 0;
    
    let gridHtml = exercises.map(ex => {
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
        <button type="button" class="trainer-card press-physics dom-${ex.manifest.domain}" data-id="${ex.manifest.id}" aria-label="${ex.manifest.name}, ${domainLabel(ex.manifest.domain)}, уровень ${lvl}">
          <div class="trainer-header-row">
            <div class="trainer-domain">${domainLabel(ex.manifest.domain)}</div>
            <div class="trainer-icon-wrap">
              <img src="${import.meta.env.BASE_URL}art/icon-${ex.manifest.id}.svg" width="24" height="24" alt="" decoding="async" loading="lazy">
            </div>
          </div>
          <div class="trainer-name">${ex.manifest.name}</div>
          <div class="trainer-instruction">${ex.manifest.instruction}</div>
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
      <p class="today-date" id="catalog-count-label" style="opacity: 0.7;">
        ${validDomains.length > 0 ? domains.get(validDomains[0])!.length : 0} упражнений. Практика без влияния на Fokus Index.
      </p>
    </div>
    <div class="domain-filters">
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
        const match = (group as HTMLElement).dataset.group === dom;
        group.classList.toggle('is-hidden', !match);
        if (match) {
           const cards = group.querySelectorAll('.trainer-card');
           count = cards.length;
        }
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
