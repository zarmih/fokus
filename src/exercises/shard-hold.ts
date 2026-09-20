import { ExerciseModule, BlockResult } from './contract';

const shardHoldModule: ExerciseModule = {
  manifest: {
    id: 'shard-hold',
    name: 'Осколки',
    domain: 'memory',
    skills: ['spatial_memory', 'working_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните расположение осколков. Затем восстановите их позиции (порядок не важен).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let isGameOver = false;

    const gridSize = level > 5 ? 5 : (level > 2 ? 4 : 3);
    const span = Math.min(gridSize * gridSize - 2, 3 + Math.floor(level / 2));
    
    el.innerHTML = `
      <style>
        .sh-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .sh-grid {
          display: grid;
          gap: 8px;
          background: var(--line);
          padding: 8px;
          border-radius: 12px;
        }
        .sh-cell {
          width: 60px;
          height: 60px;
          background: var(--surface);
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.1s;
        }
        .sh-cell:active { transform: scale(0.95); }
        .sh-shard {
          width: 30px;
          height: 30px;
          background: var(--accent);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
        }
        .sh-status {
          font-size: 20px;
          font-weight: bold;
          min-height: 24px;
        }
      </style>
      <div class="sh-arena">
        <div class="sh-status" id="sh-status">Запоминайте...</div>
        <div class="sh-grid" id="sh-grid" style="grid-template-columns: repeat(${gridSize}, 1fr)">
          ${Array.from({length: gridSize * gridSize}).map((_, i) => `
            <div class="sh-cell" data-idx="${i}"></div>
          `).join('')}
        </div>
      </div>
    `;

    const gridEl = el.querySelector('#sh-grid') as HTMLElement;
    const statusEl = el.querySelector('#sh-status') as HTMLElement;
    const cells = Array.from(el.querySelectorAll('.sh-cell')) as HTMLElement[];

    let targetIndices: Set<number> = new Set();
    let selectedIndices: Set<number> = new Set();
    let phase: 'memo' | 'recall' = 'memo';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memo';
      statusEl.textContent = 'Запоминайте...';
      cells.forEach(c => c.innerHTML = '');
      targetIndices.clear();
      selectedIndices.clear();

      // Pick random indices
      while(targetIndices.size < span) {
        targetIndices.add(Math.floor(Math.random() * cells.length));
      }

      // Show shards
      targetIndices.forEach(idx => {
        cells[idx].innerHTML = '<div class="sh-shard"></div>';
      });

      setTimeout(() => {
        if (isGameOver) return;
        phase = 'recall';
        statusEl.textContent = 'Где были осколки?';
        cells.forEach(c => c.innerHTML = '');
      }, 1500);
    };

    const handleCellClick = (idx: number) => {
      if (phase !== 'recall' || isGameOver) return;
      
      if (selectedIndices.has(idx)) {
        selectedIndices.delete(idx);
        cells[idx].innerHTML = '';
      } else {
        selectedIndices.add(idx);
        cells[idx].innerHTML = '<div class="sh-shard" style="background: var(--text)"></div>';
      }

      if (selectedIndices.size === targetIndices.size) {
        checkResult();
      }
    };

    const checkResult = () => {
      phase = 'memo';
      rounds++;
      
      let isCorrect = true;
      selectedIndices.forEach(idx => {
        if (!targetIndices.has(idx)) isCorrect = false;
      });

      if (isCorrect) {
        correct++;
        statusEl.textContent = 'Верно!';
        statusEl.style.color = 'var(--ok)';
        cells.forEach((c, idx) => {
          if (targetIndices.has(idx)) {
             const shard = c.querySelector('.sh-shard') as HTMLElement;
             if (shard) shard.style.background = 'var(--ok)';
          }
        });
      } else {
        statusEl.textContent = 'Ошибка';
        statusEl.style.color = 'var(--danger)';
        cells.forEach((c, idx) => {
          if (targetIndices.has(idx)) {
             c.innerHTML = '<div class="sh-shard" style="background: var(--ok)"></div>';
          } else if (selectedIndices.has(idx)) {
             c.innerHTML = '<div class="sh-shard" style="background: var(--danger)"></div>';
          }
        });
      }

      setTimeout(() => {
        statusEl.style.color = 'var(--text)';
        startRound();
      }, 1000);
    };

    cells.forEach((c, idx) => {
      c.onclick = () => handleCellClick(idx);
    });

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      onEnd({ accuracy, avgRtMs: 0, rounds }); // memory task, speed is secondary
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default shardHoldModule;
