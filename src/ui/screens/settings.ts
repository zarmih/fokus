import { storage } from '../../core/storage';
import { renderShell } from '../shell';
import { applyTheme } from '../theme';
import { applyDocumentLang } from '../a11y';

export function renderSettings(container: HTMLElement) {
  const content = renderShell(container, { active: 'settings' });
  const profile = storage.getProfile();
  
  content.innerHTML = `
    <h2>Настройки</h2>
    
    <div class="surface" style="margin-top: 24px;">
      <h3 style="margin-bottom: 16px;">Длительность сессии</h3>
      <div class="segmented" id="duration-segmented" role="radiogroup" aria-label="Длительность сессии">
        <button type="button" role="radio" data-val="300" class="${profile.sessionLengthSec === 300 ? 'active' : ''}" aria-checked="${profile.sessionLengthSec === 300 ? 'true' : 'false'}">5 мин</button>
        <button type="button" role="radio" data-val="480" class="${profile.sessionLengthSec === 480 ? 'active' : ''}" aria-checked="${profile.sessionLengthSec === 480 ? 'true' : 'false'}">8 мин</button>
        <button type="button" role="radio" data-val="720" class="${profile.sessionLengthSec === 720 ? 'active' : ''}" aria-checked="${profile.sessionLengthSec === 720 ? 'true' : 'false'}">12 мин</button>
      </div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Главная цель</h3>
      <div class="segmented" id="goal-segmented" role="radiogroup" aria-label="Главная цель" style="display: flex; flex-wrap: wrap; gap: 8px;">
        <button type="button" role="radio" data-val="balance" class="${!profile.primaryGoal || profile.primaryGoal === 'balance' ? 'active' : ''}" aria-checked="${!profile.primaryGoal || profile.primaryGoal === 'balance' ? 'true' : 'false'}">Баланс</button>
        <button type="button" role="radio" data-val="memory" class="${profile.primaryGoal === 'memory' ? 'active' : ''}" aria-checked="${profile.primaryGoal === 'memory' ? 'true' : 'false'}">Память</button>
        <button type="button" role="radio" data-val="attention" class="${profile.primaryGoal === 'attention' ? 'active' : ''}" aria-checked="${profile.primaryGoal === 'attention' ? 'true' : 'false'}">Внимание</button>
        <button type="button" role="radio" data-val="speed" class="${profile.primaryGoal === 'speed' ? 'active' : ''}" aria-checked="${profile.primaryGoal === 'speed' ? 'true' : 'false'}">Скорость</button>
        <button type="button" role="radio" data-val="flexibility" class="${profile.primaryGoal === 'flexibility' ? 'active' : ''}" aria-checked="${profile.primaryGoal === 'flexibility' ? 'true' : 'false'}">Гибкость</button>
        <button type="button" role="radio" data-val="logic" class="${profile.primaryGoal === 'logic' ? 'active' : ''}" aria-checked="${profile.primaryGoal === 'logic' ? 'true' : 'false'}">Логика</button>
      </div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Тема</h3>
      <div class="segmented" id="theme-segmented" role="radiogroup" aria-label="Тема">
        <button type="button" role="radio" data-val="light" class="${profile.theme === 'light' ? 'active' : ''}" aria-checked="${profile.theme === 'light' ? 'true' : 'false'}">Светлая</button>
        <button type="button" role="radio" data-val="dark" class="${profile.theme === 'dark' || !profile.theme ? 'active' : ''}" aria-checked="${profile.theme === 'dark' || !profile.theme ? 'true' : 'false'}">Тёмная</button>
      </div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Язык / Language</h3>
      <div class="segmented" id="lang-segmented" role="radiogroup" aria-label="Language">
        <button type="button" role="radio" data-val="ru" class="${!profile.language || profile.language === 'ru' ? 'active' : ''}" aria-checked="${!profile.language || profile.language === 'ru' ? 'true' : 'false'}">Русский</button>
        <button type="button" role="radio" data-val="en" class="${profile.language === 'en' ? 'active' : ''}" aria-checked="${profile.language === 'en' ? 'true' : 'false'}">English</button>
      </div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Звук</h3>
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="sound-toggle" ${profile.soundOn ? 'checked' : ''} />
        Включить звуковые сигналы
      </label>
    </div>

    <div class="surface" id="install-container" style="display: none;">
      <h3 style="margin-bottom: 16px;">Установка</h3>
      <button id="btn-install" class="btn-primary" type="button" style="width: 100%; margin-bottom: 8px;">Установить Fokus на телефон / ПК</button>
      <div style="font-size: 11px; color: var(--muted); text-align: center;">Для быстрого доступа без браузера</div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Уведомления</h3>
      <button id="btn-notifications" class="btn-secondary" type="button" style="width: 100%;">Разрешить уведомления</button>
      <div style="font-size: 13px; color: var(--muted); margin: 12px 0 8px;">Напоминание в</div>
      <div class="segmented" id="reminder-segmented" role="radiogroup" aria-label="Напоминание">
        <button type="button" role="radio" data-val="8" class="${profile.reminderHour === 8 ? 'active' : ''}" aria-checked="${profile.reminderHour === 8 ? 'true' : 'false'}">08:00</button>
        <button type="button" role="radio" data-val="9" class="${profile.reminderHour === 9 || profile.reminderHour === undefined ? 'active' : ''}" aria-checked="${profile.reminderHour === 9 || profile.reminderHour === undefined ? 'true' : 'false'}">09:00</button>
        <button type="button" role="radio" data-val="12" class="${profile.reminderHour === 12 ? 'active' : ''}" aria-checked="${profile.reminderHour === 12 ? 'true' : 'false'}">12:00</button>
        <button type="button" role="radio" data-val="19" class="${profile.reminderHour === 19 ? 'active' : ''}" aria-checked="${profile.reminderHour === 19 ? 'true' : 'false'}">19:00</button>
        <button type="button" role="radio" data-val="off" class="${profile.reminderHour === null ? 'active' : ''}" aria-checked="${profile.reminderHour === null ? 'true' : 'false'}">Выкл</button>
      </div>
      <div style="font-size: 11px; color: var(--muted); margin-top: 8px; text-align: center;">Локальное напоминание, пока приложение установлено. Без сервера и без рекламы.</div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Перед сессией</h3>
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="lifestyle-toggle" ${profile.skipLifestylePrompt ? 'checked' : ''} />
        Не спрашивать про сон и стресс
      </label>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Данные</h3>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button id="btn-export" class="btn-primary" type="button" style="flex: 1;">Экспорт</button>
        <button id="btn-import" class="btn-secondary" type="button" style="flex: 1;">Импорт</button>
        <label class="sr-only" for="file-input">Файл импорта JSON</label>
        <input type="file" id="file-input" accept=".json,application/json" style="display: none;">
      </div>
      <button id="btn-reset" class="btn-secondary" type="button" style="width: 100%; margin-top: 12px; color: #f44336; border-color: #f44336;">Сбросить профиль</button>
    </div>
    
    <div class="disclaimer">
      Fokus — тренажёр для поддержания когнитивного тонуса. Не является медицинским изделием. Не предназначен для лечения или диагностики.
    </div>
  `;

  const markRadio = (group: NodeListOf<Element>, active: Element) => {
    group.forEach(b => {
      b.classList.toggle('active', b === active);
      b.setAttribute('aria-checked', b === active ? 'true' : 'false');
    });
  };

  const btns = content.querySelectorAll('#duration-segmented button');
  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      markRadio(btns, btn);
      const val = parseInt((btn as HTMLElement).dataset.val || '300', 10);
      const p = storage.getProfile();
      p.sessionLengthSec = val;
      storage.setProfile(p);
    });
  });

  const tbtns = content.querySelectorAll('#theme-segmented button');
  tbtns.forEach(btn => {
    btn.addEventListener('click', () => {
      markRadio(tbtns, btn);
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
      markRadio(gbtns, btn);
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
      markRadio(lbtns, btn);
      const val = (btn as HTMLElement).dataset.val;
      const p = storage.getProfile();
      p.language = val;
      storage.setProfile(p);
      import('../../core/i18n').then(({setLocale}) => {
        setLocale(val as 'ru' | 'en');
        applyDocumentLang(val);
        location.reload();
      });
    });
  });

  import('../../pwa-install').then(({ deferredPrompt }) => {
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
      markRadio(rbtns, btn);
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
      btnNotif.textContent = 'Уведомления включены';
      (btnNotif as HTMLButtonElement).disabled = true;
    }
    btnNotif.addEventListener('click', () => {
      if ('Notification' in window) {
        Notification.requestPermission().then(perm => {
          if (perm === 'granted') {
            btnNotif.textContent = 'Уведомления включены';
            (btnNotif as HTMLButtonElement).disabled = true;
            new Notification('Fokus', { body: 'Отлично! Теперь вы не пропустите тренировку.' });
            import('../../core/reminders').then(m => m.scheduleLocalReminder());
          } else {
            alert('Разрешение не получено.');
          }
        });
      } else {
        alert('Ваш браузер не поддерживает уведомления.');
      }
    });
  }

  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('file-input')?.click();
  });

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
          alert('Данные успешно импортированы');
          location.reload();
        } else {
          alert('Ошибка формата данных');
        }
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (confirm('Вы уверены, что хотите удалить все данные? Это действие необратимо.')) {
      storage.reset();
      location.reload();
    }
  });
}
