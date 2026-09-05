import { SwingsEngine, Direction } from './engine';
import { getSwingsParams } from './manifest';

export function renderSwings(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: { accuracy: number, avgRtMs: number, rounds: number }) => void,
  isTimeUp: () => boolean
) {
  let rounds = 0;
  let totalFails = 0;
  let totalRt = 0;
  
  let engine: SwingsEngine;
  let afId: number;
  let keyHandler: (e: KeyboardEvent) => void;

  const cleanup = () => {
    if (afId) cancelAnimationFrame(afId);
    if (keyHandler) window.removeEventListener('keydown', keyHandler);
  };

  const startRound = () => {
    cleanup();
    if (isTimeUp()) {
      finishBlock();
      return;
    }

    const params = getSwingsParams(level);
    engine = new SwingsEngine();
    engine.generate(params);
    const roundStart = Date.now();
    let prevFails = engine.fails;
    let lastTime = 0;

    const flashError = () => {
      const board = container.querySelector('.board-container') as HTMLElement;
      if (board) board.style.boxShadow = 'inset 0 0 0 4px var(--danger)';
      setTimeout(() => {
        if (board) board.style.boxShadow = '';
      }, 150);
    };

    const updatePlayerDOM = () => {
      const pEl = container.querySelector('#player-sprite') as HTMLElement;
      if (pEl) {
        const cs = 80;
        pEl.style.left = `${engine.playerC * cs + cs/2 - 14}px`;
        pEl.style.top = `${engine.playerR * cs + cs/2 - 14}px`;
      }
    };

    const loop = (time: number) => {
      if (isTimeUp() || (engine.status as string) === 'win') return;
      if (!lastTime) lastTime = time;
      const dt = time - lastTime;
      lastTime = time;

      engine.tick(dt);

      engine.rotors.forEach((rot, i) => {
        const el = container.querySelector(`#rotor-${i}`) as HTMLElement;
        if (el) el.style.transform = `rotate(${rot.angle}deg)`;
      });

      if (engine.fails > prevFails) {
        prevFails = engine.fails;
        flashError();
        updatePlayerDOM();
      }

      afId = requestAnimationFrame(loop);
    };

    const handleJump = (dir: Direction) => {
      if (isTimeUp() || (engine.status as string) === 'win') return;
      engine.jump(dir);
      updatePlayerDOM();
      
      if (engine.fails > prevFails) {
        prevFails = engine.fails;
        flashError();
      }
      if ((engine.status as string) === 'win') {
        cleanup();
        totalRt += Date.now() - roundStart;
        totalFails += engine.fails;
        rounds++;
        setTimeout(startRound, 300);
      }
    };

    keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') handleJump('U');
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') handleJump('D');
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') handleJump('L');
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleJump('R');
      else return;
      e.preventDefault();
    };

    window.addEventListener('keydown', keyHandler);

    const render = () => {
      const cs = 80;
      const width = engine.cols * cs;
      const height = engine.rows * cs;

      const html = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
          <div class="board-container" style="position: relative; width: ${width}px; height: ${height}px; background: var(--surface); border-radius: 20px; margin-bottom: 32px; overflow: hidden; transition: box-shadow 100ms; box-shadow: var(--shadow-sm); border: 1px solid rgba(255,255,255,0.05);">
            
            ${Array.from({length: engine.cols}).map((_, c) => `
              <div style="position: absolute; left: ${c*cs}px; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.05);"></div>
            `).join('')}
            ${Array.from({length: engine.rows}).map((_, r) => `
              <div style="position: absolute; top: ${r*cs}px; left: 0; right: 0; height: 1px; background: rgba(255,255,255,0.05);"></div>
            `).join('')}

            <!-- Start Platform -->
            <div style="position: absolute; left: 10px; top: ${engine.startR*cs + 10}px; width: ${cs - 20}px; height: ${cs - 20}px; background: rgba(59, 130, 246, 0.1); border: 2px dashed var(--dom-attention); display: flex; align-items: center; justify-content: center; border-radius: 12px;">
              <span style="color: var(--dom-attention); font-size: 10px; font-weight: 800; letter-spacing: 1px;">START</span>
            </div>

            <!-- Goal Platform -->
            <div style="position: absolute; left: ${(engine.cols-1)*cs + 10}px; top: ${engine.goalR*cs + 10}px; width: ${cs - 20}px; height: ${cs - 20}px; background: rgba(16, 185, 129, 0.1); border: 2px solid var(--ok); border-radius: 12px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(16, 185, 129, 0.3);">
              <span style="color: var(--ok); font-size: 10px; font-weight: 800; letter-spacing: 1px;">FINISH</span>
            </div>

            <!-- Rotors -->
            ${engine.rotors.map((rot, i) => {
              const cx = rot.c * cs + cs/2;
              const cy = rot.r * cs + cs/2;
              const angle = rot.angle;
              const pathD = rot.spin === 1 ? 'M-12,-12 A 16 16 0 0 1 12,0' : 'M12,-12 A 16 16 0 0 0 -12,0';
              const arrowHead = rot.spin === 1 ? 'M12,0 L6,-6 M12,0 L18,-6' : 'M-12,0 L-6,-6 M-12,0 L-18,-6';
              return `
                <g style="position: absolute; left: ${cx}px; top: ${cy}px; width: 0; height: 0; overflow: visible;">
                  <div id="rotor-${i}" style="position: absolute; width: 0; height: 0; transform: rotate(${angle}deg);">
                    <div style="position: absolute; left: -8px; top: -${cs - 4}px; width: 16px; height: ${cs + 8}px; background: linear-gradient(180deg, var(--accent-2) 0%, #0d9488 100%); border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.4);"></div>
                  </div>
                  <svg style="position: absolute; left: -30px; top: -30px; width: 60px; height: 60px; pointer-events: none;" viewBox="-30 -30 60 60">
                    <circle cx="0" cy="0" r="14" fill="var(--surface-2)" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
                    <circle cx="0" cy="0" r="6" fill="var(--accent-2)" />
                    <path d="${pathD}" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <path d="${arrowHead}" stroke="rgba(255,255,255,0.3)" stroke-width="2" fill="none" stroke-linecap="round"/>
                  </svg>
                </g>
              `;
            }).join('')}

            <!-- Player -->
            <div id="player-sprite" style="position: absolute; left: ${engine.playerC * cs + cs/2 - 14}px; top: ${engine.playerR * cs + cs/2 - 14}px; width: 28px; height: 28px; background: radial-gradient(circle at 30% 30%, #fbbf24 0%, var(--accent) 100%); border-radius: 50%; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5), inset 0 -2px 4px rgba(0,0,0,0.2); transition: left 150ms ease-out, top 150ms ease-out;"></div>
          </div>

          <!-- Controls -->
          <div style="display: grid; grid-template-columns: 72px 72px 72px; grid-template-rows: 72px 72px; gap: 12px;">
            <div style="grid-column: 2; grid-row: 1;">
              <button class="btn-secondary btn-U" style="width: 100%; height: 100%; margin:0; padding:0; font-size: 24px; border-radius: 16px;">↑</button>
            </div>
            <div style="grid-column: 1; grid-row: 2;">
              <button class="btn-secondary btn-L" style="width: 100%; height: 100%; margin:0; padding:0; font-size: 24px; border-radius: 16px;">←</button>
            </div>
            <div style="grid-column: 2; grid-row: 2;">
              <button class="btn-secondary btn-D" style="width: 100%; height: 100%; margin:0; padding:0; font-size: 24px; border-radius: 16px;">↓</button>
            </div>
            <div style="grid-column: 3; grid-row: 2;">
              <button class="btn-secondary btn-R" style="width: 100%; height: 100%; margin:0; padding:0; font-size: 24px; border-radius: 16px;">→</button>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      container.querySelector('.btn-U')?.addEventListener('click', () => handleJump('U'));
      container.querySelector('.btn-D')?.addEventListener('click', () => handleJump('D'));
      container.querySelector('.btn-L')?.addEventListener('click', () => handleJump('L'));
      container.querySelector('.btn-R')?.addEventListener('click', () => handleJump('R'));
      
      afId = requestAnimationFrame(loop);
    };

    render();
  };

  const finishBlock = () => {
    cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? 1 / (1 + totalFails / rounds) : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();

  // Handle external unmount / stop
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container)) {
      cleanup();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  return cleanup;
}
