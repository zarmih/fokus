import { OddOneEngine } from './engine';
import { getOddOneParams } from './manifest';
import { mountStage } from '../stage';

export function renderOddOne(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new OddOneEngine();
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
    const params = getOddOneParams(level);
    const { cells, oddIndex } = engine.start(params);
    const roundStartTime = Date.now();
    stage.setStatus('Найдите лишний');
    stage.board.innerHTML = `
      <div class="odd-one-grid" style="grid-template-columns: repeat(${params.grid}, 1fr); width:100%; max-width:340px; aspect-ratio:1;">
        ${cells.map((c, i) => `
          <button class="oo-btn" data-index="${i}" style="--h:${c.hue}; color: hsl(${c.hue} 80% 56%);">
            <span class="oo-orb"></span>
          </button>
        `).join('')}
      </div>
    `;

    const finishRound = (choiceIndex: number | null, rt: number) => {
      clearTimeout(currentTimer);
      const { accuracy } = engine.submit(choiceIndex);
      if (accuracy === 1) correctCount++;
      totalRt += rt;
      rounds++;
      stage.pulse(accuracy === 1);
      stage.board.querySelectorAll('.oo-btn').forEach((b, i) => {
        (b as HTMLButtonElement).disabled = true;
        if (i === oddIndex) (b as HTMLElement).style.outline = '3px solid #fff';
        else if (i === choiceIndex) (b as HTMLElement).style.outline = '3px solid #ef4444';
      });
      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) finishBlock();
        else startRound();
      }, 480);
    };

    currentTimer = window.setTimeout(() => finishRound(null, params.deadlineMs), params.deadlineMs);
    stage.board.querySelectorAll('.oo-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finishRound(parseInt((btn as HTMLElement).dataset.index!), Date.now() - roundStartTime);
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
