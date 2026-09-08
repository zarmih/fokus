import { SchulteEngine } from './engine';
import { getSchulteParams } from './manifest';
import { mountStage } from '../stage';

export function renderSchulte(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const stage = mountStage(container, 'speed');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let errors = 0;
  let roundStartTime = Date.now();
  let checkInterval: number;

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const { size } = getSchulteParams(level);
    const engine = new SchulteEngine(size);
    roundStartTime = Date.now();
    const grid = engine.getGrid();
    stage.setStatus('Найдите 1');
    stage.board.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(${size},1fr);gap:8px;width:100%;max-width:380px;aspect-ratio:1">
        ${grid.map(num => `<button class="schulte-btn" data-num="${num}" style="font-size:${size > 4 ? '1.05rem' : '1.4rem'}">${num}</button>`).join('')}
      </div>
    `;
    stage.board.querySelectorAll('.schulte-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = parseInt((btn as HTMLElement).dataset.num!);
        if (engine.submit(val)) {
          correctCount++;
          totalRt += Date.now() - roundStartTime;
          roundStartTime = Date.now();
          (btn as HTMLElement).classList.add('found');
          (btn as HTMLButtonElement).disabled = true;
          stage.burst(true);
          if (engine.isDone()) {
            rounds++;
            stage.pulse(true);
            setTimeout(startRound, 280);
          } else {
            stage.setStatus(`Найдите ${engine.getExpected()}`);
          }
        } else {
          errors++;
          stage.pulse(false);
          const b = btn as HTMLElement;
          b.style.background = 'linear-gradient(180deg,#f87171,var(--danger))';
          setTimeout(() => { b.style.background = ''; }, 180);
        }
      });
    });
  };

  const finishBlock = () => {
    clearInterval(checkInterval);
    stage.cleanup();
    const totalClicks = correctCount + errors;
    onBlockEnd({
      accuracy: totalClicks > 0 ? correctCount / totalClicks : 0,
      avgRtMs: correctCount > 0 ? totalRt / correctCount : 0,
      rounds
    });
  };

  checkInterval = window.setInterval(() => { if (isTimeUp()) finishBlock(); }, 1000);
  startRound();
  return () => { clearInterval(checkInterval); stage.cleanup(); };
}
