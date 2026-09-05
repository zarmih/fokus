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
  let timer: any;
  let keyHandler: (e: KeyboardEvent) => void;
  let isFlashing = false;

  const cleanup = () => {
    if (timer) clearInterval(timer);
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

    const flashError = () => {
      isFlashing = true;
      render();
      setTimeout(() => {
        isFlashing = false;
        render();
      }, 150);
    };

    timer = setInterval(() => {
      engine.tick();
      if (engine.fails > prevFails) {
        prevFails = engine.fails;
        flashError();
      } else {
        render();
      }
    }, params.tickMs);

    keyHandler = (e: KeyboardEvent) => {
      if (isTimeUp()) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') engine.jump('U');
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') engine.jump('D');
      else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') engine.jump('L');
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') engine.jump('R');
      else return;
      
      e.preventDefault();
      if (engine.fails > prevFails) {
        prevFails = engine.fails;
        flashError();
      }
      render();
    };

    window.addEventListener('keydown', keyHandler);

    const handleBtn = (dir: Direction) => {
      if (isTimeUp()) return;
      engine.jump(dir);
      if (engine.fails > prevFails) {
        prevFails = engine.fails;
        flashError();
      }
      render();
    };

    const render = () => {
      if (isTimeUp()) {
        cleanup();
        finishBlock();
        return;
      }

      if (engine.status === 'win') {
        cleanup();
        totalRt += Date.now() - roundStart;
        totalFails += engine.fails;
        rounds++;
        setTimeout(startRound, 300);
        return;
      }

      const cs = 80; // cell size
      const width = engine.cols * cs;
      const height = engine.rows * cs;

      const flashStyle = isFlashing ? 'box-shadow: inset 0 0 0 4px var(--danger);' : '';

      const html = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
          <div style="position: relative; width: ${width}px; height: ${height}px; background: var(--surface); border-radius: 12px; margin-bottom: 24px; overflow: hidden; ${flashStyle} transition: box-shadow 100ms;">
            
            <!-- Grid Lines (optional subtle) -->
            ${Array.from({length: engine.cols}).map((_, c) => `
              <div style="position: absolute; left: ${c*cs}px; top: 0; bottom: 0; width: 1px; background: var(--surface-2);"></div>
            `).join('')}
            ${Array.from({length: engine.rows}).map((_, r) => `
              <div style="position: absolute; top: ${r*cs}px; left: 0; right: 0; height: 1px; background: var(--surface-2);"></div>
            `).join('')}

            <!-- Start Platform -->
            <div style="position: absolute; left: 0; top: ${engine.startR*cs}px; width: ${cs}px; height: ${cs}px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; border-radius: 8px;">
              <span style="color: var(--muted); font-size: 12px; font-weight: bold;">СТАРТ</span>
            </div>

            <!-- Goal Platform -->
            <div style="position: absolute; left: ${(engine.cols-1)*cs}px; top: ${engine.goalR*cs}px; width: ${cs}px; height: ${cs}px; border: 4px solid var(--ok); border-radius: 8px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;">
              <span style="color: var(--ok); font-size: 12px; font-weight: bold;">ФИНИШ</span>
            </div>

            <!-- Rotors -->
            ${engine.rotors.map(rot => {
              const cx = rot.c * cs + cs/2;
              const cy = rot.r * cs + cs/2;
              const angle = rot.angle;
              const pathD = rot.spin === 1 ? 'M-12,-12 A 16 16 0 0 1 12,0' : 'M12,-12 A 16 16 0 0 0 -12,0';
              const arrowHead = rot.spin === 1 ? 'M12,0 L6,-6 M12,0 L18,-6' : 'M-12,0 L-6,-6 M-12,0 L-18,-6';
              return `
                <g style="position: absolute; left: ${cx}px; top: ${cy}px; width: 0; height: 0; overflow: visible;">
                  <div style="position: absolute; width: 0; height: 0; transform: rotate(${angle}deg); transition: transform 200ms linear;">
                    <div style="position: absolute; left: -10px; top: -${cs}px; width: 20px; height: ${cs + 10}px; background: var(--accent-2); border-radius: 10px;"></div>
                  </div>
                  <svg style="position: absolute; left: -30px; top: -30px; width: 60px; height: 60px; pointer-events: none;" viewBox="-30 -30 60 60">
                    <circle cx="0" cy="0" r="12" fill="var(--surface-2)" />
                    <circle cx="0" cy="0" r="6" fill="var(--accent-2)" />
                    <path d="${pathD}" stroke="var(--ok)" stroke-width="2" fill="none" stroke-linecap="round"/>
                    <path d="${arrowHead}" stroke="var(--ok)" stroke-width="2" fill="none" stroke-linecap="round"/>
                  </svg>
                </g>
              `;
            }).join('')}

            <!-- Player -->
            <div style="position: absolute; left: ${engine.playerC * cs + cs/2 - 12}px; top: ${engine.playerR * cs + cs/2 - 12}px; width: 24px; height: 24px; background: var(--accent); border-radius: 50%; transition: left 150ms ease-out, top 150ms ease-out;"></div>

          </div>

          <!-- Controls -->
          <div style="display: grid; grid-template-columns: 64px 64px 64px; grid-template-rows: 64px 64px; gap: 8px;">
            <div style="grid-column: 2; grid-row: 1;">
              <button class="btn-secondary btn-U" style="width: 100%; height: 100%; font-size: 24px;">↑</button>
            </div>
            <div style="grid-column: 1; grid-row: 2;">
              <button class="btn-secondary btn-L" style="width: 100%; height: 100%; font-size: 24px;">←</button>
            </div>
            <div style="grid-column: 2; grid-row: 2;">
              <button class="btn-secondary btn-D" style="width: 100%; height: 100%; font-size: 24px;">↓</button>
            </div>
            <div style="grid-column: 3; grid-row: 2;">
              <button class="btn-secondary btn-R" style="width: 100%; height: 100%; font-size: 24px;">→</button>
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;

      container.querySelector('.btn-U')?.addEventListener('click', () => handleBtn('U'));
      container.querySelector('.btn-D')?.addEventListener('click', () => handleBtn('D'));
      container.querySelector('.btn-L')?.addEventListener('click', () => handleBtn('L'));
      container.querySelector('.btn-R')?.addEventListener('click', () => handleBtn('R'));
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
}
