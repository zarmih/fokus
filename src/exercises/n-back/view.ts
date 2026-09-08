import { NBackEngine, SymbolId } from './engine';
import { getNBackParams } from './manifest';

const SVGS: Record<SymbolId, string> = {
  square: '<rect x="20" y="20" width="60" height="60" fill="currentColor"/>',
  circle: '<circle cx="50" cy="50" r="30" fill="currentColor"/>',
  triangle: '<polygon points="50,20 80,80 20,80" fill="currentColor"/>',
  star: '<polygon points="50,15 61,38 85,42 68,59 72,83 50,71 28,83 32,59 15,42 39,38" fill="currentColor"/>',
  cross: '<polygon points="40,20 60,20 60,40 80,40 80,60 60,60 60,80 40,80 40,60 20,60 20,40 40,40" fill="currentColor"/>',
  hexagon: '<polygon points="50,15 80,32 80,68 50,85 20,68 20,32" fill="currentColor"/>'
};

export function renderNBack(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const params = getNBackParams(level);
  const engine = new NBackEngine(params.n);
  
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let currentTimer: any;
  let hasAnswered = false;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }

    const trial = engine.nextTrial(params.matchChance);
    const roundStartTime = Date.now();
    hasAnswered = false;
    
    container.innerHTML = `
      <div class="nback-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
        <div style="font-size: 1.2rem; color: #888; margin-bottom: 24px;">
          N = ${params.n} (совпадает с фигурой ${params.n} шага назад?)
        </div>
        
        <div class="nback-symbol" style="width: 150px; height: 150px; color: #fff; margin-bottom: 40px;">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            ${SVGS[trial.symbol]}
          </svg>
        </div>

        <div style="display: flex; gap: 16px; width: 100%; max-width: 300px;">
          <button class="nback-btn no" data-match="false" style="flex: 1; padding: 16px; font-size: 1.2rem; background: #333; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
            Нет (Влево)
          </button>
          <button class="nback-btn yes" data-match="true" style="flex: 1; padding: 16px; font-size: 1.2rem; background: #4caf50; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
            Да (Вправо)
          </button>
        </div>
      </div>
    `;

    const finishRound = (userSaidMatch: boolean | null, rt: number) => {
      if (hasAnswered) return;
      hasAnswered = true;
      clearTimeout(currentTimer);
      document.removeEventListener('keydown', onKey);

      // If user didn't answer (timeout), treat as false, but if it was match, it's an error
      const actualMatch = userSaidMatch === null ? false : userSaidMatch;
      const correct = engine.submit(trial.isMatch, actualMatch);
      
      if (correct && userSaidMatch !== null) {
        correctCount++;
        totalRt += rt;
      } else if (correct && userSaidMatch === null && !trial.isMatch) {
         // Correctly ignored
         correctCount++;
         totalRt += params.delayMs; // max penalty
      }
      rounds++;

      const symbolEl = container.querySelector('.nback-symbol') as HTMLElement;
      if (symbolEl) {
        symbolEl.style.color = correct ? '#4caf50' : '#f44336';
      }

      const btns = container.querySelectorAll('.nback-btn');
      btns.forEach(b => (b as HTMLButtonElement).disabled = true);

      setTimeout(() => {
        startRound();
      }, 400);
    };

    currentTimer = setTimeout(() => {
      finishRound(null, params.delayMs);
    }, params.delayMs);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'n' || e.key === 'N') {
        finishRound(false, Date.now() - roundStartTime);
      } else if (e.key === 'ArrowRight' || e.key === 'y' || e.key === 'Y') {
        finishRound(true, Date.now() - roundStartTime);
      }
    };
    document.addEventListener('keydown', onKey);

    const btns = container.querySelectorAll('.nback-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const isMatch = (btn as HTMLElement).dataset.match === 'true';
        finishRound(isMatch, Date.now() - roundStartTime);
      });
    });
  };

  const finishBlock = () => {
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  
  return () => {
    clearTimeout(currentTimer);
    // document.removeEventListener is handled in finishRound, but let's be safe
  };
}
