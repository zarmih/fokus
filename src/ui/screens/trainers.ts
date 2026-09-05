import { navigateTo } from '../router';
import { registry } from '../../exercises/registry';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';

export function renderTrainers(container: HTMLElement) {
  const content = renderShell(container, { active: 'trainers' });
  const exStates = storage.getExerciseStates();
  
  let gridHtml = registry.map(ex => {
    const st = exStates.find(s => s.exerciseId === ex.id);
    const lvl = st ? st.level : 1;
    return `
      <div class="trainer-card dom-${ex.domain}" data-id="${ex.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="trainer-domain">${ex.domain}</div>
          <img src="${import.meta.env.BASE_URL}art/icon-${ex.id}.svg" width="32" height="32" style="border-radius: 8px;">
        </div>
        <div class="trainer-name">${ex.name}</div>
        <div class="trainer-level">Ур. ${lvl}</div>
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
