import { ExerciseModule, BlockResult } from './contract';

const memoryHoneycombModule: ExerciseModule = {
  manifest: {
    id: 'memory-honeycomb',
    name: 'Соты Памяти',
    domain: 'memory',
    skills: ['spatial_memory', 'visual_memory'],
    metricModel: 'capacity',
    instruction: 'Запомните подсвеченные соты и воспроизведите их расположение.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let currentLevel = level;

    el.innerHTML = `
      <style>
        .mh-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 2rem;
        }
        .mh-grid {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .mh-row {
          display: flex;
          gap: 4px;
        }
        .mh-hex {
          width: 60px;
          height: 69.28px;
          background-color: rgba(255, 255, 255, 0.05);
          clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .mh-row:nth-child(even) {
          transform: translateX(32px); /* offset by half width + gap */
        }
        .mh-hex.active {
          background-color: #fcd34d;
          box-shadow: 0 0 20px rgba(252, 211, 77, 0.5);
          z-index: 10;
        }
        .mh-hex.selected {
          background-color: #60a5fa;
        }
        .mh-hex.correct {
          background-color: #34d399;
        }
        .mh-hex.wrong {
          background-color: #f87171;
        }
      </style>
      <div class="mh-arena">
        <div class="mh-grid" id="mh-grid"></div>
      </div>
    `;

    const gridEl = el.querySelector('#mh-grid') as HTMLElement;
    
    const hexLayout = [
      [1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1],
      [1, 1, 1]
    ];

    let hexElements: HTMLElement[] = [];
    let idCounter = 0;

    hexLayout.forEach((row, rowIndex) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'mh-row';
      // Adjust offset for correct honeycomb interleaving
      if (rowIndex % 2 !== 0) {
        rowEl.style.transform = 'translateX(0)';
      } else {
        rowEl.style.transform = 'translateX(32px)';
      }
      
      row.forEach(isVisible => {
        const hex = document.createElement('div');
        hex.className = 'mh-hex';
        hex.dataset.id = (idCounter++).toString();
        rowEl.appendChild(hex);
        hexElements.push(hex);
      });
      gridEl.appendChild(rowEl);
    });

    let targetIds: number[] = [];
    let selectedIds: number[] = [];
    let isAcceptingInput = false;
    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      isAcceptingInput = false;
      selectedIds = [];
      hexElements.forEach(h => h.className = 'mh-hex');

      const numTargets = Math.min(3 + Math.floor(currentLevel * 0.5), hexElements.length - 2);
      
      const shuffled = [...hexElements].sort(() => Math.random() - 0.5);
      const targets = shuffled.slice(0, numTargets);
      targetIds = targets.map(t => parseInt(t.dataset.id!, 10));

      // Show sequence (simultaneous for capacity)
      targets.forEach(t => t.classList.add('active'));

      setTimeout(() => {
        if (isGameOver) return;
        targets.forEach(t => t.classList.remove('active'));
        isAcceptingInput = true;
        t0 = performance.now();
      }, 1500);
    };

    hexElements.forEach(hex => {
      hex.addEventListener('click', () => {
        if (!isAcceptingInput || isGameOver) return;
        const id = parseInt(hex.dataset.id!, 10);
        if (selectedIds.includes(id)) return;

        selectedIds.push(id);
        hex.classList.add('selected');

        if (selectedIds.length === targetIds.length) {
          isAcceptingInput = false;
          checkResult();
        }
      });
    });

    const checkResult = () => {
      rts.push(performance.now() - t0);
      rounds++;

      const isWin = targetIds.every(tid => selectedIds.includes(tid));
      
      hexElements.forEach(hex => {
        const id = parseInt(hex.dataset.id!, 10);
        if (targetIds.includes(id) && selectedIds.includes(id)) {
          hex.classList.add('correct');
        } else if (!targetIds.includes(id) && selectedIds.includes(id)) {
          hex.classList.add('wrong');
        } else if (targetIds.includes(id) && !selectedIds.includes(id)) {
          hex.classList.add('active'); // missed
        }
      });

      if (isWin) {
        correct++;
        currentLevel += 0.5;
      } else {
        currentLevel = Math.max(1, currentLevel - 1);
      }

      setTimeout(() => {
        if (!isGameOver) startRound();
      }, 1000);
    };

    // Start with a small delay
    setTimeout(startRound, 500);

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default memoryHoneycombModule;
