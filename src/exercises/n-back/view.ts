import { NBackEngine, VisualSymbol } from './engine';
import { getNBackParams } from './manifest';

const SVGS: Record<VisualSymbol, string> = {
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
  let userVisual = false;
  let userAudio = false;

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.rate = 1.2;
      window.speechSynthesis.speak(u);
    }
  };

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }

    const trial = engine.nextTrial(params.matchChance);
    const roundStartTime = Date.now();
    hasAnswered = false;
    userVisual = false;
    userAudio = false;

    speak(trial.audio);
    
    container.innerHTML = `
      <div class="nback-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
        <div style="font-size: 1.2rem; color: #888; margin-bottom: 24px; text-align: center;">
          N = ${params.n}<br>
          <span style="font-size: 0.9rem;">Включите звук. Жмите кнопки, если есть совпадения.</span>
        </div>
        
        <div class="nback-symbol" style="width: 150px; height: 150px; color: #fff; margin-bottom: 40px; transition: color 0.2s;">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            ${SVGS[trial.visual]}
          </svg>
        </div>

        <div style="display: flex; gap: 16px; width: 100%; max-width: 300px;">
          <button id="btn-visual" class="nback-btn" style="flex: 1; padding: 16px; font-size: 1rem; background: #333; color: #fff; border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            Фигура (Влево)
          </button>
          <button id="btn-audio" class="nback-btn" style="flex: 1; padding: 16px; font-size: 1rem; background: #333; color: #fff; border: 2px solid transparent; border-radius: 8px; cursor: pointer; transition: all 0.2s;">
            Звук (Вправо)
          </button>
        </div>
      </div>
    `;

    const btnVisual = container.querySelector('#btn-visual') as HTMLButtonElement;
    const btnAudio = container.querySelector('#btn-audio') as HTMLButtonElement;

    const evaluateRound = () => {
      hasAnswered = true;
      clearTimeout(currentTimer);
      document.removeEventListener('keydown', onKey);

      const correct = engine.submit(trial.isVisualMatch, trial.isAudioMatch, userVisual, userAudio);
      
      if (correct) {
        correctCount++;
        totalRt += (Date.now() - roundStartTime);
      } else {
        totalRt += params.delayMs; // max penalty
      }
      rounds++;

      const symbolEl = container.querySelector('.nback-symbol') as HTMLElement;
      if (symbolEl) {
        symbolEl.style.color = correct ? '#4caf50' : '#f44336';
      }

      btnVisual.disabled = true;
      btnAudio.disabled = true;

      setTimeout(() => {
        startRound();
      }, 500);
    };

    currentTimer = setTimeout(() => {
      if (!hasAnswered) {
        evaluateRound();
      }
    }, params.delayMs);

    const onKey = (e: KeyboardEvent) => {
      if (hasAnswered) return;
      if (e.key === 'ArrowLeft') {
        userVisual = !userVisual;
        btnVisual.style.borderColor = userVisual ? '#2196f3' : 'transparent';
        btnVisual.style.background = userVisual ? '#1976d2' : '#333';
      } else if (e.key === 'ArrowRight') {
        userAudio = !userAudio;
        btnAudio.style.borderColor = userAudio ? '#2196f3' : 'transparent';
        btnAudio.style.background = userAudio ? '#1976d2' : '#333';
      }
    };
    document.addEventListener('keydown', onKey);

    btnVisual.addEventListener('click', () => {
      if (hasAnswered) return;
      userVisual = !userVisual;
      btnVisual.style.borderColor = userVisual ? '#2196f3' : 'transparent';
      btnVisual.style.background = userVisual ? '#1976d2' : '#333';
    });

    btnAudio.addEventListener('click', () => {
      if (hasAnswered) return;
      userAudio = !userAudio;
      btnAudio.style.borderColor = userAudio ? '#2196f3' : 'transparent';
      btnAudio.style.background = userAudio ? '#1976d2' : '#333';
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
  };
}
