/**
 * Optional pre-session "Как вы сегодня?" check-in (sleep / stress).
 * A11y: each option row is a labelled role="group"; options are toggle
 * buttons with aria-pressed so the selection is not conveyed by colour only.
 */
export type LifestyleField = 'sleep' | 'stress';

interface Option {
  val: 'low' | 'normal' | 'high';
  label: string;
  aria?: string;
}

const OPTIONS: Record<LifestyleField, { title: string; options: Option[] }> = {
  sleep: {
    title: 'Сон',
    options: [
      { val: 'low', label: '&lt; 6 ч', aria: 'Меньше 6 часов' },
      { val: 'normal', label: '6–8 ч', aria: 'От 6 до 8 часов' },
      { val: 'high', label: '&gt; 8 ч', aria: 'Больше 8 часов' }
    ]
  },
  stress: {
    title: 'Стресс',
    options: [
      { val: 'low', label: 'Низкий' },
      { val: 'normal', label: 'Средний' },
      { val: 'high', label: 'Высокий' }
    ]
  }
};

function fieldHtml(field: LifestyleField): string {
  const cfg = OPTIONS[field];
  const labelId = `ls-${field}-label`;
  return `
          <div class="modal-field">
            <div class="modal-label" id="${labelId}">${cfg.title}</div>
            <div class="seg-row" role="group" aria-labelledby="${labelId}">
              ${cfg.options
                .map(
                  (o) =>
                    `<button class="btn-ls-${field} btn-secondary" data-val="${o.val}" type="button" aria-pressed="false"${
                      o.aria ? ` aria-label="${o.aria}"` : ''
                    }>${o.label}</button>`
                )
                .join('\n              ')}
            </div>
          </div>`;
}

export function lifestyleCheckinHtml(): string {
  return `
        <div class="surface modal-card">
          <h3 id="ls-title">Как вы сегодня?</h3>
          <p class="modal-lead">Необязательно. Помогает увидеть связь сна и результата.</p>
          ${fieldHtml('sleep')}
          ${fieldHtml('stress')}
          <button id="btn-ls-done" class="btn-primary" type="button">Начать тренировку</button>
          <button id="btn-ls-skip" class="btn-secondary" type="button">Пропустить</button>
        </div>
      `;
}

/** Single-select toggle behaviour for one field; keeps aria-pressed in sync with the visual state. */
export function bindLifestyleField(
  root: HTMLElement,
  field: LifestyleField,
  onChange: (val: string | null) => void
): void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>(`.btn-ls-${field}`)];
  buttons.forEach((b) => {
    b.addEventListener('click', () => {
      buttons.forEach((x) => {
        x.classList.remove('btn-primary');
        x.classList.add('btn-secondary');
        x.setAttribute('aria-pressed', 'false');
      });
      b.classList.remove('btn-secondary');
      b.classList.add('btn-primary');
      b.setAttribute('aria-pressed', 'true');
      onChange(b.dataset.val || null);
    });
  });
}
