import { ExerciseModule, BlockResult } from './contract';

const azNumberGridModule: ExerciseModule = {
  manifest: {
    id: 'az-number-grid',
    name: 'Сетка Чисел AZ',
    domain: 'attention',
    skills: ['visual_scanning', 'sustained_attention'] as any,
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте на числа по порядку, начиная с 1.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .az-ng-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
        }
        .az-ng-target {
          font-size: 24px;
          margin-bottom: 20px;
          font-weight: bold;
          color: var(--text);
        }
        .az-ng-grid {
          display: grid;
          gap: 10px;
        }
        .az-ng-cell {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
          background: rgba(255,255,255,0.1);
          border: 2px solid var(--line);
          border-radius: 8px;
          cursor: pointer;
          user-select: none;
          transition: background 0.2s, transform 0.1s;
        }
        .az-ng-cell:active {
          transform: scale(0.95);
        }
        .az-ng-cell.correct {
          background: var(--ok);
          color: #fff;
          border-color: var(--ok);
        }
        .az-ng-cell.error {
          background: var(--danger);
          color: #fff;
          border-color: var(--danger);
        }
      </style>
      <div class="az-ng-arena">
        <div class="az-ng-target" id="az-ng-target">Следующее: 1</div>
        <div class="az-ng-grid" id="az-ng-grid"></div>
      </div>
    `;

    const targetEl = el.querySelector('#az-ng-target') as HTMLElement;
    const gridEl = el.querySelector('#az-ng-grid') as HTMLElement;

    let targetNumber = 1;
    let maxNumber = 9 + Math.min(level, 5) * 3;
    let gridCols = Math.ceil(Math.sqrt(maxNumber));
    gridEl.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;

    let t0 = performance.now();

    const renderGrid = () => {
      let numbers = Array.from({length: maxNumber}, (_, i) => i + 1);
      numbers.sort(() => Math.random() - 0.5);

      gridEl.innerHTML = '';
      numbers.forEach(num => {
        const cell = document.createElement('div');
        cell.className = 'az-ng-cell';
        cell.textContent = num.toString();
        cell.onclick = () => handleCellClick(num, cell);
        gridEl.appendChild(cell);
      });
      t0 = performance.now();
    };

    const handleCellClick = (num: number, cell: HTMLElement) => {
      if (isGameOver || isTimeUp()) {
        if (!isGameOver) endBlock();
        return;
      }
      if (cell.classList.contains('correct')) return;

      rounds++;
      rts.push(performance.now() - t0);
      t0 = performance.now();

      if (num === targetNumber) {
        correct++;
        cell.classList.add('correct');
        targetNumber++;
        if (targetNumber > maxNumber) {
          setTimeout(() => {
            if (isGameOver) return;
            targetNumber = 1;
            renderGrid();
            targetEl.textContent = `Следующее: ${targetNumber}`;
          }, 300);
        } else {
          targetEl.textContent = `Следующее: ${targetNumber}`;
        }
      } else {
        cell.classList.add('error');
        setTimeout(() => cell.classList.remove('error'), 300);
      }
    };

    renderGrid();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default azNumberGridModule;
