import { VaultSpanEngine } from './engine';
import { manifest, getParams } from './manifest';
import { mountStage } from '../stage';

export function render(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new VaultSpanEngine();
  const stage = mountStage(container, 'memory');
  let rounds = 0, totalAccuracy = 0, totalRt = 0;
  let targetSeq: number[] = [];
  let userSeq: number[] = [];
  let isInputPhase = false;
  let roundStart = 0;

  stage.board.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; max-width:300px; margin:0 auto;">
      ${Array.from({length: 9}).map((_, i) => `<button id="vs-cell-${i}" class="btn" style="height:80px; font-size:32px; border-radius:12px;"></button>`).join('')}
    </div>
  `;

  const cells = Array.from({length: 9}).map((_, i) => stage.board.querySelector(`#vs-cell-${i}`) as HTMLButtonElement);

  const showSequence = async (seq: number[]) => {
    isInputPhase = false;
    stage.setStatus('Запоминайте...');
    cells.forEach(c => c.textContent = '');
    
    await new Promise(r => setTimeout(r, 500));
    for (const idx of seq) {
      cells[idx].textContent = '🪙';
      cells[idx].style.background = 'var(--surface)';
      await new Promise(r => setTimeout(r, 600));
      cells[idx].textContent = '';
      cells[idx].style.background = '';
      await new Promise(r => setTimeout(r, 200));
    }
    
    stage.setStatus('Повторите!');
    isInputPhase = true;
    userSeq = [];
    roundStart = Date.now();
  };

  const nextRound = () => {
    if (isTimeUp()) return finish();
    const params = getParams(level);
    targetSeq = engine.startRound(params).sequence;
    showSequence(targetSeq);
  };

  cells.forEach((cell, i) => {
    cell.onclick = () => {
      if (!isInputPhase) return;
      userSeq.push(i);
      cell.textContent = '🪙';
      setTimeout(() => { cell.textContent = ''; }, 300);
      
      if (userSeq.length === targetSeq.length) {
        isInputPhase = false;
        const rt = Date.now() - roundStart;
        const { accuracy } = engine.submit(userSeq, targetSeq);
        rounds++;
        totalAccuracy += accuracy;
        totalRt += rt;
        stage.pulse(accuracy === 1);
        setTimeout(nextRound, 1000);
      }
    };
  });

  const finish = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? totalAccuracy / rounds : 0,
      avgRtMs: totalRt / Math.max(1, rounds),
      rounds
    });
  };

  nextRound();
  return () => {
    stage.cleanup();
  };
}
