import { storage } from '../../core/storage';
import { renderShell } from '../shell';
import { applyTheme } from '../theme';
import {
  buildExportFile,
  formatBytes,
  isWipeConfirm,
  wipeAppCaches,
  type InventoryReport
} from '../../core/privacy';

function privacyPanelHtml(report: InventoryReport): string {
  const rows = report.items.map((item) => {
    const size = item.present ? formatBytes(item.bytes) : 'пусто';
    const tag = item.piiPresent
      ? 'есть персональные данные'
      : item.mayContainPii
        ? 'может содержать имя'
        : 'без имени';
    return `<li class="privacy-row" data-key="${item.key}">
      <div>
        <strong>${item.title}</strong>
        <div class="privacy-key">${item.key} · ${size}</div>
      </div>
      <span class="privacy-tag${item.piiPresent ? ' pii' : ''}">${tag}</span>
    </li>`;
  }).join('');

  const piiBits: string[] = [];
  if (report.pii.name) piiBits.push('имя');
  if (report.pii.lifestyle) piiBits.push('сон/стресс');
  const piiLine = piiBits.length
    ? `Сейчас на устройстве: ${piiBits.join(', ')}.`
    : 'Имени и записей сна/стресса сейчас нет.';

  return `
    <div class="surface" id="privacy-panel" role="region" aria-label="Приватность и данные">
      <h3 style="margin-bottom: 12px;">Приватность и данные</h3>
      <p class="privacy-copy">Fokus хранит прогресс только в браузере на этом устройстве. Нет аккаунта, нет облака, нет рекламных SDK. Дуэль идёт peer-to-peer; сигнальный сервер не получает имя и не пишет тело сообщений.</p>
      <p class="privacy-copy" id="privacy-pii-status">${piiLine} Всего ${formatBytes(report.totalBytes)}.</p>
      <ul class="privacy-inventory" id="data-inventory">
        ${rows}
        <li class="privacy-row" data-key="cache">
          <div>
            <strong>Офлайн-кэш PWA</strong>
            <div class="privacy-key">Cache Storage · оболочка приложения, не профиль</div>
          </div>
          <span class="privacy-tag">без имени</span>
        </li>
      </ul>
      <label class="privacy-check">
        <input type="checkbox" id="export-redact" checked />
        Экспорт без имени и данных о сне/стрессе
      </label>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button type="button" id="btn-export" class="btn-primary" style="flex: 1;">Экспорт</button>
        <button type="button" id="btn-import" class="btn-secondary" style="flex: 1;">Импорт</button>
        <input type="file" id="file-input" accept=".json" style="display: none;" aria-label="Импорт JSON">
      </div>
      <div class="privacy-actions">
        <button type="button" id="btn-clear-name" class="btn-secondary">Убрать имя</button>
        <button type="button" id="btn-clear-lifestyle" class="btn-secondary">Удалить сон и стресс</button>
        <button type="button" id="btn-reset-progress" class="btn-secondary">Сбросить прогресс</button>
        <button type="button" id="btn-reset" class="btn-secondary" style="color: var(--danger);">Удалить все данные</button>
      </div>
      <div id="progress-confirm" class="wipe-box" hidden>
        <p class="privacy-copy">Тема, язык, звук и длительность сессии сохранятся. Сессии, XP, имя, сон/стресс и калибровка будут удалены.</p>
        <button type="button" id="btn-reset-progress-confirm" class="btn-secondary">Да, сбросить прогресс</button>
      </div>
      <div id="wipe-confirm" class="wipe-box" hidden>
        <p class="privacy-copy">Это необратимо: профиль, прогресс, напоминания и офлайн-кэш Fokus. Напишите <strong>УДАЛИТЬ</strong>.</p>
        <label class="privacy-copy" for="wipe-confirm-input">Подтверждение</label>
        <input id="wipe-confirm-input" class="wipe-input" autocomplete="off" aria-describedby="wipe-confirm-hint" />
        <p class="privacy-copy" id="wipe-confirm-hint" role="status"></p>
        <button type="button" id="btn-wipe-confirm" class="btn-danger">Удалить навсегда</button>
      </div>
    </div>
  `;
}

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
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Главная цель</h3>
      <div class="segmented" id="goal-segmented" style="display: flex; flex-wrap: wrap; gap: 8px;">
        <button data-val="balance" class="${!profile.primaryGoal || profile.primaryGoal === 'balance' ? 'active' : ''}">Баланс</button>
        <button data-val="memory" class="${profile.primaryGoal === 'memory' ? 'active' : ''}">Память</button>
        <button data-val="attention" class="${profile.primaryGoal === 'attention' ? 'active' : ''}">Внимание</button>
        <button data-val="speed" class="${profile.primaryGoal === 'speed' ? 'active' : ''}">Скорость</button>
        <button data-val="flexibility" class="${profile.primaryGoal === 'flexibility' ? 'active' : ''}">Гибкость</button>
        <button data-val="logic" class="${profile.primaryGoal === 'logic' ? 'active' : ''}">Логика</button>
      </div>
    </div>
    
    <div class="surface">
      <h3 style="margin-bottom: 16px;">Тема</h3>
      <div class="segmented" id="theme-segmented">
        <button data-val="light" class="${profile.theme === 'light' ? 'active' : ''}">Светлая</button>
        <button data-val="dark" class="${profile.theme === 'dark' || !profile.theme ? 'active' : ''}">Тёмная</button>
      </div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Язык / Language</h3>
      <div class="segmented" id="lang-segmented">
        <button data-val="ru" class="${!profile.language || profile.language === 'ru' ? 'active' : ''}">Русский</button>
        <button data-val="en" class="${profile.language === 'en' ? 'active' : ''}">English</button>
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
      <button id="btn-install" class="btn-primary" style="width: 100%; margin-bottom: 8px;">Установить Fokus на телефон / ПК</button>
      <div style="font-size: 11px; color: var(--muted); text-align: center;">Для быстрого доступа без браузера</div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Уведомления</h3>
      <button id="btn-notifications" class="btn-secondary" style="width: 100%;">Разрешить уведомления</button>
      <div style="font-size: 13px; color: var(--muted); margin: 12px 0 8px;">Напоминание в</div>
      <div class="segmented" id="reminder-segmented">
        <button data-val="8" class="${profile.reminderHour === 8 ? 'active' : ''}">08:00</button>
        <button data-val="9" class="${profile.reminderHour === 9 || profile.reminderHour === undefined ? 'active' : ''}">09:00</button>
        <button data-val="12" class="${profile.reminderHour === 12 ? 'active' : ''}">12:00</button>
        <button data-val="19" class="${profile.reminderHour === 19 ? 'active' : ''}">19:00</button>
        <button data-val="off" class="${profile.reminderHour === null ? 'active' : ''}">Выкл</button>
      </div>
      <div style="font-size: 11px; color: var(--muted); margin-top: 8px; text-align: center;">Локальное напоминание, пока приложение установлено. Без сервера и без рекламы.</div>
    </div>

    <div class="surface">
      <h3 style="margin-bottom: 16px;">Перед сессией</h3>
      <label style="display: flex; align-items: center; gap: 8px;">
        <input type="checkbox" id="lifestyle-toggle" ${profile.skipLifestylePrompt ? 'checked' : ''} />
        Не спрашивать про сон и стресс
      </label>
      <p class="privacy-copy">Ответы про сон и стресс остаются на этом устройстве. Их можно убрать ниже, не сбрасывая прогресс.</p>
    </div>

    ${privacyPanelHtml(storage.inventory())}
    
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
      const val = (btn as HTMLElement).dataset.val;
      const p = storage.getProfile();
      p.language = val;
      storage.setProfile(p);
      import('../../core/i18n').then(({setLocale}) => {
        setLocale(val as 'ru' | 'en');
        location.reload(); // Quick way to apply translations everywhere
      });
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

  document.getElementById('btn-export')?.addEventListener('click', () => {
    const redact = (document.getElementById('export-redact') as HTMLInputElement | null)?.checked !== false;
    const file = buildExportFile(storage.exportJson(), redact);
    const blob = new Blob([file.body], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import')?.addEventListener('click', () => {
    document.getElementById('file-input')?.click();
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
          try { location.reload(); } catch { /* jsdom */ }
        } else {
          alert('Ошибка формата данных');
        }
      }
    };
    reader.readAsText(file);
  });

  const progressBox = document.getElementById('progress-confirm');
  const wipeBox = document.getElementById('wipe-confirm');

  document.getElementById('btn-clear-name')?.addEventListener('click', () => {
    storage.clearPii(['name']);
    renderSettings(container);
  });

  document.getElementById('btn-clear-lifestyle')?.addEventListener('click', () => {
    storage.clearPii(['lifestyle']);
    renderSettings(container);
  });

  document.getElementById('btn-reset-progress')?.addEventListener('click', () => {
    if (wipeBox) wipeBox.hidden = true;
    if (progressBox) progressBox.hidden = false;
  });

  document.getElementById('btn-reset-progress-confirm')?.addEventListener('click', () => {
    storage.resetProgress();
    renderSettings(container);
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (progressBox) progressBox.hidden = true;
    if (wipeBox) wipeBox.hidden = false;
    document.getElementById('wipe-confirm-input')?.focus();
  });

  document.getElementById('btn-wipe-confirm')?.addEventListener('click', () => {
    const typed = (document.getElementById('wipe-confirm-input') as HTMLInputElement | null)?.value || '';
    const hint = document.getElementById('wipe-confirm-hint');
    if (!isWipeConfirm(typed)) {
      if (hint) hint.textContent = 'Введите УДАЛИТЬ заглавными буквами.';
      return;
    }
    storage.reset();
    void wipeAppCaches().finally(() => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      if (/jsdom/i.test(ua)) return;
      try { window.location.reload(); } catch { /* some hosts block navigation */ }
    });
  });
}
