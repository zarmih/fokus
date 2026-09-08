import { PulleyEngine } from './engine';
import { getPulleyParams, generateDynamicTask } from './manifest';
import { mountStage } from '../stage';

export function renderPulley(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: { accuracy: number, avgRtMs: number, rounds: number }) => void,
  isTimeUp: () => boolean
) {
  const stage = mountStage(container, 'logic');
  stage.setStatus('Соберите нужный вес');
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
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 32px; color: var(--text);">
            <div style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
              Двери: ${engine.gates.map((g, i) => `<span style="color: ${i < engine.playerAt ? 'var(--ok)' : (i === engine.playerAt ? 'var(--accent)' : 'var(--muted)')}; margin: 0 4px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${g.need}</span>`).join(' ')}
            </div>
            <div style="font-size: 16px; color: var(--muted); text-align: center; font-weight: 500;">
              На крюке: <b style="color: var(--accent-2); font-size: 18px;">${hookSum}</b> (макс. 2 гири)
            </div>
          </div>
          
          <div style="position: relative; width: ${boardWidth}px; height: 220px; background: var(--surface); border-radius: 20px; overflow: visible; margin-bottom: 40px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.1), var(--shadow-sm); border: 1px solid rgba(255,255,255,0.05);">
            <!-- Player -->
            <div id="player-sprite" style="position: absolute; bottom: 20px; left: ${engine.playerAt * 80 + 20}px; transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1); width: 32px; height: 32px; background: radial-gradient(circle at 30% 30%, #fbbf24 0%, var(--accent) 100%); border-radius: 50%; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5), inset 0 -2px 4px rgba(0,0,0,0.2); z-index: 10;"></div>

            <!-- Gates -->
            ${engine.gates.map((g, i) => {
              const isActive = i === engine.playerAt;
              const isPast = i < engine.playerAt;
              const isFuture = i > engine.playerAt;
              
              const gSum = g.hook.reduce((a,b)=>a+b, 0);
              const isOpen = isPast || (isActive && gSum === g.need);
              
              const doorColor = isOpen ? 'linear-gradient(180deg, var(--ok) 0%, #059669 100%)' : 'linear-gradient(180deg, var(--danger) 0%, #dc2626 100%)';
              const doorShadow = isOpen ? '0 0 16px rgba(16, 185, 129, 0.4)' : '0 0 16px rgba(239, 68, 68, 0.4)';
              const doorY = isOpen ? -140 : 0;
              const ropeDoorY = isOpen ? 40 : 90; 
              const hookY = isOpen ? 80 : 40; 
              const xPos = 80 + i * 80;
              
              const outline = isActive ? 'background: rgba(245, 158, 11, 0.05); border-radius: 12px;' : '';

              return `
                <div style="position: absolute; top: 0; bottom: 0; left: ${xPos}px; width: 80px; ${outline} transition: background 300ms;">
                  <!-- Pulley and Rope -->
                  <div style="position: absolute; top: 10px; left: 10px; width: 60px; height: 100px;">
                    <svg width="60" height="100" viewBox="0 0 60 100" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
                      <circle cx="30" cy="10" r="10" fill="var(--surface-2)" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
                      <circle cx="30" cy="10" r="4" fill="var(--accent-2)"/>
                      <!-- Rope to hook -->
                      <line x1="20" y1="10" x2="20" y2="${hookY}" stroke="rgba(255,255,255,0.5)" stroke-width="3" style="transition: y2 500ms cubic-bezier(0.4, 0, 0.2, 1);"/>
                      <!-- Rope to door -->
                      <line x1="40" y1="10" x2="40" y2="${ropeDoorY}" stroke="rgba(255,255,255,0.5)" stroke-width="3" style="transition: y2 500ms cubic-bezier(0.4, 0, 0.2, 1);"/>
                      <!-- Hook element -->
                      <path d="M20,${hookY} Q30,${hookY+8} 40,${hookY}" stroke="var(--accent-2)" stroke-width="4" fill="none" stroke-linecap="round" style="transition: d 500ms cubic-bezier(0.4, 0, 0.2, 1);"/>
                    </svg>
                  </div>
                  <!-- Weights on this door's hook -->
                  <div style="position: absolute; top: ${hookY + 15}px; left: 14px; display: flex; gap: 4px; transition: top 500ms cubic-bezier(0.4, 0, 0.2, 1);">
                    ${g.hook.map((w, idx) => `
                      <div class="${isActive ? 'weight-hook-on-door' : ''}" data-idx="${idx}" style="width: 24px; height: 24px; background: linear-gradient(135deg, var(--dom-speed) 0%, #ea580c 100%); color: #fff; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px; cursor: ${isActive ? 'pointer' : 'default'};">
                        ${w}
                      </div>
                    `).join('')}
                  </div>
                  <!-- Door -->
                  <div style="position: absolute; bottom: 20px; left: 30px; width: 24px; height: 70px; background: ${doorColor}; box-shadow: ${doorShadow}, inset 0 2px 4px rgba(255,255,255,0.2); transform: translateY(${doorY}%); transition: transform 500ms cubic-bezier(0.4, 0, 0.2, 1), background 500ms ease; border-radius: 6px; z-index: 5;"></div>
                </div>
              `;
            }).join('')}

            <!-- Floor Line -->
            <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 20px; background: var(--surface-2); border-radius: 0 0 20px 20px; border-top: 1px solid rgba(255,255,255,0.05);"></div>
          </div>

          <!-- Weights on Hook (Large) -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="font-size: 14px; color: var(--muted); margin-bottom: 12px; font-weight: 600;">НА КРЮКЕ (нажми, чтобы сбросить)</div>
            <div style="min-height: 48px; display: flex; gap: 12px; justify-content: center;">
              ${(currentGate ? currentGate.hook : []).map((w, idx) => `
                <div class="weight-hook-large" data-idx="${idx}" style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--dom-speed) 0%, #ea580c 100%); color: #fff; border-radius: 12px; box-shadow: 0 4px 8px rgba(234, 88, 12, 0.4); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; cursor: pointer; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
                  ${w}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Weights on Floor -->
          <div style="min-height: 56px; display: flex; gap: 12px; margin-bottom: 40px; flex-wrap: wrap; justify-content: center; max-width: 440px;">
            ${engine.floor.map((w, idx) => `
              <div class="weight-floor" data-idx="${idx}" style="width: 48px; height: 48px; background: linear-gradient(135deg, var(--dom-logic) 0%, #ca8a04 100%); color: #1a2332; border-radius: 12px; box-shadow: 0 4px 8px rgba(202, 138, 4, 0.4); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px; cursor: pointer; transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);">
                ${w}
              </div>
            `).join('')}
          </div>

          <div style="display: flex; gap: 16px; margin-bottom: 16px; width: 100%; max-width: 440px;">
            <button id="btn-walk" class="btn-primary" style="flex: 2; padding: 16px; font-size: 20px; font-weight: 800; opacity: ${canWalk ? 1 : 0.5}; pointer-events: ${canWalk ? 'auto' : 'none'};">ИДТИ</button>
            <button id="btn-drop-all" class="btn-secondary" style="flex: 1; padding: 16px; font-size: 14px;">Все на пол</button>
            <button id="btn-reset" class="btn-secondary" style="flex: 1; padding: 16px; font-size: 14px;">Сброс</button>
          </div>
        </div>
      `;

      stage.board.innerHTML = html;

      stage.board.querySelectorAll('.weight-floor').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp() || isAnimating) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.takeFloor(idx);
          render();
        });
      });

      stage.board.querySelectorAll('.weight-hook-on-door').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp() || isAnimating) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.dropHook(idx);
          render();
        });
      });

      stage.board.querySelectorAll('.weight-hook-large').forEach(el => {
        el.addEventListener('click', () => {
          if (isTimeUp() || isAnimating) return;
          const idx = parseInt((el as HTMLElement).dataset.idx || '0');
          engine.dropHook(idx);
          render();
        });
      });

      stage.board.querySelector('#btn-drop-all')?.addEventListener('click', () => {
        if (isTimeUp() || isAnimating) return;
        engine.dumpAllToFloor();
        render();
      });

      stage.board.querySelector('#btn-reset')?.addEventListener('click', () => {
        if (isTimeUp() || isAnimating) return;
        rounds++;
        totalRt += Date.now() - roundStart;
        
        const newTask = generateDynamicTask(level, engine.gates.map(g => g.need));
        const newParams = { ...params, need: newTask.need, pool: newTask.pool };
        startRound(newParams);
      });

      stage.board.querySelector('#btn-walk')?.addEventListener('click', () => {
        if (isTimeUp() || !canWalk || isAnimating) return;
        isAnimating = true;
        
        const playerEl = stage.board.querySelector('#player-sprite') as HTMLElement;
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
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? totalAcc / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => stage.cleanup();
}
