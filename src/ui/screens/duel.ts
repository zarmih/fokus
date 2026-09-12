import { P2PConnection } from '../../core/webrtc';
import { renderShell } from '../shell';
import { storage } from '../../core/storage';
import { computeFokusIndex } from '../../core/fokus-index';
import { domainLabel } from '../../core/labels';
import { navigateTo } from '../router';
import {
  BOUT_DURATION_SEC,
  BOUT_TARGET_POINTS,
  DUEL_LAST_SUMMARY_KEY,
  FAIR_INDEX_GAP,
  POINT_ACCURACY_THRESHOLD,
  REMATCH_COOLDOWN_MS,
  describeMatch,
  duelantFromLocal,
  formatCooldown,
  matchQuality,
  parseSpectatorSummary,
  rematchStatus,
  type Duelant
} from '../../core/duelIntel';

let p2p: P2PConnection | null = null;

export function renderDuel(container: HTMLElement) {
  const content = renderShell(container, { active: 'duel' });
  const profile = storage.getProfile();
  const domains = storage.getDomains();
  const fi = computeFokusIndex(domains);

  let lastSummary = null as ReturnType<typeof parseSpectatorSummary>;
  try {
    lastSummary = parseSpectatorSummary(localStorage.getItem(DUEL_LAST_SUMMARY_KEY));
  } catch {
    lastSummary = null;
  }

  const lastBoutAt = lastSummary ? guessFinishedAt(lastSummary.boutId) : null;
  const self = duelantFromLocal({
    profile,
    fokusIndex: fi.value,
    domains,
    lastBoutAt
  });
  const cooldown = rematchStatus(lastBoutAt);
  const ticketDomain = strongestReadyDomain(self);
  const mirror = { ...self, id: 'preview', alias: 'Соперник', fokusIndex: self.fokusIndex };
  const preview = matchQuality(self, mirror, ticketDomain);

  const lastHtml = lastSummary ? `
    <div class="surface spectator-card" data-bout="${lastSummary.boutId}">
      <div class="fi-kicker">Последняя схватка · зрителям безопасно</div>
      <div class="spectator-score">${lastSummary.fighters[0].points} : ${lastSummary.fighters[1].points}</div>
      <p class="spectator-meta">${lastSummary.fighters[0].alias} · ${lastSummary.fighters[1].alias}</p>
      <p class="spectator-meta">${domainLabel(lastSummary.domain)} · ${
        lastSummary.outcome === 'draw'
          ? 'ничья'
          : lastSummary.winnerAlias
            ? `победа: ${lastSummary.winnerAlias}`
            : 'результат'
      }${lastSummary.closeFinish ? ' · близкий финиш' : ''}</p>
    </div>
  ` : `
    <p class="duel-empty">Ещё не было схваток. Итог появится здесь в виде короткой карточки без времени реакции и без аккаунтов.</p>
  `;

  content.innerHTML = `
    <div class="today-head">
      <h2>Дуэль</h2>
      <p class="today-date">Схватка по Fokus Index, не турнир с лидербордом.</p>
    </div>
    <div class="segmented" style="margin-bottom: 24px;" role="tablist">
      <button type="button" role="tab" id="nav-program" aria-selected="false">План</button>
      <button type="button" role="tab" id="nav-trainers" aria-selected="false">Упражнения</button>
      <button type="button" role="tab" id="nav-duel" aria-selected="true" class="active">Дуэли</button>
    </div>

    <div class="surface duel-intel">
      <div class="fi-kicker">Билет подбора</div>
      <div class="duel-ticket">${fi.coverage > 0 ? fi.value : '—'}</div>
      <p class="fi-meta">${fi.coverage > 0
        ? `${domainLabel(ticketDomain)} · честный коридор ±${FAIR_INDEX_GAP}`
        : 'После калибровки Fokus Index станет билетом подбора.'}</p>
      <p class="duel-fairness">${fi.coverage > 0 ? describeMatch(preview) : 'Пока нет соперников в вашей зоне — это не пустой лидерборд, а честный empty-state.'}</p>
      <ul class="duel-rules">
        <li>До ${BOUT_TARGET_POINTS} очков · ${BOUT_DURATION_SEC} с</li>
        <li>Очко за точность ≥ ${Math.round(POINT_ACCURACY_THRESHOLD * 100)}%</li>
        <li>Ничья при равном счёте — не победа хоста</li>
        <li>Реванш через ${Math.round(REMATCH_COOLDOWN_MS / 60000)} мин</li>
      </ul>
      ${cooldown.allowed
        ? ''
        : `<p class="cooldown-note">Пауза перед реваншем · ${formatCooldown(cooldown.remainingMs)}</p>`}
    </div>

    ${lastHtml}

    <div class="surface" style="margin-bottom: 24px; text-align: center;">
      <h3 style="margin-bottom: 8px;">Комната с другом</h3>
      <p style="color: var(--muted); margin-bottom: 16px; font-size: 13px; line-height: 1.4;">Код — приглашение, не матчмейкинг. Подбор по индексу появится в Фазе 4, без живого видео.</p>
      <button id="btn-host" class="btn-primary" type="button" style="width: 100%;">Получить код</button>
      <div id="host-code-container" style="margin-top: 16px; display: none;">
        <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">Ваш код для друга:</div>
        <div id="host-code" style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: var(--accent);">----</div>
      </div>
    </div>

    <div class="surface" style="text-align: center;">
      <h3 style="margin-bottom: 16px;">Присоединиться</h3>
      <label class="sr-only" for="input-code">Код комнаты</label>
      <input type="text" id="input-code" class="input" placeholder="Введите 4 цифры" inputmode="numeric" autocomplete="one-time-code" aria-label="Код комнаты" style="width: 100%; text-align: center; font-size: 24px; letter-spacing: 4px; margin-bottom: 16px;" maxlength="4" />
      <button id="btn-join" class="btn-secondary" type="button" style="width: 100%;">Подключиться</button>
    </div>

    <div id="status-msg" style="margin-top: 24px; text-align: center; font-weight: 600; color: var(--ok); display: none;"></div>
  `;

  const btnHost = content.querySelector('#btn-host') as HTMLButtonElement;
  const btnJoin = content.querySelector('#btn-join') as HTMLButtonElement;
  const inputCode = content.querySelector('#input-code') as HTMLInputElement;
  const hostCodeContainer = content.querySelector('#host-code-container') as HTMLElement;
  const hostCode = content.querySelector('#host-code') as HTMLElement;
  const statusMsg = content.querySelector('#status-msg') as HTMLElement;

  const showError = (e: Error) => {
    statusMsg.style.display = 'block';
    statusMsg.style.color = 'var(--danger)';
    statusMsg.textContent = 'Ошибка: ' + e.message;
  };

  const wireP2p = () => {
    if (p2p) p2p.close();
    p2p = new P2PConnection('ws://localhost:8080');
    p2p.onCode = (code) => {
      btnHost.style.display = 'none';
      hostCodeContainer.style.display = 'block';
      hostCode.textContent = code;
    };
    p2p.onError = showError;
    p2p.onConnected = () => {
      statusMsg.style.display = 'block';
      statusMsg.style.color = 'var(--ok)';
      statusMsg.textContent = 'Соединение установлено! Запуск матча...';
      setTimeout(() => {
        import('./duel-session').then(m => m.renderDuelSession(container, { p2p: p2p!, isHost: p2p!.isHost }));
      }, 1500);
    };
    return p2p;
  };

  btnHost.addEventListener('click', () => {
    if (!cooldown.allowed) {
      statusMsg.style.display = 'block';
      statusMsg.style.color = 'var(--text)';
      statusMsg.textContent = `Реванш чуть позже · ${formatCooldown(cooldown.remainingMs)}`;
      return;
    }
    btnJoin.disabled = true;
    inputCode.disabled = true;
    wireP2p().host().catch((e) => showError(e));
  });

  btnJoin.addEventListener('click', () => {
    const code = inputCode.value.trim();
    if (code.length !== 4) {
      alert('Введите 4-значный код');
      return;
    }
    if (!cooldown.allowed) {
      statusMsg.style.display = 'block';
      statusMsg.style.color = 'var(--text)';
      statusMsg.textContent = `Реванш чуть позже · ${formatCooldown(cooldown.remainingMs)}`;
      return;
    }
    btnHost.disabled = true;
    btnJoin.disabled = true;
    statusMsg.style.display = 'block';
    statusMsg.style.color = 'var(--text)';
    statusMsg.textContent = 'Подключение...';
    wireP2p().join(code).catch((e) => showError(e));
  });

  content.querySelector('#nav-program')?.addEventListener('click', () => navigateTo('program'));
  content.querySelector('#nav-trainers')?.addEventListener('click', () => navigateTo('trainers'));
}

function strongestReadyDomain(self: Duelant): string {
  const entries = Object.entries(self.domainAbility);
  if (entries.length === 0) return 'attention';
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

function guessFinishedAt(boutId: string): string | null {
  const raw = boutId.replace(/^bout-/, '');
  const ms = parseInt(raw, 36);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}
