import { PulleyEngine } from './engine';
import { getPulleyParams } from './manifest';

export function renderPulley(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: { accuracy: number, avgRtMs: number, rounds: number }) => void,
  isTimeUp: () => boolean
) {
  let rounds = 0;
  let totalAcc = 0;
  let totalRt = 0;
  
  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }

    const params = getPulleyParams(level);
    const engine = new PulleyEngine();
    engine.generate(params);
    const roundStart = Date.now();
    let errors = 0;

    const render = () => {
      if (isTimeUp()) {
        finishBlock();
        return;
      }
      if (engine.status === 'win') {
        const rt = Date.now() - roundStart;
        totalAcc += Math.max(0, 1 - errors / Math.max(1, params.doors));
        totalRt += rt;
        rounds++;
        setTimeout(startRound, 800);
        return;
      }

      const currentGate = engine.gates[engine.playerAt];
      const hookSum = currentGate ? currentGate.hook.reduce((a,b)=>a+b, 0) : 0;
      const canWalk = currentGate && hookSum === currentGate.need;

      const html = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
          <div style="display: flex; gap: 20px; font-size: 20px; margin-bottom: 24px; color: var(--text);">
            <div>Нужно: <b style="color: var(--accent);">${currentGate ? currentGate.need : 0}</b></div>
            <div>На крюке: <b style="color: var(--accent-2);">${hookSum}</b></div>
          </div>
          
          <div style="position: relative; width: 320px; height: 200px; background: var(--surface); border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <!-- Player -->
            <div style="position: absolute; bottom: 20px; left: 40px; transition: transform 0.5s;">
              <svg width="40" height="60" viewBox="0 0 40 60">
                <circle cx="20" cy="15" r="10" fill="var(--accent)"/>
                <rect x="15" y="25" width="10" height="25" rx="4" fill="var(--accent)"/>
                <rect x="10" y="50" width="8" height="10" rx="4" fill="var(--accent)"/>
                <rect x="22" y="50" width="8" height="10" rx="4" fill="var(--accent)"/>
              </svg>
            </div>

            <!-- Gates -->
            ${engine.gates.map((g, i) => {
              const isActive = i === engine.playerAt;
              const isPast = i < engine.playerAt;
              const doorColor = isPast ? 'var(--ok)' : 'var(--danger)';
              const doorY = isPast ? -60 : 0;
              const xPos = 120 + i * 80;
              
              if (isActive) {
                return `
                  <!-- Pulley and Rope -->
                  <div style="position: absolute; top: 10px; left: ${xPos + 10}px;">
                    <svg width="80" height="100" viewBox="0 0 80 100">
                      <circle cx="40" cy="10" r="8" fill="var(--accent-2)"/>
                      <line x1="32" y1="10" x2="32" y2="90" stroke="var(--accent-2)" stroke-width="2"/>
                      <line x1="48" y1="10" x2="48" y2="40" stroke="var(--accent-2)" stroke-width="2"/>
                      <path d="M40,40 Q48,45 56,40" stroke="var(--accent-2)" stroke-width="2" fill="none"/>
                    </svg>
                  </div>
                  <!-- Door -->
                  <div style="position: absolute; bottom: 20px; left: ${xPos + 50}px; width: 20px; height: 60px; background: ${doorColor}; transform: translateY(${doorY}px); transition: transform 0.5s, background 0.5s; border-radius: 4px;"></div>
                `;
              } else if (isPast) {
                return `
                  <div style="position: absolute; bottom: 20px; left: ${xPos + 50}px; width: 20px; height: 60px; background: ${doorColor}; transform: translateY(${doorY}px); border-radius: 4px;"></div>
                `;
              }
              return '';
            }).join('')}

            <!-- Floor Line -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 20px; background: var(--surface-2);"></div>
          </div>

          <!-- Weights on Hook -->
          <div style="min-height: 50px; display: flex; gap: 8px; margin-bottom: 24px;">
            ${(currentGate ? currentGate.hook : []).map((w, idx) => `
              <div class="weight-hook" data-idx="${idx}" style="width: 40px; height: 40px; background: var(--dom-speed); color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;">
                ${w}
              </div>
            `).join('')}
          </div>

          <!-- Weights on Floor -->
          <div style="min-height: 50px; display: flex; gap: 8px; margin-bottom: 32px;">
            ${engine.floor.map((w, idx) => `
              <div class="weight-floor" data-idx="${idx}" style="width: 40px; height: 40px; background: var(--dom-logic); color: #1a2332; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;">
                ${w}
              </div>
            `).join('')}
          </div>

          <button id="btn-walk" class="btn-primary" style="padding: 16px 48px; font-size: 20px; opacity: ${canWalk ? 1 : 0.5}; pointer-events: ${canWalk ? 'auto' : 'none'};">Идти</button>
        </div>
      `;

      container.innerHTML = html;

      container.querySelectorAll('.weight-floor').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp()) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.takeFloor(idx);
          render();
        });
      });

      container.querySelectorAll('.weight-hook').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp()) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.dropHook(idx);
          render();
        });
      });

      document.getElementById('btn-walk')?.addEventListener('click', () => {
        if (isTimeUp() || !canWalk) return;
        const res = engine.walk();
        if (!res) {
          errors++;
          // flash red
          const btn = document.getElementById('btn-walk');
          if (btn) btn.style.background = 'var(--danger)';
          setTimeout(render, 300);
        } else {
          render();
        }
      });
    };

    render();
  };

  const finishBlock = () => {
    onBlockEnd({
      accuracy: rounds > 0 ? totalAcc / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
}
