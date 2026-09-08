import { SequenceEngine } from './engine';
import { getSequenceParams } from './manifest';
import { mountStage } from '../stage';

export function renderSequence(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new SequenceEngine();
  const stage = mountStage(container, 'memory');
  let rounds = 0;
  let totalAccuracy = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 3;
  let dead = false;

  const startRound = () => {
    if (dead || isTimeUp()) {
      finish();
      return;
    }
    const params = getSequenceParams(level);
    const { sequence } = engine.start(params);
    const totalCells = params.grid * params.grid;
    stage.setStatus('Смотрите цепочку');
    stage.board.innerHTML = `
      <div class="grid-memory-board" style="grid-template-columns: repeat(${params.grid}, 1fr);">
        ${Array.from({ length: totalCells }, () => `<button class="grid-cell" disabled></button>`).join('')}
      </div>
    `;
    const cells = [...stage.board.querySelectorAll('.grid-cell')] as HTMLButtonElement[];
    let step = 0;

    const playNext = () => {
      if (dead) return;
      if (step >= sequence.length) {
        stage.setStatus('Повторите');
        let selected: number[] = [];
        const roundStartTime = Date.now();
        cells.forEach((btn, idx) => {
          btn.disabled = false;
          btn.addEventListener('click', () => {
            btn.classList.add('selected');
            setTimeout(() => btn.classList.remove('selected'), 160);
            selected.push(idx);
            if (selected[selected.length - 1] !== sequence[selected.length - 1] || selected.length === sequence.length) {
              finishRound(selected, roundStartTime);
            }
          });
        });
        return;
      }
      const idx = sequence[step];
      cells[idx].classList.add('highlight');
      setTimeout(() => {
        cells[idx].classList.remove('highlight');
        setTimeout(() => { step++; playNext(); }, params.gapMs);
      }, params.flashMs);
    };

    const finishRound = (selected: number[], roundStartTime: number) => {
      cells.forEach(c => c.disabled = true);
      const { accuracy } = engine.submit(selected);
      totalAccuracy += accuracy;
      totalRt += Date.now() - roundStartTime;
      rounds++;
      stage.pulse(accuracy === 1);
      selected.forEach((i, k) => {
        cells[i].classList.add(i === sequence[k] ? 'correct' : 'wrong');
      });
      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) finish();
        else startRound();
      }, 800);
    };

    setTimeout(playNext, 420);
  };

  const finish = () => {
    if (dead) return;
    dead = true;
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? totalAccuracy / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => { dead = true; stage.cleanup(); };
}
