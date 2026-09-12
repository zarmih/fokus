import { CacheSpanEngine } from './engine';
import { getCacheSpanParams } from './manifest';
import { mountStage } from '../stage';
import { BlockResult } from '../contract';

export function renderCacheSpan(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: BlockResult) => void,
  isTimeUp: () => boolean = () => false
) {
  const engine = new CacheSpanEngine();
  const stage = mountStage(container, 'memory');
  let rounds = 0;
  let correctRounds = 0;
  let totalRt = 0;
  let timers: number[] = [];

  const startRound = () => {
    if (isTimeUp()) {
      finish();
      return;
    }
    const params = getCacheSpanParams(level);
    const { items } = engine.start(params);
    stage.setStatus('Запомните символы');

    stage.board.innerHTML = `
      <style>
        .cache-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 16px;
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }
        .cache-slot {
          aspect-ratio: 1;
          background: var(--surface);
          border: 2px solid var(--border);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .cache-slot.hidden {
          font-size: 0;
        }
        .cache-slot:not([disabled]):hover {
          border-color: var(--accent);
          transform: translateY(-2px);
        }
        .cache-slot.correct {
          background: var(--ok);
          color: #fff;
          font-size: 32px;
        }
        .cache-slot.wrong {
          background: var(--danger);
          color: #fff;
        }
      </style>
      <div class="cache-grid">
        ${items.map((it, i) => `<button class="cache-slot" data-i="${i}" disabled>${it}</button>`).join('')}
      </div>
    `;

    const slots = [...stage.board.querySelectorAll('.cache-slot')] as HTMLButtonElement[];

    const t = window.setTimeout(() => {
      const { target } = engine.getQuestion();
      stage.setStatus(`Где находится ${target}?`);
      
      slots.forEach(btn => {
        btn.classList.add('hidden');
        btn.disabled = false;
      });

      const roundStartTime = Date.now();
      
      slots.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          const rt = Date.now() - roundStartTime;
          const { correct, correctIndex } = engine.submit(idx);
          
          if (correct) correctRounds++;
          totalRt += rt;
          rounds++;
          
          stage.pulse(correct);
          slots.forEach(c => c.disabled = true);
          btn.classList.remove('hidden');
          
          if (correct) {
            btn.classList.add('correct');
          } else {
            btn.classList.add('wrong');
            slots[correctIndex].classList.remove('hidden');
            slots[correctIndex].classList.add('correct');
          }
          
          level = correct ? level + 0.5 : Math.max(1, level - 0.5);
          
          window.setTimeout(startRound, 1000);
        });
      });
    }, params.showMs);
    timers.push(t);
  };

  const finish = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctRounds / rounds : 0,
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
