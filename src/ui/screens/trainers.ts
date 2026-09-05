import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { getExerciseIntelligence } from '../../core/selectors';

export function renderTrainers(container: HTMLElement) {
  const content = renderShell(container, { active: 'trainers' });
  const exStates = storage.getExerciseStates();
  
  let gridHtml = registry.map(ex => {
    const st = exStates.find(s => s.exerciseId === ex.manifest.id);
    const lvl = st ? st.level : 1;
    const intel = getExerciseIntelligence(ex.manifest.id);
    
    let intelHtml = '';
    if (intel.isCalibrating) {
      intelHtml = `<div style="font-size: 11px; color: var(--muted); margin-top: 8px;">Калибровка (${intel.attempts}/3)</div>`;
    } else {
      const masteryColor = intel.mastery > 80 ? 'var(--ok)' : intel.mastery > 50 ? 'var(--accent)' : 'var(--text)';
      intelHtml = `
        <div style="font-size: 12px; color: var(--muted); margin-top: 8px; display: flex; gap: 12px;">
          <div>Освоение: <span style="color: ${masteryColor}; font-weight: 600;">${intel.mastery}%</span></div>
          <div>Сложность: <span style="color: var(--text);">${intel.difficulty}</span></div>
        </div>
      `;
    }

    return `
      <div class="trainer-card dom-${ex.manifest.domain}" data-id="${ex.manifest.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="trainer-domain">${ex.manifest.domain}</div>
          <img src="${import.meta.env.BASE_URL}art/icon-${ex.manifest.id}.svg" width="32" height="32" style="border-radius: 8px;">
        </div>
        <div class="trainer-name">${ex.manifest.name}</div>
        <div class="trainer-level">Ур. ${lvl}</div>
        ${intelHtml}
      </div>
    `;
  }).join('');

  content.innerHTML = `
    <h2>Тренажёры</h2>
    <p style="margin-bottom: 24px;">Тренируйте отдельные упражнения без влияния на общую статистику доменов.</p>
    <div class="trainers-grid">
      ${gridHtml}
    </div>
  `;

  content.querySelectorAll('.trainer-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = (card as HTMLElement).dataset.id;
      if (id) navigateTo('session', { mode: 'practice', items: [{exerciseId: id}] });
    });
  });
}
