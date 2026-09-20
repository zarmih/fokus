import { ExerciseModule, BlockResult } from './contract';

const pouchSpanModule: ExerciseModule = {
  manifest: {
    id: 'pouch-span',
    name: 'Мешочки',
    domain: 'memory',
    skills: ['working_memory', 'spatial_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните, в каком мешочке спрятан каждый предмет. Затем найдите мешочек с заданным предметом.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let timeoutId: any;

    el.innerHTML = `
      <style>
        .ps-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 30px;
          background: #1e1b4b;
          color: white;
          font-family: sans-serif;
        }
        .ps-target-area {
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: bold;
        }
        .ps-target-item {
          font-size: 48px;
          margin-left: 15px;
          color: #fbbf24;
        }
        .ps-pouches {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 600px;
        }
        .ps-pouch-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .ps-item-slot {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          transition: opacity 0.3s;
        }
        .ps-pouch {
          width: 80px;
          height: 80px;
          background: #6366f1;
          border-radius: 20px 20px 40px 40px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
          transition: transform 0.2s, background 0.2s;
        }
        .ps-pouch.interactive:hover {
          transform: translateY(-5px);
          background: #4f46e5;
        }
        .ps-pouch.interactive:active {
          transform: translateY(2px);
        }
        .ps-pouch.correct {
          background: #10b981 !important;
        }
        .ps-pouch.wrong {
          background: #ef4444 !important;
        }
      </style>
      <div class="ps-arena">
        <div class="ps-target-area" id="ps-target-area"></div>
        <div class="ps-pouches" id="ps-pouches"></div>
      </div>
    `;

    const targetArea = el.querySelector('#ps-target-area') as HTMLElement;
    const pouchesArea = el.querySelector('#ps-pouches') as HTMLElement;

    const itemsPool = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'];
    
    let currentItems: string[] = [];
    let currentTargetIndex: number = -1;
    let phase = 'idle'; // idle, memorize, recall, result
    let t0 = 0;
    
    // Level scaling: 3 pouches at level 1, up to 6 pouches
    const numPouches = Math.min(6, 3 + Math.floor(level / 3));
    // Memorize time decreases with level
    const memorizeTime = Math.max(1500, 4000 - level * 300);

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      
      // Select random unique items
      const shuffledPool = [...itemsPool].sort(() => Math.random() - 0.5);
      currentItems = shuffledPool.slice(0, numPouches);
      currentTargetIndex = Math.floor(Math.random() * numPouches);

      targetArea.innerHTML = 'Запомните содержимое';
      renderPouches(true);

      timeoutId = setTimeout(() => {
        phase = 'recall';
        targetArea.innerHTML = `Где спрятан: <span class="ps-target-item">${currentItems[currentTargetIndex]}</span>`;
        renderPouches(false);
        t0 = performance.now();
      }, memorizeTime);
    };

    const renderPouches = (showItems: boolean) => {
      pouchesArea.innerHTML = '';
      for (let i = 0; i < numPouches; i++) {
        const container = document.createElement('div');
        container.className = 'ps-pouch-container';

        const slot = document.createElement('div');
        slot.className = 'ps-item-slot';
        slot.innerHTML = showItems ? currentItems[i] : '';
        slot.style.opacity = showItems ? '1' : '0';

        const pouch = document.createElement('div');
        pouch.className = `ps-pouch ${!showItems ? 'interactive' : ''}`;
        pouch.innerHTML = '💼';

        if (!showItems) {
          pouch.onclick = () => handlePouchClick(i, pouch, slot);
        }

        container.appendChild(slot);
        container.appendChild(pouch);
        pouchesArea.appendChild(container);
      }
    };

    const handlePouchClick = (index: number, pouchEl: HTMLElement, slotEl: HTMLElement) => {
      if (phase !== 'recall') return;
      phase = 'result';
      
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;

      const isCorrect = index === currentTargetIndex;
      
      if (isCorrect) {
        correct++;
        pouchEl.classList.add('correct');
      } else {
        pouchEl.classList.add('wrong');
        // highlight correct one
        const allPouches = pouchesArea.querySelectorAll('.ps-pouch');
        if (allPouches[currentTargetIndex]) {
          allPouches[currentTargetIndex].classList.add('correct');
        }
      }

      // Show all items again
      const slots = pouchesArea.querySelectorAll('.ps-item-slot');
      slots.forEach((s, i) => {
        (s as HTMLElement).innerHTML = currentItems[i];
        (s as HTMLElement).style.opacity = '1';
      });

      timeoutId = setTimeout(startRound, 1200);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds: correct });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default pouchSpanModule;
