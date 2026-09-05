import { OddOneEngine } from './engine';
import { getOddOneParams } from './manifest';

export function renderOddOne(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new OddOneEngine();
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 6;
  
  let currentTimer: any;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }
    
    const params = getOddOneParams(level);
    const { cells, oddIndex } = engine.start(params);
    const roundStartTime = Date.now();
    
    container.innerHTML = `
      <div class="odd-one-board" style="display: grid; gap: 8px; margin: 20px auto; width: 100%; max-width: 400px; aspect-ratio: 1; grid-template-columns: repeat(${params.grid}, 1fr);">
        ${cells.map((c, i) => `
          <button class="odd-one-cell" data-index="${i}" style="background-color: hsl(${c.hue}, 70%, 50%); border: none; border-radius: 8px; cursor: pointer;"></button>
        `).join('')}
      </div>
    `;

    const finishRound = (choiceIndex: number | null, rt: number) => {
      clearTimeout(currentTimer);
      const { accuracy } = engine.submit(choiceIndex);
      if (accuracy === 1) correctCount++;
      totalRt += rt;
      rounds++;

      const btns = container.querySelectorAll('.odd-one-cell');
      btns.forEach((b: any, i) => {
        b.disabled = true;
        if (i === oddIndex) {
          b.style.border = '4px solid #fff';
        } else if (i === choiceIndex) {
          b.style.border = '4px solid #f44336';
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

    const btns = container.querySelectorAll('.odd-one-cell');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt((btn as HTMLElement).dataset.index!);
        finishRound(idx, Date.now() - roundStartTime);
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
