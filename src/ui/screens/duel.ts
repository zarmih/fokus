import { P2PConnection } from '../../core/webrtc';
import { renderShell } from '../shell';

let p2p: P2PConnection | null = null;

export function renderDuel(container: HTMLElement) {
  const content = renderShell(container, { active: 'duel' });
  
  content.innerHTML = `
    <h2>Мультиплеер (Дуэль)</h2>
    <p style="color: var(--muted); margin-bottom: 24px; font-size: 14px;">Соревнуйтесь с друзьями в реальном времени. Игра будет идти до 3 очков.</p>

    <div class="surface" style="margin-bottom: 24px; text-align: center;">
      <h3 style="margin-bottom: 16px;">Создать игру</h3>
      <button id="btn-host" class="btn-primary" style="width: 100%;">Получить код</button>
      <div id="host-code-container" style="margin-top: 16px; display: none;">
        <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">Ваш код для друга:</div>
        <div id="host-code" style="font-size: 32px; font-weight: 800; letter-spacing: 4px; color: var(--accent);">----</div>
      </div>
    </div>

    <div class="surface" style="text-align: center;">
      <h3 style="margin-bottom: 16px;">Присоединиться</h3>
      <input type="text" id="input-code" class="input" placeholder="Введите 4 цифры" style="width: 100%; text-align: center; font-size: 24px; letter-spacing: 4px; margin-bottom: 16px;" maxlength="4" />
      <button id="btn-join" class="btn-secondary" style="width: 100%;">Подключиться</button>
    </div>

    <div id="status-msg" style="margin-top: 24px; text-align: center; font-weight: 600; color: var(--ok); display: none;"></div>
  `;

  const btnHost = content.querySelector('#btn-host') as HTMLButtonElement;
  const btnJoin = content.querySelector('#btn-join') as HTMLButtonElement;
  const inputCode = content.querySelector('#input-code') as HTMLInputElement;
  const hostCodeContainer = content.querySelector('#host-code-container') as HTMLElement;
  const hostCode = content.querySelector('#host-code') as HTMLElement;
  const statusMsg = content.querySelector('#status-msg') as HTMLElement;

  if (p2p) {
    p2p.close();
  }
  p2p = new P2PConnection('ws://localhost:8080'); // Use wss:// in production

  p2p.onCode = (code) => {
    btnHost.style.display = 'none';
    hostCodeContainer.style.display = 'block';
    hostCode.textContent = code;
  };

  p2p.onError = (e) => {
    statusMsg.style.display = 'block';
    statusMsg.style.color = 'var(--danger)';
    statusMsg.textContent = 'Ошибка: ' + e.message;
  };

  p2p.onConnected = () => {
    statusMsg.style.display = 'block';
    statusMsg.style.color = 'var(--ok)';
    statusMsg.textContent = 'Соединение установлено! Запуск матча...';
    setTimeout(() => {
      import('./duel-session').then(m => m.renderDuelSession(container, { p2p: p2p!, isHost: p2p!.isHost }));
    }, 1500);
  };

  btnHost.addEventListener('click', () => {
    btnJoin.disabled = true;
    inputCode.disabled = true;
    p2p!.host().catch(e => p2p!.onError!(e));
  });

  btnJoin.addEventListener('click', () => {
    const code = inputCode.value.trim();
    if (code.length !== 4) {
      alert('Введите 4-значный код');
      return;
    }
    btnHost.disabled = true;
    btnJoin.disabled = true;
    statusMsg.style.display = 'block';
    statusMsg.style.color = 'var(--text)';
    statusMsg.textContent = 'Подключение...';
    p2p!.join(code).catch(e => p2p!.onError!(e));
  });
}
