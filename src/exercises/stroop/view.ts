import { StroopEngine, COLORS } from './engine';
import { getStroopParams } from './manifest';

export function renderStroop(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new StroopEngine();
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 8;
  
  let currentTimer: any;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }
    
    const params = getStroopParams(level);
    const trial = engine.nextTrial(params);
    const roundStartTime = Date.now();
    
    container.innerHTML = `
      <div class="stroop-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div class="stroop-word" style="font-size: 48px; font-weight: bold; margin-bottom: 40px; color: ${COLORS.find(c=>c.id===trial.ink)!.hex}">
          ${COLORS.find(c=>c.id===trial.word)!.word}
        </div>
        <div class="stroop-options" style="display: flex; gap: 10px;">
          ${trial.options.map(opt => `
            <button class="btn-primary stroop-btn" data-color="${opt}" style="background: ${COLORS.find(c=>c.id===opt)!.hex}; color: #000;">
              ${COLORS.find(c=>c.id===opt)!.word}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const finishRound = (choice: any, rt: number) => {
      clearTimeout(currentTimer);
      const correct = engine.submit(choice, trial.ink);
      if (correct) correctCount++;
      totalRt += rt;
      rounds++;

      const wordEl = container.querySelector('.stroop-word') as HTMLElement;
      if (wordEl) {
        wordEl.style.color = correct ? '#4caf50' : '#f44336';
        wordEl.textContent = correct ? 'Верно' : 'Ошибка';
      }
      
      const btns = container.querySelectorAll('.stroop-btn');
      btns.forEach(b => (b as HTMLButtonElement).disabled = true);

      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) {
          finishBlock();
        } else {
          startRound();
        }
      }, 500);
    };

    currentTimer = setTimeout(() => {
      finishRound(null, params.deadlineMs);
    }, params.deadlineMs);

    const btns = container.querySelectorAll('.stroop-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = (btn as HTMLElement).dataset.color;
        finishRound(choice, Date.now() - roundStartTime);
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
}
