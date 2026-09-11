import { storage } from '../../core/storage';
import { renderShell } from '../shell';
import { applyTheme } from '../theme';
import { setLocale, t, type Locale } from '../../core/i18n';
import { getGoalCopy } from '../../core/labels';

export function renderSettings(container: HTMLElement) {
  const content = renderShell(container, { active: 'settings' });
  const profile = storage.getProfile();
  
  const currentLang = profile.language || profile.locale || 'ru';
  const goals = getGoalCopy();
  const goalHtml = goals.map((g) => {
    const active = (!profile.primaryGoal && g.id === 'balance') || profile.primaryGoal === g.id;
    return `<button data-val="${g.id}" class="${active ? 'active' : ''}">${g.title}</button>`;
  }).join('');

  content.innerHTML = `
    <h2>${t('settings.title')}</h2>
    
    <div class="surface" style="margin-top: 24px;">
      <h3 style="margin-bottom: 16px;">${t('settings.duration')}</h3>
      <div class="segmented" id="duration-segmented">
        <button data-val="300" class="${profile.sessionLengthSec === 300 ? 'active' : ''}">${t('settings.min5')}</button>
        <button data-val="480" class="${profile.sessionLengthSec === 480 ? 'active' : ''}">${t('settings.min8')}</button>
        <button data-val="720" class="${profile.sessionLengthSec === 720 ? 'active' : ''}">${t('settings.min12')}</button>
      </div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">${t('settings.goal')}</h3>
      <div class="segmented" id="goal-segmented" style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${goalHtml}
      </div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">${t('settings.theme')}</h3>
      <div class="segmented" id="theme-segmented">
        <button data-val="light" class="${profile.theme === 'light' ? 'active' : ''}">${t('settings.theme.light')}</button>
        <button data-val="dark" class="${profile.theme === 'dark' || !profile.theme ? 'active' : ''}">${t('settings.theme.dark')}</button>
      </div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">${t('settings.lang')}</h3>
      <div class="segmented" id="lang-segmented">
        <button data-val="ru" class="${currentLang === 'ru' ? 'active' : ''}">${t('settings.lang_ru')}</button>
        <button data-val="en" class="${currentLang === 'en' ? 'active' : ''}">${t('settings.lang_en')}</button>
      </div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">${t('settings.sound_section')}</h3>
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="sound-toggle" ${profile.soundOn ? 'checked' : ''} />
        ${t('settings.sound')}
      </label>
    </div>

    <div class="surface" id="install-container" style="display: none;">
      <h3 style="margin-bottom: 16px;">${t('settings.install_section')}</h3>
      <button id="btn-install" class="btn-primary" style="width: 100%; margin-bottom: 8px;">${t('settings.install_cta')}</button>
      <div style="font-size: 11px; color: var(--muted); text-align: center;">${t('settings.install_hint')}</div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">${t('settings.notifications')}</h3>
      <button id="btn-notifications" class="btn-secondary" style="width: 100%;">${t('settings.notifications_cta')}</button>
      <div style="font-size: 13px; color: var(--muted); margin: 12px 0 8px;">${t('settings.reminder_at')}</div>
      <div class="segmented" id="reminder-segmented">
        <button data-val="8" class="${profile.reminderHour === 8 ? 'active' : ''}">08:00</button>
        <button data-val="9" class="${profile.reminderHour === 9 || profile.reminderHour === undefined ? 'active' : ''}">09:00</button>
        <button data-val="12" class="${profile.reminderHour === 12 ? 'active' : ''}">12:00</button>
        <button data-val="19" class="${profile.reminderHour === 19 ? 'active' : ''}">19:00</button>
        <button data-val="off" class="${profile.reminderHour === null ? 'active' : ''}">${t('settings.reminder_off')}</button>
      </div>
      <div style="font-size: 11px; color: var(--muted); margin-top: 8px; text-align: center;">${t('settings.reminder_hint')}</div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">${t('settings.pre_session')}</h3>
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="lifestyle-toggle" ${profile.skipLifestylePrompt ? 'checked' : ''} />
        ${t('settings.skip_lifestyle')}
      </label>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">${t('settings.data')}</h3>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button id="btn-export" class="btn-primary" style="flex: 1;">${t('settings.export')}</button>
        <button id="btn-import" class="btn-secondary" style="flex: 1;" onclick="document.getElementById('file-input').click()">${t('settings.import')}</button>
        <input type="file" id="file-input" accept=".json" style="display: none;">
      </div>
      <button id="btn-reset" class="btn-secondary" style="width: 100%; margin-top: 12px; color: #f44336; border-color: #f44336;">${t('settings.reset')}</button>
    </div>
    
    <div class="disclaimer">
      ${t('settings.disclaimer')}
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

  const tbtns = content.querySelectorAll('#theme-segmented button');
  tbtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tbtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = (btn as HTMLElement).dataset.val as 'light' | 'dark';
      const p = storage.getProfile();
      p.theme = val;
      storage.setProfile(p);
      applyTheme(val);
    });
  });

  const gbtns = content.querySelectorAll('#goal-segmented button');
  gbtns.forEach(btn => {
    btn.addEventListener('click', () => {
      gbtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = (btn as HTMLElement).dataset.val;
      const p = storage.getProfile();
      p.primaryGoal = val;
      storage.setProfile(p);
    });
  });

  document.getElementById('sound-toggle')?.addEventListener('change', (e) => {
    const p = storage.getProfile();
    p.soundOn = (e.target as HTMLInputElement).checked;
    storage.setProfile(p);
    if (p.soundOn) import('../../core/audio').then((a) => a.unlockAudio());
  });

  const lbtns = content.querySelectorAll('#lang-segmented button');
  lbtns.forEach(btn => {
    btn.addEventListener('click', () => {
      lbtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = (btn as HTMLElement).dataset.val as Locale;
      const p = storage.getProfile();
      p.language = val;
      p.locale = val;
      storage.setProfile(p);
      setLocale(val);
      location.reload();
    });
  });

  import('../../main').then(({ deferredPrompt }) => {
    const installContainer = document.getElementById('install-container');
    const btnInstall = document.getElementById('btn-install');
    if (deferredPrompt && installContainer && btnInstall) {
      installContainer.style.display = 'block';
      btnInstall.addEventListener('click', async () => {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installContainer.style.display = 'none';
        }
      });
    }
  });

  document.getElementById('lifestyle-toggle')?.addEventListener('change', (e) => {
    const p = storage.getProfile();
    p.skipLifestylePrompt = (e.target as HTMLInputElement).checked;
    storage.setProfile(p);
  });

  const rbtns = content.querySelectorAll('#reminder-segmented button');
  rbtns.forEach(btn => {
    btn.addEventListener('click', () => {
      rbtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const raw = (btn as HTMLElement).dataset.val;
      const p = storage.getProfile();
      p.reminderHour = raw === 'off' ? null : parseInt(raw || '9', 10);
      storage.setProfile(p);
      import('../../core/reminders').then(m => m.scheduleLocalReminder());
    });
  });

  const btnNotif = document.getElementById('btn-notifications');
  if (btnNotif) {
    if ('Notification' in window && Notification.permission === 'granted') {
      btnNotif.textContent = t('settings.notifications_on');
      (btnNotif as HTMLButtonElement).disabled = true;
    }
    btnNotif.addEventListener('click', () => {
      if ('Notification' in window) {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            btnNotif.textContent = t('settings.notifications_on');
            (btnNotif as HTMLButtonElement).disabled = true;
            new Notification('Fokus', { body: t('settings.notify_ok_body') });
            import('../../core/reminders').then(m => m.scheduleLocalReminder());
          } else {
            alert(t('settings.notify_denied'));
          }
        });
      } else {
        alert(t('settings.notify_unsupported'));
      }
    });
  }

  document.getElementById('btn-export')?.addEventListener('click', () => {
    const json = storage.exportJson();
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fokus-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      if (typeof re.target?.result === 'string') {
        const ok = storage.importJson(re.target.result);
        if (ok) {
          alert(t('settings.import_ok'));
          location.reload();
        } else {
          alert(t('settings.import_err'));
        }
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm(t('settings.reset_confirm'))) {
      storage.reset();
      location.reload();
    }
  });
}
