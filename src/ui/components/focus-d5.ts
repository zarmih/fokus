import { bindDialog } from '../a11y';

export function renderInterruptOverlay(
  container: HTMLElement,
  source: 'user' | 'system',
  onResume: () => void
) {
  let overlay = document.getElementById('pause-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.className = 'modal-root focus-pause-d5';
    overlay.setAttribute('role', 'status');
    const text = source === 'system' ? 'Пауза — экран скрыт' : 'Пауза';
    overlay.innerHTML = `
      <div class="surface modal-card pause-card">
        <h3 id="pause-title">${text}</h3>
        <p class="modal-lead">Сессия приостановлена.</p>
        <button id="btn-resume-focus" class="btn-primary" type="button">Продолжить</button>
      </div>
    `;
    
    // Append to container to satisfy tests and DOM tree structure
    container.appendChild(overlay);

    const btn = overlay.querySelector('#btn-resume-focus');
    btn?.addEventListener('click', onResume);

    const unbind = bindDialog(overlay, {
      labelledBy: 'pause-title',
      onClose: onResume
    });

    (overlay as any)._unbindFocusPause = unbind;
  }
}

export function removeInterruptOverlay() {
  const overlay = document.getElementById('pause-overlay');
  if (overlay) {
    if ((overlay as any)._unbindFocusPause) {
      (overlay as any)._unbindFocusPause();
    }
    overlay.remove();
  }
}
