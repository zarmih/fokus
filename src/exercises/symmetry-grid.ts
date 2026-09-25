import { ExerciseModule, BlockResult } from './contract';

const symmetryGridModule: ExerciseModule = {
  manifest: {
    id: 'symmetry-grid',
    name: 'Отражение',
    domain: 'logic',
    skills: ['spatial_reasoning', 'pattern_recognition'],
    metricModel: 'logic-correctness',
    instruction: 'Нажимайте на клетки справа, чтобы создать точное зеркальное отражение узора слева.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    // level config
    const rows = level > 5 ? 6 : (level > 2 ? 5 : 4);
    const cols = level > 5 ? 4 : (level > 2 ? 3 : 2); // cols per half
    const numTiles = Math.min(2 + Math.floor(level / 2), Math.floor((rows * cols) / 2));

    el.innerHTML = `
      <style>
        .sg-arena {
          display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 24px; outline: none;
        }
        .sg-container {
          display: flex; gap: 12px; align-items: center;
          padding: 16px; background: var(--surface); border-radius: 12px;
          border: 2px solid var(--line);
        }
        .sg-half {
          display: grid; gap: 4px;
        }
        .sg-divider {
          width: 4px; height: 100%; background: var(--line); border-radius: 2px;
        }
        .sg-cell {
          width: 44px; height: 44px; background: var(--bg); border-radius: 6px;
          transition: background 0.15s, transform 0.1s;
        }
        .sg-cell.left.active {
          background: var(--primary);
        }
        .sg-cell.right {
          cursor: pointer;
        }
        .sg-cell.right:active {
          transform: scale(0.9);
        }
        .sg-cell.right.active {
          background: var(--accent);
        }
        .sg-cell.error {
          background: var(--danger) !important;
        }
        .sg-cell.success {
          background: var(--ok) !important;
        }
        @media (max-width: 400px) {
          .sg-cell { width: 36px; height: 36px; }
        }
      </style>
      <div class="sg-arena" id="sg-arena" tabindex="0">
        <div class="sg-container" id="sg-container">
          <div class="sg-half" id="sg-left"></div>
          <div class="sg-divider"></div>
          <div class="sg-half" id="sg-right"></div>
        </div>
      </div>
    `;

    const arena = el.querySelector('#sg-arena') as HTMLElement;
    const leftContainer = el.querySelector('#sg-left') as HTMLElement;
    const rightContainer = el.querySelector('#sg-right') as HTMLElement;

    leftContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    rightContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    let t0 = performance.now();
    let leftPattern = new Set<number>();
    let rightSelections = new Set<number>();
    let locked = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      locked = false;
      leftPattern.clear();
      rightSelections.clear();
      leftContainer.innerHTML = '';
      rightContainer.innerHTML = '';

      // generate random pattern
      const totalCells = rows * cols;
      while(leftPattern.size < numTiles) {
        leftPattern.add(Math.floor(Math.random() * totalCells));
      }

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const leftCell = document.createElement('div');
          leftCell.className = 'sg-cell left' + (leftPattern.has(i) ? ' active' : '');
          leftContainer.appendChild(leftCell);

          const rightCell = document.createElement('div');
          rightCell.className = 'sg-cell right';
          rightCell.dataset.index = String(r * cols + (cols - 1 - c)); // mirror index
          rightCell.onclick = () => handleRightClick(Number(rightCell.dataset.index), rightCell);
          rightContainer.appendChild(rightCell);
        }
      }
      
      arena.focus();
      t0 = performance.now();
    };

    const handleRightClick = (mirrorIndex: number, cellEl: HTMLElement) => {
      if (locked || isGameOver) return;
      
      if (rightSelections.has(mirrorIndex)) {
        rightSelections.delete(mirrorIndex);
        cellEl.classList.remove('active');
      } else {
        rightSelections.add(mirrorIndex);
        cellEl.classList.add('active');
      }

      if (rightSelections.size === numTiles) {
        checkResult();
      }
    };

    const checkResult = () => {
      locked = true;
      rounds++;
      rts.push(performance.now() - t0);
      
      let isCorrect = true;
      for (let selected of rightSelections) {
        if (!leftPattern.has(selected)) {
          isCorrect = false;
          break;
        }
      }

      const rightCells = rightContainer.querySelectorAll('.sg-cell');
      rightCells.forEach((cell: any) => {
        const idx = Number(cell.dataset.index);
        if (rightSelections.has(idx)) {
          if (leftPattern.has(idx)) {
            cell.classList.add('success');
          } else {
            cell.classList.add('error');
          }
        } else if (leftPattern.has(idx)) {
          // Missed cell
           cell.classList.add('error');
        }
      });

      if (isCorrect) correct++;

      setTimeout(() => {
        startRound();
      }, isCorrect ? 400 : 800);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default symmetryGridModule;
