import { storage } from '../../core/storage';
import { renderShell } from '../shell';

export function renderSettings(container: HTMLElement) {
  const content = renderShell(container, { active: 'settings' });
  const profile = storage.getProfile();
  
  content.innerHTML = `
    <h2>Настройки</h2>
    
    <div class="surface" style="margin-top: 24px;">
      <h3 style="margin-bottom: 16px;">Длительность сессии</h3>
      <div class="segmented" id="duration-segmented">
        <button data-val="300" class="${profile.sessionLengthSec === 300 ? 'active' : ''}">5 мин</button>
        <button data-val="480" class="${profile.sessionLengthSec === 480 ? 'active' : ''}">8 мин</button>
        <button data-val="720" class="${profile.sessionLengthSec === 720 ? 'active' : ''}">12 мин</button>
      </div>
    </div>
    
    <div class="disclaimer">
      Fokus — тренажёр для поддержания когнитивного тонуса. Не является медицинским изделием. Не предназначен для лечения или диагностики.
    </div>
  `;

  const btns = content.querySelectorAll('#duration-segmented button');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = parseInt((btn as HTMLElement).dataset.val || '300', 10);
      const p = storage.getProfile();
      p.sessionLengthSec = val;
      storage.setProfile(p);
    });
  });
}
