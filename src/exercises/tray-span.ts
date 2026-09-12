import { ExerciseModule, BlockResult } from './contract';

const EMOJIS = ['🍎', '🍌', '🍇', '🍉', '🍒', '🥝', '🥥', '🍍', '🥭', '🍑', '🍋', '🍐'];

function shuffle<T>(arr: T[]): T[] {
  const res = [...arr];
  for (let i = res.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [res[i], res[j]] = [res[j], res[i]];
  }
  return res;
}

const traySpanModule: ExerciseModule = {
  manifest: {
    id: 'tray-span',
    name: 'Подносы',
    domain: 'memory',
    skills: ['working_memory', 'visual_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните, какие предметы лежат на каких подносах. Затем выберите поднос и верните на него нужные предметы.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const numTrays = level > 7 ? 4 : (level > 3 ? 3 : 2);
    const numItems = Math.min(10, 2 + Math.floor(level / 2));
    const showTime = Math.max(2000, 5000 - level * 400);

    el.innerHTML = `
      <style>
        .ts-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 30px;
          padding: 20px;
        }
        .ts-trays {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .ts-tray {
          min-width: 120px;
          min-height: 100px;
          border: 3px solid var(--line);
          border-radius: 16px;
          background: var(--surface);
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 8px;
          padding: 12px;
          cursor: pointer;
          transition: border-color 0.2s;
        }
        .ts-tray.active {
          border-color: var(--primary);
        }
        .ts-item {
          font-size: 32px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s;
        }
        .ts-item:active {
          transform: scale(0.9);
        }
        .ts-pool {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          min-height: 50px;
        }
        .ts-item.placed {
          opacity: 0.3;
          pointer-events: none;
        }
      </style>
      <div class="ts-layout">
        <div class="ts-trays" id="ts-trays"></div>
        <div class="ts-pool" id="ts-pool"></div>
      </div>
    `;

    const traysEl = el.querySelector('#ts-trays') as HTMLElement;
    const poolEl = el.querySelector('#ts-pool') as HTMLElement;

    let targetTrays: string[][] = [];
    let currentTrays: string[][] = [];
    let poolItems: string[] = [];
    let activeTrayIdx = 0;
    let phase: 'memorize' | 'recall' | 'result' = 'memorize';
    let t0 = 0;
    let roundTimeout: any = null;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'memorize';
      
      const picked = shuffle(EMOJIS).slice(0, numItems);
      targetTrays = Array.from({length: numTrays}, () => []);
      
      // Distribute items randomly but ensure at least 1 per tray if possible
      picked.forEach((item, i) => {
        if (i < numTrays) targetTrays[i].push(item);
        else targetTrays[Math.floor(Math.random() * numTrays)].push(item);
      });
      
      currentTrays = Array.from({length: numTrays}, () => []);
      poolItems = shuffle([...picked]);
      activeTrayIdx = 0;

      renderMemorize();

      roundTimeout = setTimeout(() => {
        if (isGameOver) return;
        phase = 'recall';
        t0 = performance.now();
        renderRecall();
      }, showTime);
    };

    const renderMemorize = () => {
      traysEl.innerHTML = targetTrays.map((tray, i) => `
        <div class="ts-tray">
          ${tray.map(item => `<div class="ts-item">${item}</div>`).join('')}
        </div>
      `).join('');
      poolEl.innerHTML = '';
    };

    const renderRecall = () => {
      traysEl.innerHTML = currentTrays.map((tray, i) => `
        <div class="ts-tray ${i === activeTrayIdx ? 'active' : ''}" data-idx="${i}">
          ${tray.map((item, j) => `<div class="ts-item" data-tray="${i}" data-itemidx="${j}">${item}</div>`).join('')}
        </div>
      `).join('');
      
      poolEl.innerHTML = poolItems.map((item, i) => {
        const isPlaced = currentTrays.some(t => t.includes(item));
        return `<div class="ts-item ${isPlaced ? 'placed' : ''}" data-poolidx="${i}">${item}</div>`;
      }).join('');

      // Attach events
      Array.from(traysEl.querySelectorAll('.ts-tray')).forEach(el => {
        (el as HTMLElement).onclick = (e) => {
          if (phase !== 'recall') return;
          const target = e.target as HTMLElement;
          if (target.classList.contains('ts-item')) {
            const tIdx = parseInt(target.getAttribute('data-tray')!);
            const iIdx = parseInt(target.getAttribute('data-itemidx')!);
            currentTrays[tIdx].splice(iIdx, 1);
            renderRecall();
          } else {
            activeTrayIdx = parseInt((el as HTMLElement).getAttribute('data-idx')!);
            renderRecall();
          }
        };
      });

      Array.from(poolEl.querySelectorAll('.ts-item')).forEach(el => {
        (el as HTMLElement).onclick = () => {
          if (phase !== 'recall') return;
          if (el.classList.contains('placed')) return;
          const pIdx = parseInt(el.getAttribute('data-poolidx')!);
          const item = poolItems[pIdx];
          currentTrays[activeTrayIdx].push(item);
          checkDone();
          if (phase === 'recall') renderRecall();
        };
      });
    };

    const checkDone = () => {
      const placedCount = currentTrays.reduce((sum, t) => sum + t.length, 0);
      if (placedCount === numItems) {
        phase = 'result';
        rounds++;
        rts.push(performance.now() - t0);

        let isCorrect = true;
        for (let i = 0; i < numTrays; i++) {
          const targetSet = new Set(targetTrays[i]);
          const currentSet = new Set(currentTrays[i]);
          if (targetSet.size !== currentSet.size) isCorrect = false;
          for (let item of currentSet) {
            if (!targetSet.has(item)) isCorrect = false;
          }
        }

        if (isCorrect) {
          correct++;
          traysEl.style.color = 'var(--ok)';
        } else {
          traysEl.style.color = 'var(--danger)';
        }

        // Show correct briefly
        traysEl.innerHTML = targetTrays.map((tray) => `
          <div class="ts-tray">
            ${tray.map(item => `<div class="ts-item">${item}</div>`).join('')}
          </div>
        `).join('');
        poolEl.innerHTML = '';

        setTimeout(() => {
          if (isGameOver) return;
          traysEl.style.color = '';
          startRound();
        }, 1500);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(roundTimeout);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return endBlock;
  }
};

export default traySpanModule;
