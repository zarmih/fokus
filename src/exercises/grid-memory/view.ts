import { GridMemoryEngine } from './engine';
import { getGridMemoryParams, gridMemoryManifest } from './manifest';
import { paramsAlongCurve } from '../diff-curves';
import { mountStage } from '../stage';

export function renderGridMemory(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean = () => false
) {
  const engine = new GridMemoryEngine();
  const stage = mountStage(container, 'memory');
  let rounds = 0;
  let totalAccuracy = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 3;
  let timers: number[] = [];

  const startRound = () => {
    if (isTimeUp()) {
      finish();
      return;
    }
    const anchor = getGridMemoryParams(level);
    const { params } = paramsAlongCurve(getGridMemoryParams, {
      target: level,
      index: rounds,
      count: Math.max(minRounds, 5),
      kind: gridMemoryManifest.diffCurve,
      hold: { grid: anchor.grid }
    });
    const { cellsToRemember } = engine.start(params);
    const totalCells = params.grid * params.grid;
    stage.setStatus('Запомните клетки');

    stage.board.innerHTML = `
      <div class="grid-memory-board" style="grid-template-columns: repeat(${params.grid}, 1fr);">
        ${Array.from({ length: totalCells }, (_, i) =>
          `<button class="grid-cell ${cellsToRemember.includes(i) ? 'highlight' : ''}" data-i="${i}" disabled></button>`
        ).join('')}
      </div>
    `;
    const cells = [...stage.board.querySelectorAll('.grid-cell')] as HTMLButtonElement[];

    const t = window.setTimeout(() => {
      stage.setStatus('Повторите');
      cells.forEach(btn => {
        btn.classList.remove('highlight');
        btn.disabled = false;
      });
      let selected: number[] = [];
      const roundStartTime = Date.now();

      cells.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            selected = selected.filter(s => s !== idx);
          } else {
            btn.classList.add('selected');
            selected.push(idx);
            if (selected.length === params.cells) {
              const rt = Date.now() - roundStartTime;
              const { accuracy } = engine.submit(selected);
              totalAccuracy += accuracy;
              totalRt += rt;
              rounds++;
              stage.pulse(accuracy === 1);
              cells.forEach((c, i) => {
                c.disabled = true;
                if (cellsToRemember.includes(i)) c.classList.add('correct');
                else if (selected.includes(i)) c.classList.add('wrong');
              });
              window.setTimeout(() => {
                const elapsed = Date.now() - blockStartTime;
                if (elapsed >= maxBlockMs && rounds >= minRounds) finish();
                else startRound();
              }, 720);
            }
          }
        });
      });
    }, params.showMs);
    timers.push(t);
  };

  const finish = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? totalAccuracy / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => {
    timers.forEach(clearTimeout);
    stage.cleanup();
  };
}
