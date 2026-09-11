import { storage } from '../../core/storage';
import { loadContinuitySnapshot } from '../../core/continuity';
import { renderShell } from '../shell';
import { applyTheme } from '../theme';
import { ADAPTIVE_SETTINGS_COPY, describeAdaptiveDepth } from '../../core/adaptive-depth';
import { registry } from '../../exercises/registry';
import { transferCardFromStorage } from '../components/transfer-card';
import { navigateTo } from '../router';
import { domainLabel } from '../../core/labels';
import { precisionLabel } from '../../core/calibration';
import { abilityCaption } from '../../core/onboarding';
import { applyDocumentLang } from '../a11y';
import { renderContinuityHint, renderStreakChip } from '../components/habit-continuity';
import { t } from '../../core/i18n';
import { clampVolume } from '../../core/soundscape';
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
      <div id="sync-health-meta" style="font-size: 13px; color: var(--muted); margin-bottom: 12px; line-height: 1.5;"></div>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button type="button" id="btn-export" class="btn-primary" style="flex: 1;">Экспорт</button>
        <button type="button" id="btn-import" class="btn-secondary" style="flex: 1;">Импорт</button>
        <label class="sr-only" for="file-input">Файл импорта JSON</label>
        <input type="file" id="file-input" accept=".json,application/json" style="display: none;">
      </div>
      <div id="import-preview" style="display: none; margin-top: 12px; padding: 12px; border-radius: 12px; background: var(--surface-2); font-size: 13px; line-height: 1.5;"></div>
      <button id="btn-restore-snap" class="btn-secondary" type="button" style="width: 100%; margin-top: 12px; display: none;">Вернуть резервную копию</button>
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
  const snap = loadContinuitySnapshot(storage);
  const depth = describeAdaptiveDepth({
    sessions: storage.getSessions(),
    domains: storage.getDomains(),
    skills: storage.getSkills(),
    states: storage.getExerciseStates(),
    catalog: registry,
    durationSec: profile.sessionLengthSec,
    primaryGoal: profile.primaryGoal
  });
  const settingsChip = depth.chip
    ? `<div class="ability-trend-chip chip dom-${depth.chip.domain}" role="status" aria-label="${depth.chip.aria}">${depth.chip.label}</div>`
    : '';
  
    content.innerHTML = `
      <h2>Настройки</h2>

      <nav aria-label="Быстрые ссылки" style="display: flex; gap: 8px; margin-top: 16px; margin-bottom: 24px; flex-wrap: wrap;">
        <a href="#group-training" class="btn-secondary" style="text-decoration: none; padding: 6px 12px; border-radius: 16px; font-size: 13px;">Тренировка</a>
        <a href="#group-a11y" class="btn-secondary" style="text-decoration: none; padding: 6px 12px; border-radius: 16px; font-size: 13px;">Доступность (a11y)</a>
        <a href="#group-sound" class="btn-secondary" style="text-decoration: none; padding: 6px 12px; border-radius: 16px; font-size: 13px;">Звук</a>
        <a href="#group-system" class="btn-secondary" style="text-decoration: none; padding: 6px 12px; border-radius: 16px; font-size: 13px;">Система</a>
        <a href="#privacy-panel" class="btn-secondary" style="text-decoration: none; padding: 6px 12px; border-radius: 16px; font-size: 13px;">Приватность</a>
      </nav>

      <h3 id="group-training" style="margin: 32px 0 16px; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 8px;">Тренировка и прогресс</h3>

      <div class="surface habit-settings">
        ${renderStreakChip(snap, 'pill')}
        ${renderContinuityHint(snap, 'settings')}
      </div>
      
      <div class="surface" style="margin-top: 16px;">
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
        <h3 style="margin-bottom: 16px;">${ADAPTIVE_SETTINGS_COPY.title}</h3>
        ${settingsChip}
        <p class="adaptive-note">${ADAPTIVE_SETTINGS_COPY.body}</p>
      </div>

      <div class="surface">
        <h3 style="margin-bottom: 16px;">Перед сессией</h3>
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="lifestyle-toggle" ${profile.skipLifestylePrompt ? 'checked' : ''} />
          Не спрашивать про сон и стресс
        </label>
      </div>

      <div class="surface quality-explainer">
        <h3 style="margin-bottom: 16px;">Качество сессии и восстановление</h3>
        <p>Качество ритуала — не IQ и не «балл мозга». Fokus считает, насколько чисто прошёл подход: точность, стабильность времени реакции, уместность сложности, завершённость и обрывы.</p>
        <p>После плотных дней или просадки качества экран «Сегодня» может предложить короче и другую область. Это подсказка нагрузки, не диагноз.</p>
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="recovery-toggle" ${profile.recoveryHints !== false ? 'checked' : ''} />
          Подсказывать восстановление на экране «Сегодня»
        </label>
      </div>

      ${profile.probeSnapshot ? `
      <div class="surface probe-summary">
        <h3 style="margin-bottom: 8px;">Стартовая оценка</h3>
        <p class="muted" style="margin-bottom: 12px;">${abilityCaption(profile.probeSnapshot)}</p>
        ${profile.probeSnapshot.domains.filter((d) => d.probed).map((d) => `
          <div class="delta-row">
            <span>${domainLabel(d.domain)}</span>
            <span>ур. ${d.startLevel.toFixed(1)} · ${precisionLabel(d.precision)}</span>
          </div>
        `).join('')}
        <button id="btn-recalibrate" class="btn-secondary" type="button" style="width: 100%; margin-top: 16px;">Повторить калибровку (~90 сек)</button>
      </div>
      ` : profile.onboarded && !profile.calibrated ? `
      <div class="surface">
        <h3 style="margin-bottom: 8px;">Калибровка</h3>
        <p class="muted" style="margin-bottom: 12px;">Короткий зонд ещё не пройден. Это не IQ — только стартовая сложность.</p>
        <button id="btn-recalibrate" class="btn-primary" type="button" style="width: 100%;">Пройти калибровку</button>
      </div>
      ` : ''}

      <h3 id="group-a11y" style="margin: 32px 0 16px; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 8px;">Интерфейс и доступность (a11y)</h3>

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

      <h3 id="group-sound" style="margin: 32px 0 16px; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 8px;">Звук и отклик</h3>

      <div class="surface">
        <h3 style="margin-bottom: 16px;">Звук</h3>
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" id="sound-toggle" ${profile.soundOn ? 'checked' : ''} />
          ${t('settings.sound')}
        </label>
        <label class="sound-volume-row" for="sound-volume">
          <span>${t('settings.volume')}</span>
          <input type="range" id="sound-volume" min="0" max="100" step="1" value="${Math.round(clampVolume(profile.soundVolume) * 100)}" ${profile.soundOn ? '' : 'disabled'} />
          <span id="sound-volume-value">${Math.round(clampVolume(profile.soundVolume) * 100)}%</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; margin-top: 12px;">
          <input type="checkbox" id="haptics-toggle" ${profile.hapticsOn !== false ? 'checked' : ''} />
          ${t('settings.haptics')}
        </label>
      </div>

      <h3 id="group-system" style="margin: 32px 0 16px; color: var(--text); border-bottom: 1px solid var(--border); padding-bottom: 8px;">Уведомления и система</h3>

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

      <div class="surface" id="install-container" style="display: none;">
        <h3 style="margin-bottom: 16px;">Установка</h3>
        <button id="btn-install" class="btn-primary" type="button" style="width: 100%; margin-bottom: 8px;">Установить Fokus на телефон / ПК</button>
        <div style="font-size: 11px; color: var(--muted); text-align: center;">Для быстрого доступа без браузера</div>
      </div>

      <div style="margin-top: 32px;">
        ${privacyPanelHtml(storage.inventory())}
      </div>
      
      ${transferCardFromStorage({ prefer: 'guide' })}

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

  const volumeInput = document.getElementById('sound-volume') as HTMLInputElement | null;
  const volumeValue = document.getElementById('sound-volume-value');
  document.getElementById('sound-toggle')?.addEventListener('change', (e) => {
    const p = storage.getProfile();
    p.soundOn = (e.target as HTMLInputElement).checked;
    storage.setProfile(p);
    if (volumeInput) volumeInput.disabled = !p.soundOn;
    import('../../core/audio').then((a) => {
      if (p.soundOn) a.unlockAudio();
      a.applyMasterGain();
    }).catch(() => {});
  });
  volumeInput?.addEventListener('input', (e) => {
    const raw = Number((e.target as HTMLInputElement).value);
    const volume = clampVolume((Number.isFinite(raw) ? raw : 100) / 100);
    const p = storage.getProfile();
    p.soundVolume = volume;
    storage.setProfile(p);
    if (volumeValue) volumeValue.textContent = `${Math.round(volume * 100)}%`;
    import('../../core/audio').then((a) => a.applyMasterGain()).catch(() => {});
  });
  document.getElementById('haptics-toggle')?.addEventListener('change', (e) => {
    const p = storage.getProfile();
    p.hapticsOn = (e.target as HTMLInputElement).checked;
    storage.setProfile(p);
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

  document.getElementById('recovery-toggle')?.addEventListener('change', (e) => {
    const p = storage.getProfile();
    p.recoveryHints = (e.target as HTMLInputElement).checked;
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

  const healthEl = document.getElementById('sync-health-meta');
  const previewEl = document.getElementById('import-preview');
  const restoreBtn = document.getElementById('btn-restore-snap') as HTMLButtonElement | null;
  let pendingImport: string | null = null;

  const errorLabel: Record<string, string> = {
    invalid_json: 'Файл не является JSON.',
    not_fokus: 'Это не резервная копия Fokus.',
    checksum: 'Контрольная сумма не совпала — файл повреждён или изменён.',
    future_format: 'Файл из более новой версии Fokus.',
    future_schema: 'Схема данных новее, чем это приложение.',
    write_failed: 'Не удалось записать данные (возможно, закончилось место).'
  };

  const paintHealth = () => {
    const h = storage.getHealth();
    if (healthEl) {
      if (h.empty) {
        healthEl.textContent = `Локально, без сервера. Схема ${h.schemaVersion}. Пока нет сохранённого профиля.`;
      } else {
        const shortId = h.deviceId ? h.deviceId.slice(0, 14) : '—';
        const kb = Math.max(1, Math.round(h.bytes / 1024));
        healthEl.textContent = `Офлайн-копия на этом устройстве. Схема ${h.schemaVersion}, ревизия ${h.rev}, устройство ${shortId}, ~${kb} КБ.`;
      }
    }
    if (restoreBtn) restoreBtn.style.display = h.hasSnapshot ? 'block' : 'none';
  };
  paintHealth();

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

  const showPreview = (json: string) => {
    if (!previewEl) return;
    const inspected = storage.inspectImport(json);
    if (!inspected.ok) {
      pendingImport = null;
      previewEl.style.display = 'block';
      previewEl.innerHTML = `<div style="color: var(--danger);">${errorLabel[inspected.error] || 'Ошибка формата данных'}</div>`;
      return;
    }
    pendingImport = json;
    const p = inspected.preview;
    const warn = p.legacy ? 'Старый файл без конверта — импорт всё равно сработает.' : '';
    const safeName = p.profileName.replace(/[&<>"']/g, (ch) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch
    ));
    previewEl.style.display = 'block';
    previewEl.innerHTML = `
      <div><strong>${safeName}</strong> · XP ${p.xp} · схема ${p.schemaVersion}${p.legacy ? ' · legacy' : ''}</div>
      <div style="color: var(--muted); margin-top: 6px;">Сессий: ${p.sessions} (новых ${p.sessionsNew}) · дней: ${p.days} (новых ${p.daysNew})</div>
      ${warn ? `<div style="color: var(--muted); margin-top: 6px;">${warn}</div>` : ''}
      <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
        <button id="btn-import-merge" class="btn-primary" style="flex: 1; margin-bottom: 0;">Объединить</button>
        <button id="btn-import-replace" class="btn-secondary" style="flex: 1; margin-bottom: 0;">Заменить</button>
      </div>
    `;
    const runImport = (mode: 'merge' | 'replace') => {
      if (!pendingImport) return;
      const confirmMsg = mode === 'replace'
        ? 'Заменить все локальные данные файлом? Текущее состояние сохранится как резервная копия.'
        : 'Объединить данные с этим устройством? Совпадения не дублируются, XP берётся максимум.';
      if (!confirm(confirmMsg)) return;
      const result = storage.importBackup(pendingImport, mode);
      if (result.ok) {
        alert(mode === 'merge' ? 'Данные объединены' : 'Данные заменены');
        location.reload();
      } else {
        previewEl.innerHTML = `<div style="color: var(--danger);">${errorLabel[result.error || ''] || 'Ошибка импорта'}</div>`;
      }
    };
    document.getElementById('btn-import-merge')?.addEventListener('click', () => runImport('merge'));
    document.getElementById('btn-import-replace')?.addEventListener('click', () => runImport('replace'));
  };

  document.getElementById('file-input')?.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (re) => {
      if (typeof re.target?.result === 'string') showPreview(re.target.result);
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = '';
  });

  restoreBtn?.addEventListener('click', () => {
    if (!confirm('Вернуть состояние, которое было до последнего импорта?')) return;
    if (storage.restoreSnapshot()) {
      location.reload();
    } else {
      alert('Резервной копии нет.');
    }
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

  document.getElementById('btn-recalibrate')?.addEventListener('click', () => {
    const p = storage.getProfile();
    p.calibrated = false;
    p.probeSnapshot = undefined;
    storage.setProfile(p);
    navigateTo('today');
  });
}
