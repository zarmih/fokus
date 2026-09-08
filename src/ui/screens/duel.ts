import { renderShell } from '../shell';
import { P2PConnection } from '../../core/webrtc';
import { navigateTo } from '../router';

export function renderDuel(container: HTMLElement) {
  const content = renderShell(container, { active: 'duel' });
  
  content.innerHTML = `
    <div style="padding: 24px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <h2 style="margin-bottom: 16px; color: var(--accent);">Режим Дуэль (WebRTC)</h2>
      <p style="color: var(--muted); margin-bottom: 32px; max-width: 300px;">Соревнуйтесь с друзьями в реальном времени. Обменяйтесь кодами для соединения!</p>
      
      <div id="duel-setup" class="surface" style="width: 100%; max-width: 300px; padding: 24px; text-align: center;">
        <button id="btn-host" class="btn-primary" style="width: 100%; margin-bottom: 12px;">Создать лобби (Шаг 1)</button>
        <div style="margin-bottom: 12px; font-size: 12px; color: var(--muted);">или вставьте чужой код</div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="input-join" class="input" placeholder="Код приглашения" style="flex: 1;" />
          <button id="btn-join" class="btn-secondary">Войти</button>
        </div>
      </div>
      
      <div id="duel-code-container" class="surface" style="display: none; width: 100%; max-width: 300px; margin-top: 16px; padding: 16px; text-align: center; border: 1px solid var(--accent);">
        <div id="duel-code-label" style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">Скопируйте этот код и отправьте другу:</div>
        <textarea id="duel-code" readonly style="width: 100%; height: 60px; background: transparent; color: var(--text); border: 1px solid var(--border); resize: none; font-family: monospace; font-size: 10px; margin-bottom: 8px;"></textarea>
        
        <div id="duel-answer-section" style="display: none; margin-top: 16px;">
          <div style="font-size: 12px; color: var(--muted); margin-bottom: 8px;">Вставьте ответ от друга сюда:</div>
          <div style="display: flex; gap: 8px;">
            <input type="text" id="input-answer" class="input" placeholder="Код ответа" style="flex: 1;" />
            <button id="btn-start" class="btn-primary">Соединить</button>
          </div>
        </div>
      </div>

      <div id="duel-loading" style="display: none; margin-top: 16px; color: var(--accent);">Установка соединения...</div>
    </div>
  `;

  const btnHost = content.querySelector('#btn-host') as HTMLButtonElement;
  const btnJoin = content.querySelector('#btn-join') as HTMLButtonElement;
  const inputJoin = content.querySelector('#input-join') as HTMLInputElement;
  const codeContainer = content.querySelector('#duel-code-container') as HTMLElement;
  const codeArea = content.querySelector('#duel-code') as HTMLTextAreaElement;
  const answerSection = content.querySelector('#duel-answer-section') as HTMLElement;
  const inputAnswer = content.querySelector('#input-answer') as HTMLInputElement;
  const btnStart = content.querySelector('#btn-start') as HTMLButtonElement;
  const loading = content.querySelector('#duel-loading') as HTMLElement;

  let p2p = new P2PConnection();

  p2p.onConnected = () => {
    loading.style.display = 'none';
    codeContainer.innerHTML = '<div style="color: #4caf50; font-weight: bold; font-size: 1.2rem;">Соединение установлено! 🚀</div><p style="font-size: 12px; margin-top: 8px;">Запуск матча...</p>';
    setTimeout(() => {
      // Pass p2p connection to a special session
      // For now, we will just alert.
      alert('Дуэль начнется в следующем обновлении! (Тестовое соединение успешно)');
    }, 1500);
  };

  btnHost.addEventListener('click', async () => {
    btnHost.disabled = true;
    btnHost.textContent = 'Генерация...';
    const offer = await p2p.createOffer();
    codeContainer.style.display = 'block';
    codeArea.value = offer;
    answerSection.style.display = 'block';
    btnHost.textContent = 'Ожидание ответа...';
    
    codeArea.onclick = () => {
      codeArea.select();
      document.execCommand('copy');
      alert('Код скопирован!');
    };
  });

  btnJoin.addEventListener('click', async () => {
    const offer = inputJoin.value.trim();
    if (!offer) return;
    btnJoin.disabled = true;
    loading.style.display = 'block';
    
    const answer = await p2p.acceptOffer(offer);
    
    codeContainer.style.display = 'block';
    const label = content.querySelector('#duel-code-label') as HTMLElement;
    label.textContent = 'Отправьте этот ответ создателю лобби:';
    codeArea.value = answer;
    
    codeArea.onclick = () => {
      codeArea.select();
      document.execCommand('copy');
      alert('Ответ скопирован!');
    };
  });

  btnStart.addEventListener('click', async () => {
    const answer = inputAnswer.value.trim();
    if (!answer) return;
    btnStart.disabled = true;
    loading.style.display = 'block';
    await p2p.acceptAnswer(answer);
  });
}
