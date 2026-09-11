import { P2PConnection } from '../../core/webrtc';
import { getManifest } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { setScreenTitle } from '../a11y';
import { storage } from '../../core/storage';
import {
  BOUT_DURATION_SEC,
  BOUT_TARGET_POINTS,
  DUEL_LAST_SUMMARY_KEY,
  POINT_ACCURACY_THRESHOLD,
  awardsPoint,
  closeOnTime,
  createBout,
  newBoutId,
  serializeSpectatorSummary,
  assignPoints,
  spectatorSummary
} from '../../core/duelIntel';

export function renderDuelSession(container: HTMLElement, params: { p2p: P2PConnection, isHost: boolean }) {
  const content = renderShell(container, { active: 'duel', hideNav: true });
  setScreenTitle('Дуэль');

  const exManifest = getManifest('math-sprint');
  if (!exManifest) {
    content.innerHTML = '<div style="padding: 24px; text-align: center;">Тренажер не найден</div>';
    return;
  }
  let exRender: ((el: HTMLElement, level: number, onEnd: (r: {accuracy: number, avgRtMs: number, rounds: number}) => void, isTimeUp: () => boolean) => void | (() => void)) | undefined;
  loadExercise('math-sprint').then((mod) => { exRender = mod.render; }).catch(() => {});

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100vh;">
      <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center; background: var(--surface);">
        <div style="font-weight: 600; font-size: 14px;">Дуэль: ${exManifest.name}</div>
        <div id="duel-timer" style="font-weight: 700; font-variant-numeric: tabular-nums;">--:--</div>
      </div>
      
      <!-- Top: Opponent's progress -->
      <div style="padding: 16px; border-bottom: 1px solid var(--line);">
        <div style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Оппонент</span>
          <span id="opp-score">0</span>
        </div>
        <div class="scale-track" style="height: 8px;"><div id="opp-bar" class="scale-fill" style="width: 0%; background: var(--danger);"></div></div>
      </div>

      <!-- Bottom: My progress -->
      <div style="padding: 16px; border-bottom: 1px solid var(--line);">
        <div style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span>Вы</span>
          <span id="my-score">0</span>
        </div>
        <div class="scale-track" style="height: 8px;"><div id="my-bar" class="scale-fill" style="width: 0%; background: var(--accent);"></div></div>
      </div>

      <!-- Exercise Area -->
      <div id="ex-container" style="flex: 1; position: relative; overflow: hidden;">
        <div id="countdown-overlay" style="position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.8); z-index: 10; font-size: 64px; font-weight: 800; color: var(--accent);">
          Ожидание...
        </div>
      </div>
    </div>
  `;

  const exContainer = content.querySelector('#ex-container') as HTMLElement;
  const overlay = content.querySelector('#countdown-overlay') as HTMLElement;
  const oppScore = content.querySelector('#opp-score') as HTMLElement;
  const oppBar = content.querySelector('#opp-bar') as HTMLElement;
  const myScore = content.querySelector('#my-score') as HTMLElement;
  const myBar = content.querySelector('#my-bar') as HTMLElement;
  const timerEl = content.querySelector('#duel-timer') as HTMLElement;

  let myPoints = 0;
  let oppPoints = 0;
  const targetScore = BOUT_TARGET_POINTS;
  const boutId = newBoutId();
  let bout = createBout(['me', 'opp']);

  let cleanup: any;
  let sessionActive = false;
  let startTime = 0;
  const duration = BOUT_DURATION_SEC;

  const updateBars = () => {
    myScore.textContent = myPoints.toString();
    oppScore.textContent = oppPoints.toString();
    myBar.style.width = Math.min(100, (myPoints / targetScore) * 100) + '%';
    oppBar.style.width = Math.min(100, (oppPoints / targetScore) * 100) + '%';
  };

  const persistSummary = (finished: typeof bout) => {
    try {
      const alias = storage.getProfile().displayName || storage.getProfile().name || 'Вы';
      const summary = spectatorSummary({
        boutId,
        domain: exManifest.domain,
        durationSec: Math.min(duration, Math.round((Date.now() - startTime) / 1000) || duration),
        state: finished,
        aliases: { me: alias, opp: 'Соперник' },
        fairMatch: null
      });
      localStorage.setItem(DUEL_LAST_SUMMARY_KEY, serializeSpectatorSummary(summary));
    } catch {
      /* private mode / quota */
    }
  };

  const endDuel = (didIWin: boolean, reason: 'target' | 'time' | 'draw' = 'target') => {
    sessionActive = false;
    if (cleanup) cleanup();

    bout = assignPoints(bout, { me: myPoints, opp: oppPoints });
    if (reason === 'time' || reason === 'draw') {
      bout = closeOnTime({ ...bout, startedAtMs: startTime || Date.now() - duration * 1000 }, Date.now());
    }
    persistSummary(bout);

    const draw = reason === 'draw' || myPoints === oppPoints;
    const title = draw ? 'Ничья' : didIWin ? 'Вы победили!' : 'Вы проиграли!';
    const color = draw ? 'var(--accent)' : didIWin ? 'var(--ok)' : 'var(--danger)';
    
    exContainer.innerHTML = `
      <div style="padding: 24px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center;">
        <h2 style="color: ${color}; margin-bottom: 16px;">${title}</h2>
        <div style="font-size: 24px; font-weight: 700; margin-bottom: 32px;">Счет: ${myPoints} - ${oppPoints}</div>
        <button id="btn-back" class="btn-primary" type="button">Вернуться</button>
      </div>
    `;
    
    exContainer.querySelector('#btn-back')?.addEventListener('click', () => {
      navigateTo('duel');
    });
  };

  params.p2p.onMessage = (msg: any) => {
    if (msg.type === 'START') {
      startCountdown();
    } else if (msg.type === 'UPDATE') {
      oppPoints = msg.points;
      updateBars();
      if (oppPoints >= targetScore) {
        endDuel(false);
      }
    } else if (msg.type === 'TIMEUP') {
      if (myPoints === oppPoints) endDuel(false, 'draw');
      else endDuel(myPoints > oppPoints, 'time');
    }
  };

  const startCountdown = () => {
    let count = 3;
    overlay.textContent = count.toString();
    import('../../core/audio').then(a => a.playTick());
    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        overlay.textContent = count.toString();
        import('../../core/audio').then(a => a.playTick());
      } else {
        clearInterval(iv);
        overlay.style.display = 'none';
        import('../../core/audio').then(a => a.playRitual());
        startGame();
      }
    }, 1000);
  };

  const mountExercise = () => {
    if (!exRender) {
      loadExercise('math-sprint').then((mod) => {
        exRender = mod.render;
        mountExercise();
      });
      return;
    }
    cleanup = exRender(
      exContainer,
      2, // level
      (res) => {
        if (!sessionActive) return;
        if (awardsPoint(res.accuracy, POINT_ACCURACY_THRESHOLD)) {
          myPoints++;
          updateBars();
          params.p2p.send({ type: 'UPDATE', points: myPoints });
          
          if (myPoints >= targetScore) {
            endDuel(true);
            return;
          }
        }
        
        // We restart the exercise immediately for duel mode
        if (sessionActive) {
          if (cleanup) cleanup();
          mountExercise();
        }
      },
      () => !sessionActive || (Date.now() - startTime) / 1000 >= duration
    );
  };

  const startGame = () => {
    sessionActive = true;
    startTime = Date.now();
    
    // Timer loop
    const timerIv = setInterval(() => {
      if (!sessionActive) {
        clearInterval(timerIv);
        return;
      }
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const rem = Math.max(0, duration - elapsed);
      timerEl.textContent = `00:${rem.toString().padStart(2, '0')}`;
      if (rem === 0) {
        clearInterval(timerIv);
        if (sessionActive) {
          params.p2p.send({ type: 'TIMEUP' });
          if (myPoints === oppPoints) endDuel(false, 'draw');
          else endDuel(myPoints > oppPoints, 'time');
        }
      }
    }, 1000);

    mountExercise();
  };

  if (params.isHost) {
    // Host waits 2 seconds to make sure channel is fully stable, then sends start
    setTimeout(() => {
      params.p2p.send({ type: 'START' });
      startCountdown();
    }, 2000);
  }
}
