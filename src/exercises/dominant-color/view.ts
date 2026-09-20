import { DominantColorEngine } from './engine';
import { getDominantColorParams } from './manifest';
import { mountStage } from '../stage';

export function renderDominantColor(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new DominantColorEngine();
  const stage = mountStage(container, 'attention');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 6;
  let currentTimer: number;

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const params = getDominantColorParams(level);
    const { cells, options, dominantColor } = engine.start(params);
    const roundStartTime = Date.now();
    stage.setStatus('Преобладающий цвет');

    stage.board.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 32px; width:100%;">
        <div class="dc-grid" style="display: grid; grid-template-columns: repeat(${params.grid}, 1fr); gap: 4px; width: 100%; max-width: 320px; aspect-ratio: 1;">
          ${cells.map(c => `
            <div style="background-color: ${c}; border-radius: 4px; width: 100%; height: 100%;"></div>
          `).join('')}
        </div>
        <div class="dc-options" style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          ${options.map(c => `
            <button class="dc-btn" data-color="${c}" style="width: 56px; height: 56px; border-radius: 28px; background-color: ${c}; border: 4px solid var(--surface); cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.1s;"></button>
          `).join('')}
        </div>
      </div>
    `;

    const finishRound = (choice: string | null, rt: number) => {
      clearTimeout(currentTimer);
      const { accuracy } = engine.submit(choice);
      if (accuracy === 1) correctCount++;
      totalRt += rt;
      rounds++;
      stage.pulse(accuracy === 1);
      
      stage.board.querySelectorAll('.dc-btn').forEach((b) => {
        (b as HTMLButtonElement).disabled = true;
        const col = (b as HTMLElement).dataset.color;
        if (col === dominantColor) {
           (b as HTMLElement).style.borderColor = 'var(--ok)';
           (b as HTMLElement).style.transform = 'scale(1.1)';
        }
        else if (col === choice) {
           (b as HTMLElement).style.borderColor = 'var(--danger)';
        }
      });
      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) finishBlock();
        else startRound();
      }, 480);
    };

    currentTimer = window.setTimeout(() => finishRound(null, params.deadlineMs), params.deadlineMs);
    stage.board.querySelectorAll('.dc-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finishRound((btn as HTMLElement).dataset.color!, Date.now() - roundStartTime);
      });
      btn.addEventListener('mousedown', () => {
        (btn as HTMLElement).style.transform = 'scale(0.9)';
      });
    });
  };

  const finishBlock = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => { clearTimeout(currentTimer); stage.cleanup(); };
}
