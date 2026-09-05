import { PulleyEngine } from './engine';
import { getPulleyParams, generateDynamicTask } from './manifest';

export function renderPulley(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: { accuracy: number, avgRtMs: number, rounds: number }) => void,
  isTimeUp: () => boolean
) {
  let rounds = 0;
  let totalAcc = 0;
  let totalRt = 0;
  
  const startRound = (customParams?: any) => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }

    const params = customParams || getPulleyParams(level);
    const engine = new PulleyEngine();
    engine.generate(params);
    const roundStart = Date.now();
    let isAnimating = false;

    const render = () => {
      if (isTimeUp() && !isAnimating) {
        finishBlock();
        return;
      }
      if (engine.status === 'win' && !isAnimating) {
        const rt = Date.now() - roundStart;
        totalAcc += 1;
        totalRt += rt;
        rounds++;
        setTimeout(startRound, 300);
        return;
      }

      const currentGate = engine.gates[engine.playerAt];
      const hookSum = currentGate ? currentGate.hook.reduce((a,b)=>a+b, 0) : 0;
      const canWalk = currentGate && hookSum === currentGate.need;

      // Ensure view is wide enough for up to 4 doors
      const boardWidth = Math.max(320, engine.gates.length * 80 + 100);

      const html = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; overflow-x: auto;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 24px; color: var(--text);">
            <div style="font-size: 20px;">
              Двери: ${engine.gates.map((g, i) => `<span style="color: ${i < engine.playerAt ? 'var(--ok)' : (i === engine.playerAt ? 'var(--accent)' : 'var(--muted)')}; font-weight: bold; margin: 0 4px;">${g.need}</span>`).join(' ')}
            </div>
            <div style="font-size: 16px; color: var(--muted); text-align: center;">
              На крюке: <b style="color: var(--accent-2);">${hookSum}</b> (макс. 2 гири)
              <div style="font-size: 14px; margin-top: 4px; opacity: 0.8;">Гирю с пройденной двери вернуть нельзя.</div>
            </div>
          </div>
          
          <div style="position: relative; width: ${boardWidth}px; height: 200px; background: var(--surface); border-radius: 8px; overflow: visible; margin-bottom: 24px;">
            <!-- Player -->
            <div id="player-sprite" style="position: absolute; bottom: 20px; left: ${engine.playerAt * 80 + 20}px; transition: transform 500ms ease;">
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
              const isFuture = i > engine.playerAt;
              
              const gSum = g.hook.reduce((a,b)=>a+b, 0);
              const isOpen = isPast || (isActive && gSum === g.need);
              
              const doorColor = isOpen ? 'var(--ok)' : 'var(--danger)';
              const doorY = isOpen ? -140 : 0;
              const ropeDoorY = isOpen ? 40 : 90; 
              const hookY = isOpen ? 80 : 40; 
              const xPos = 80 + i * 80;
              
              const outline = isActive ? 'outline: 2px solid var(--accent);' : '';

              return `
                <div style="position: absolute; top: 0; bottom: 0; left: ${xPos}px; width: 80px; ${outline}">
                  <!-- Pulley and Rope -->
                  <div style="position: absolute; top: 10px; left: 10px; width: 60px; height: 100px;">
                    <svg width="60" height="100" viewBox="0 0 60 100">
                      <circle cx="30" cy="10" r="8" fill="var(--accent-2)"/>
                      <!-- Rope to hook -->
                      <line x1="22" y1="10" x2="22" y2="${hookY}" stroke="var(--accent-2)" stroke-width="2" style="transition: y2 400ms ease;"/>
                      <!-- Rope to door -->
                      <line x1="38" y1="10" x2="38" y2="${ropeDoorY}" stroke="var(--accent-2)" stroke-width="2" style="transition: y2 400ms ease;"/>
                      <!-- Hook element -->
                      <path d="M22,${hookY} Q30,${hookY+5} 38,${hookY}" stroke="var(--accent-2)" stroke-width="2" fill="none" style="transition: d 400ms ease;"/>
                    </svg>
                  </div>
                  <!-- Weights on this door's hook -->
                  <div style="position: absolute; top: ${hookY + 15}px; left: 14px; display: flex; gap: 4px; transition: top 400ms ease;">
                    ${g.hook.map((w, idx) => `
                      <div class="${isActive ? 'weight-hook-on-door' : ''}" data-idx="${idx}" style="width: 24px; height: 24px; background: var(--dom-speed); color: #fff; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; cursor: ${isActive ? 'pointer' : 'default'};">
                        ${w}
                      </div>
                    `).join('')}
                  </div>
                  <!-- Door -->
                  <div style="position: absolute; bottom: 20px; left: 30px; width: 20px; height: 60px; background: ${doorColor}; transform: translateY(${doorY}%); transition: transform 400ms ease, background 400ms ease; border-radius: 4px;"></div>
                </div>
              `;
            }).join('')}

            <!-- Floor Line -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 20px; background: var(--surface-2);"></div>
          </div>

          <!-- Weights on Hook (Large) -->
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 14px; color: var(--muted); margin-bottom: 8px;">На крюке (Нажми гирю — упадёт на пол):</div>
            <div style="min-height: 40px; display: flex; gap: 8px; justify-content: center;">
              ${(currentGate ? currentGate.hook : []).map((w, idx) => `
                <div class="weight-hook-large" data-idx="${idx}" style="width: 40px; height: 40px; background: var(--dom-speed); color: #fff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;">
                  ${w}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Weights on Floor -->
          <div style="min-height: 50px; display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; justify-content: center; max-width: 400px;">
            ${engine.floor.map((w, idx) => `
              <div class="weight-floor" data-idx="${idx}" style="width: 40px; height: 40px; background: var(--dom-logic); color: #1a2332; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer;">
                ${w}
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 16px;">
            <button id="btn-walk" class="btn-primary" style="padding: 16px 48px; font-size: 20px; opacity: ${canWalk ? 1 : 0.5}; pointer-events: ${canWalk ? 'auto' : 'none'};">Идти</button>
            <button id="btn-drop-all" class="btn-secondary" style="padding: 16px 24px; font-size: 16px;">Все на пол</button>
            <button id="btn-reset" class="btn-secondary" style="padding: 16px 24px; font-size: 16px;">Сброс пазла</button>
          </div>
        </div>
      `;

      container.innerHTML = html;

      container.querySelectorAll('.weight-floor').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp() || isAnimating) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.takeFloor(idx);
          render();
        });
      });

      container.querySelectorAll('.weight-hook-on-door').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp() || isAnimating) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.dropHook(idx);
          render();
        });
      });

      container.querySelectorAll('.weight-hook-large').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp() || isAnimating) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.dropHook(idx);
          render();
        });
      });

      document.getElementById('btn-drop-all')?.addEventListener('click', () => {
        if (isTimeUp() || isAnimating) return;
        while(engine.gates[engine.playerAt]?.hook.length > 0) {
           engine.dropHook(0);
        }
        render();
      });

      document.getElementById('btn-reset')?.addEventListener('click', () => {
        if (isTimeUp() || isAnimating) return;
        rounds++;
        totalRt += Date.now() - roundStart;
        
        const newTask = generateDynamicTask(level, engine.gates.map(g => g.need));
        const newParams = { ...params, need: newTask.need, pool: newTask.pool };
        startRound(newParams);
      });

      document.getElementById('btn-walk')?.addEventListener('click', () => {
        if (isTimeUp() || !canWalk || isAnimating) return;
        isAnimating = true;
        
        const playerEl = container.querySelector('#player-sprite') as HTMLElement;
        if (playerEl) {
          playerEl.style.transform = `translateX(80px)`;
        }
        
        setTimeout(() => {
          isAnimating = false;
          const res = engine.walk();
          if (!res) {
            // shouldn't happen because btn is disabled, but just in case
            render();
          } else {
            render();
          }
        }, 500);
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
