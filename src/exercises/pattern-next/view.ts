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
      <div class="pn-board">
        <div class="pn-seq">
          ${trial.sequence.map(n => `<div class="pn-item">${n}</div>`).join('')}
          <div class="pn-item missing">?</div>
        </div>
        <div class="pn-options">
          ${trial.options.map((opt, i) => `
            <button class="pn-btn" data-val="${opt}" data-idx="${i}">
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

      const missing = container.querySelector('.pn-item.missing') as HTMLElement;
      if (missing) {
        missing.textContent = choice !== null ? choice.toString() : '?';
        missing.style.border = 'none';
        missing.style.background = correct ? 'var(--ok)' : 'var(--danger)';
        missing.style.color = '#fff';
      }
      
      const btns = container.querySelectorAll('.pn-btn');
      btns.forEach(b => {
        const btn = b as HTMLButtonElement;
        btn.disabled = true;
        if (choice !== null && parseInt(btn.dataset.val!) === choice) {
          btn.classList.add(correct ? 'correct' : 'wrong');
        } else if (parseInt(btn.dataset.val!) === trial.answer) {
          btn.classList.add('correct');
        }
      });

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
