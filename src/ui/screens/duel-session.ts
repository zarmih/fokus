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
  spectatorSummary,
  formatCooldown,
  rematchStatus
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
        <div id="countdown-overlay" style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; background: rgba(0,0,0,0.85); z-index: 10; backdrop-filter: blur(4px);">
          <div style="font-size: 16px; color: var(--muted); margin-bottom: 32px; text-transform: uppercase; letter-spacing: 2px;">Честный старт</div>
          <div style="display: flex; gap: 40px; align-items: center; margin-bottom: 48px;">
            <div style="text-align: center; width: 80px;">
              <div style="font-size: 20px; font-weight: 700; color: var(--accent); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Вы</div>
            </div>
            <div style="font-size: 16px; color: var(--muted); font-style: italic;">vs</div>
            <div style="text-align: center; width: 80px;">
              <div style="font-size: 20px; font-weight: 700; color: var(--danger); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Соперник</div>
            </div>
          </div>
          <div id="countdown-number" style="font-size: 80px; font-weight: 800; color: var(--text); text-shadow: 0 4px 16px rgba(0,0,0,0.5);">...</div>
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

  const guessFinishedAt = (bId: string): string | null => {
    const raw = bId.replace(/^bout-/, '');
    const ms = parseInt(raw, 36);
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return new Date(ms).toISOString();
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
    const oppAlias = 'Соперник';
    const myAlias = storage.getProfile().displayName || storage.getProfile().name || 'Вы';
    
    exContainer.innerHTML = `
      <div style="padding: 24px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; background: var(--bg);">
        <div style="font-size: 14px; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">Итоги схватки</div>
        <h2 style="color: ${color}; font-size: 32px; margin-bottom: 32px;">${title}</h2>
        
        <div style="display: flex; justify-content: center; gap: 24px; margin-bottom: 40px;">
          <div style="background: var(--surface); padding: 16px 24px; border-radius: 12px; border: 2px solid ${didIWin ? 'var(--ok)' : 'transparent'};">
            <div style="font-size: 14px; color: var(--muted); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;">${myAlias}</div>
            <div style="font-size: 36px; font-weight: 800;">${myPoints}</div>
          </div>
          <div style="display: flex; align-items: center; font-size: 24px; color: var(--muted); font-weight: 300;">:</div>
          <div style="background: var(--surface); padding: 16px 24px; border-radius: 12px; border: 2px solid ${!didIWin && !draw ? 'var(--danger)' : 'transparent'};">
            <div style="font-size: 14px; color: var(--muted); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;">${oppAlias}</div>
            <div style="font-size: 36px; font-weight: 800;">${oppPoints}</div>
          </div>
        </div>

        <div id="rematch-container" style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
        </div>
      </div>
    `;
    
    const rc = exContainer.querySelector('#rematch-container') as HTMLElement;
    
    const updateRematch = () => {
      const lastBoutAt = guessFinishedAt(boutId);
      const { allowed, remainingMs } = rematchStatus(lastBoutAt);
      if (allowed) {
        rc.innerHTML = `
          <button id="btn-rematch" class="btn-primary" type="button" style="width: 100%; max-width: 300px;">Новый код для реванша</button>
          <button id="btn-back" class="btn-secondary" type="button" style="width: 100%; max-width: 300px;">Вернуться</button>
        `;
        rc.querySelector('#btn-rematch')?.addEventListener('click', () => navigateTo('duel'));
        rc.querySelector('#btn-back')?.addEventListener('click', () => navigateTo('home'));
      } else {
        rc.innerHTML = `
          <button id="btn-rematch" class="btn-primary" type="button" style="width: 100%; max-width: 300px;" disabled>Реванш · ${formatCooldown(remainingMs)}</button>
          <button id="btn-back" class="btn-secondary" type="button" style="width: 100%; max-width: 300px;">Вернуться</button>
        `;
        rc.querySelector('#btn-back')?.addEventListener('click', () => navigateTo('duel'));
      }
    };
    
    updateRematch();
    const interval = setInterval(() => {
      if (!document.body.contains(rc)) clearInterval(interval);
      else updateRematch();
    }, 1000);
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
    const numEl = overlay.querySelector('#countdown-number') as HTMLElement;
    if (!numEl) return;
    let count = 3;
    numEl.textContent = count.toString();
    import('../../core/audio').then(a => a.playTick());
    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        numEl.textContent = count.toString();
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
