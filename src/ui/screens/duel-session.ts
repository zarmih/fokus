import { P2PConnection } from '../../core/webrtc';
import { getManifest } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { setScreenTitle } from '../a11y';
import { storage } from '../../core/storage';
import { computeFokusIndex } from '../../core/fokus-index';
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
  duelantFromLocal,
  matchQuality,
  openingPoints,
  rematchStatus,
  formatCooldown,
  type Duelant
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

  content.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100vh;">
      <div style="padding: 16px; display: flex; justify-content: space-between; align-items: center; background: var(--surface);">
        <div style="font-weight: 600; font-size: 14px;">Дуэль: ${exManifest.name}</div>
        <div id="duel-timer" style="font-weight: 700; font-variant-numeric: tabular-nums;">--:--</div>
      </div>
      
      <!-- Top: Opponent's progress -->
      <div style="padding: 16px; border-bottom: 1px solid var(--line);">
        <div style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span id="opp-name">Оппонент</span>
          <span id="opp-score">0</span>
        </div>
        <div class="scale-track" style="height: 8px;"><div id="opp-bar" class="scale-fill" style="width: 0%; background: var(--danger);"></div></div>
      </div>

      <!-- Bottom: My progress -->
      <div style="padding: 16px; border-bottom: 1px solid var(--line);">
        <div style="font-size: 12px; color: var(--muted); margin-bottom: 4px; display: flex; justify-content: space-between;">
          <span id="my-name">Вы</span>
          <span id="my-score">0</span>
        </div>
        <div class="scale-track" style="height: 8px;"><div id="my-bar" class="scale-fill" style="width: 0%; background: var(--accent);"></div></div>
      </div>

      <!-- Play Area -->
      <div style="flex: 1; position: relative; overflow: hidden;">
        <div id="ex-container" style="position: absolute; inset: 0;"></div>
        <div id="countdown-overlay" style="position: absolute; inset: 0; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.8); z-index: 10;">
          <div style="text-align: center; color: var(--text);">Загрузка...</div>
        </div>
        <div id="readout-overlay" style="position: absolute; inset: 0; display: none; background: var(--bg); z-index: 20;"></div>
      </div>
    </div>
  `;

  const exContainer = content.querySelector('#ex-container') as HTMLElement;
  const overlay = content.querySelector('#countdown-overlay') as HTMLElement;
  const readoutOverlay = content.querySelector('#readout-overlay') as HTMLElement;
  const oppNameEl = content.querySelector('#opp-name') as HTMLElement;
  const oppScore = content.querySelector('#opp-score') as HTMLElement;
  const oppBar = content.querySelector('#opp-bar') as HTMLElement;
  const myNameEl = content.querySelector('#my-name') as HTMLElement;
  const myScore = content.querySelector('#my-score') as HTMLElement;
  const myBar = content.querySelector('#my-bar') as HTMLElement;
  const timerEl = content.querySelector('#duel-timer') as HTMLElement;

  let myPoints = 0;
  let oppPoints = 0;
  const targetScore = BOUT_TARGET_POINTS;
  let boutId = newBoutId();
  let bout = createBout(['me', 'opp']);

  let cleanup: any;
  let sessionActive = false;
  let startTime = 0;
  const duration = BOUT_DURATION_SEC;

  // Fair start & handicap state
  let oppDuelant: Duelant | null = null;
  const profile = storage.getProfile();
  const domains = storage.getDomains();
  const fi = computeFokusIndex(domains);
  const myDuelant = duelantFromLocal({
    profile,
    fokusIndex: fi.value,
    domains,
    lastBoutAt: null
  });
  myDuelant.id = 'me';
  myNameEl.textContent = myDuelant.alias;

  let iAmReady = false;
  let oppIsReady = false;
  let startHandled = false;
  let iWantRematch = false;
  let oppWantsRematch = false;
  let currentTimerIv: any = null;
  let cdInterval: any = null;

  const updateBars = () => {
    myScore.textContent = myPoints.toString();
    oppScore.textContent = oppPoints.toString();
    myBar.style.width = Math.min(100, (myPoints / targetScore) * 100) + '%';
    oppBar.style.width = Math.min(100, (oppPoints / targetScore) * 100) + '%';
  };

  const persistSummary = (finished: typeof bout) => {
    try {
      const summary = spectatorSummary({
        boutId,
        domain: exManifest.domain,
        durationSec: Math.min(duration, Math.round((Date.now() - startTime) / 1000) || duration),
        state: finished,
        aliases: { me: myDuelant.alias, opp: oppDuelant?.alias || 'Соперник' },
        fairMatch: null
      });
      localStorage.setItem(DUEL_LAST_SUMMARY_KEY, serializeSpectatorSummary(summary));
    } catch {}
  };

  const showReadyScreen = () => {
    iAmReady = false;
    oppIsReady = false;
    startHandled = false;
    
    // Setup handicap if opponent known
    if (oppDuelant) {
      const q = matchQuality(myDuelant, oppDuelant, exManifest.domain);
      const startPts = openingPoints(q, ['me', 'opp']);
      myPoints = startPts['me'] || 0;
      oppPoints = startPts['opp'] || 0;
      bout = createBout(['me', 'opp'], { openingPoints: startPts });
    } else {
      myPoints = 0;
      oppPoints = 0;
      bout = createBout(['me', 'opp']);
    }
    updateBars();
    
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div style="text-align: center; background: var(--surface); padding: 32px; border-radius: 16px;">
        <h2 style="margin-bottom: 24px; color: var(--text);">Схватка готова</h2>
        <button id="btn-ready" class="btn-primary" type="button" style="font-size: 20px; padding: 12px 32px; min-width: 200px;">Я готов</button>
        <div id="ready-status" style="font-size: 14px; margin-top: 16px; color: var(--muted); height: 20px;"></div>
      </div>
    `;
    
    const btnReady = overlay.querySelector('#btn-ready') as HTMLButtonElement;
    const readyStatus = overlay.querySelector('#ready-status') as HTMLElement;
    
    const updateStatus = () => {
      if (!oppDuelant) {
        btnReady.disabled = true;
        readyStatus.textContent = 'Соединение...';
        return;
      }
      btnReady.disabled = iAmReady;
      if (iAmReady && !oppIsReady) readyStatus.textContent = 'Ожидание соперника...';
      else if (!iAmReady && oppIsReady) readyStatus.textContent = 'Соперник готов';
      else if (!iAmReady) readyStatus.textContent = '';
    };
    
    btnReady.addEventListener('click', () => {
      iAmReady = true;
      btnReady.textContent = 'Готов';
      params.p2p.send({ type: 'READY' });
      updateStatus();
      checkBothReady();
    });
    
    updateStatus();
  };

  const endDuel = (didIWin: boolean, reason: 'target' | 'time' | 'draw' = 'target') => {
    sessionActive = false;
    if (cleanup) cleanup();
    if (currentTimerIv) clearInterval(currentTimerIv);

    bout = assignPoints(bout, { me: myPoints, opp: oppPoints });
    if (reason === 'time' || reason === 'draw') {
      bout = closeOnTime({ ...bout, startedAtMs: startTime || Date.now() - duration * 1000 }, Date.now());
    }
    persistSummary(bout);

    const draw = reason === 'draw' || myPoints === oppPoints;
    const title = draw ? 'Ничья' : didIWin ? 'Победа!' : 'Поражение';
    const color = draw ? 'var(--accent)' : didIWin ? 'var(--ok)' : 'var(--danger)';
    const closeFinish = Math.abs(myPoints - oppPoints) === 1;
    
    readoutOverlay.style.display = 'block';
    readoutOverlay.innerHTML = `
      <div style="padding: 24px; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; position: relative;">
        <h2 style="color: ${color}; margin-bottom: 8px; font-size: 32px;">${title}</h2>
        ${closeFinish && !draw ? '<div style="font-size: 14px; color: var(--muted); margin-bottom: 16px;">Близкий финиш!</div>' : '<div style="margin-bottom: 16px;"></div>'}
        <div style="font-size: 48px; font-weight: 800; font-variant-numeric: tabular-nums; margin-bottom: 32px; letter-spacing: 2px;">
          <span style="color: var(--accent);">${myPoints}</span>
          <span style="color: var(--muted); margin: 0 8px;">:</span>
          <span style="color: var(--danger);">${oppPoints}</span>
        </div>
        
        <div id="rematch-zone" style="margin-bottom: 32px; height: 40px;">
          <button id="btn-rematch" class="btn-secondary" type="button" style="display: none; width: 200px; margin: 0 auto;">Реванш</button>
          <div id="rematch-timer" style="color: var(--muted); font-size: 14px;"></div>
        </div>

        <button id="btn-back" class="btn-primary" type="button" style="width: 200px; margin: 0 auto;">Вернуться</button>
      </div>
    `;
    
    readoutOverlay.querySelector('#btn-back')?.addEventListener('click', () => {
      navigateTo('duel');
    });

    const btnRematch = readoutOverlay.querySelector('#btn-rematch') as HTMLButtonElement;
    const timerRematch = readoutOverlay.querySelector('#rematch-timer') as HTMLElement;
    
    const updateCooldown = () => {
      const raw = boutId.replace(/^bout-/, '');
      const ms = parseInt(raw, 36);
      const st = rematchStatus(new Date(ms).toISOString());
      
      if (st.allowed) {
        btnRematch.style.display = 'block';
        timerRematch.style.display = 'none';
        if (cdInterval) clearInterval(cdInterval);
      } else {
        btnRematch.style.display = 'none';
        timerRematch.style.display = 'block';
        timerRematch.textContent = `Реванш возможен через ${formatCooldown(st.remainingMs)}`;
      }
    };
    
    cdInterval = setInterval(updateCooldown, 1000);
    updateCooldown();
    
    btnRematch.addEventListener('click', () => {
      btnRematch.disabled = true;
      btnRematch.textContent = 'Ждём соперника...';
      iWantRematch = true;
      params.p2p.send({ type: 'REMATCH_REQ' });
      checkRematch();
    });
  };

  const checkRematch = () => {
    if (iWantRematch && oppWantsRematch) {
      iWantRematch = false;
      oppWantsRematch = false;
      boutId = newBoutId();
      readoutOverlay.style.display = 'none';
      exContainer.innerHTML = ''; // clear old exercise
      showReadyScreen();
    }
  };

  const checkBothReady = () => {
    if (iAmReady && oppIsReady && !startHandled) {
      startHandled = true;
      if (params.isHost) {
        params.p2p.send({ type: 'START' });
      }
      startCountdown();
    }
  };

  params.p2p.onMessage = (msg: any) => {
    if (msg.type === 'HELLO') {
      oppDuelant = msg.duelant;
      oppDuelant!.id = 'opp';
      oppNameEl.textContent = oppDuelant!.alias;
      if (overlay.style.display !== 'none') showReadyScreen(); // Refresh status and apply handicap
    } else if (msg.type === 'READY') {
      oppIsReady = true;
      if (overlay.style.display !== 'none') {
        const readyStatus = overlay.querySelector('#ready-status');
        if (readyStatus && !iAmReady) readyStatus.textContent = 'Соперник готов';
      }
      checkBothReady();
    } else if (msg.type === 'START') {
      if (!startHandled) {
        startHandled = true;
        startCountdown();
      }
    } else if (msg.type === 'UPDATE') {
      oppPoints = msg.points;
      updateBars();
      if (oppPoints >= targetScore) {
        endDuel(false);
      }
    } else if (msg.type === 'TIMEUP') {
      if (myPoints === oppPoints) endDuel(false, 'draw');
      else endDuel(myPoints > oppPoints, 'time');
    } else if (msg.type === 'REMATCH_REQ') {
      oppWantsRematch = true;
      checkRematch();
    }
  };

  const startCountdown = () => {
    let count = 3;
    overlay.style.display = 'flex';
    overlay.innerHTML = `<div style="font-size: 120px; font-weight: 800; color: var(--accent);">${count}</div>`;
    import('../../core/audio').then(a => a.playTick());
    const iv = setInterval(() => {
      count--;
      if (count > 0) {
        overlay.innerHTML = `<div style="font-size: 120px; font-weight: 800; color: var(--accent);">${count}</div>`;
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
    if (!exRender) return; // Should be loaded by now
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
    currentTimerIv = setInterval(() => {
      if (!sessionActive) {
        clearInterval(currentTimerIv);
        return;
      }
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const rem = Math.max(0, duration - elapsed);
      timerEl.textContent = `00:${rem.toString().padStart(2, '0')}`;
      if (rem === 0) {
        clearInterval(currentTimerIv);
        if (sessionActive) {
          params.p2p.send({ type: 'TIMEUP' });
          if (myPoints === oppPoints) endDuel(false, 'draw');
          else endDuel(myPoints > oppPoints, 'time');
        }
      }
    }, 1000);

    mountExercise();
  };

  // Pre-load exercise then show ready screen
  loadExercise('math-sprint').then((mod) => {
    exRender = mod.render;
    showReadyScreen();
  }).catch(() => {});

  // Send HELLO to exchange Duelant info for handicap
  params.p2p.send({ type: 'HELLO', duelant: myDuelant });
}
