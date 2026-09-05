import { PatternNextEngine } from './engine';
import { getPatternNextParams } from './manifest';

export function renderPatternNext(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new PatternNextEngine();
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 5;
  
  let currentTimer: any;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }
    
    const params = getPatternNextParams(level);
    const trial = engine.nextTrial(params);
    const roundStartTime = Date.now();
    
    container.innerHTML = `
      <div class="pattern-next-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div class="sequence-display" style="font-size: 32px; font-weight: bold; margin-bottom: 40px; color: #fff; letter-spacing: 5px;">
          ${trial.sequence.join(', ')}, ?
        </div>
        <div class="options" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
          ${trial.options.map(opt => `
            <button class="btn-primary pn-btn" data-val="${opt}" style="font-size: 20px; padding: 12px 24px; min-width: 80px;">
              ${opt}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const finishRound = (choice: number | null, rt: number) => {
      clearTimeout(currentTimer);
      const correct = engine.submit(choice, trial.answer);
      if (correct) correctCount++;
      totalRt += rt;
      rounds++;

      const seqEl = container.querySelector('.sequence-display') as HTMLElement;
      if (seqEl) {
        seqEl.style.color = correct ? '#4caf50' : '#f44336';
      }
      
      const btns = container.querySelectorAll('.pn-btn');
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

    const btns = container.querySelectorAll('.pn-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt((btn as HTMLElement).dataset.val!);
        finishRound(val, Date.now() - roundStartTime);
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
