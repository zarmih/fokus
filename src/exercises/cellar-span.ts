import { ExerciseModule, BlockResult } from './contract';

const cellarSpanModule: ExerciseModule = {
  manifest: {
    id: 'cellar-span',
    name: 'Погреб',
    domain: 'memory',
    skills: ['working_memory', 'visual_memory'],
    metricModel: 'memory-span',
    instruction: 'Запоминайте, в какие ящики прячут запасы, и воспроизведите последовательность.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let isGameOver = false;
    
    // For memory-span, accuracy is less relevant than max span, but we follow standard BlockResult
    let span = Math.min(3 + Math.floor(level / 3), 9);
    
    el.innerHTML = `
      <style>
        .cellar-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .cellar-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }
        .cellar-box {
          width: 80px;
          height: 80px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .cellar-box:active {
          transform: scale(0.95);
        }
        .cellar-box.highlight {
          background: var(--primary);
          color: white;
        }
        .cellar-box.error {
          background: var(--danger);
          color: white;
        }
        .cellar-status {
          font-size: 24px;
          height: 30px;
          font-weight: bold;
        }
      </style>
      <div class="cellar-arena">
        <div class="cellar-status" id="cellar-status"></div>
        <div class="cellar-grid" id="cellar-grid">
          ${Array.from({length: 9}).map((_, i) => `<div class="cellar-box" data-idx="${i}">📦</div>`).join('')}
        </div>
      </div>
    `;

    const statusEl = el.querySelector('#cellar-status') as HTMLElement;
    const boxes = Array.from(el.querySelectorAll('.cellar-box')) as HTMLElement[];
    
    let sequence: number[] = [];
    let userIndex = 0;
    let phase = 'wait'; // wait, show, input

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'wait';
      statusEl.textContent = 'Запоминайте...';
      sequence = [];
      userIndex = 0;
      
      for (let i = 0; i < span; i++) {
        sequence.push(Math.floor(Math.random() * 9));
      }

      let step = 0;
      const showNext = () => {
        if (isGameOver) return;
        if (step >= sequence.length) {
          phase = 'input';
          statusEl.textContent = 'Повторите!';
          return;
        }
        const idx = sequence[step];
        const box = boxes[idx];
        box.classList.add('highlight');
        box.textContent = '🍎';
        
        setTimeout(() => {
          if (isGameOver) return;
          box.classList.remove('highlight');
          box.textContent = '📦';
          step++;
          setTimeout(showNext, 300);
        }, 600);
      };

      setTimeout(showNext, 1000);
    };

    boxes.forEach(box => {
      box.onclick = () => {
        if (phase !== 'input' || isGameOver) return;
        
        const idx = parseInt(box.dataset.idx || '0', 10);
        if (idx === sequence[userIndex]) {
          // correct step
          box.classList.add('highlight');
          box.textContent = '🍎';
          setTimeout(() => {
            box.classList.remove('highlight');
            box.textContent = '📦';
          }, 300);
          
          userIndex++;
          if (userIndex >= sequence.length) {
            phase = 'wait';
            statusEl.textContent = 'Верно!';
            rounds++;
            correct++;
            span++;
            setTimeout(startRound, 1000);
          }
        } else {
          // wrong step
          phase = 'wait';
          statusEl.textContent = 'Ошибка!';
          box.classList.add('error');
          setTimeout(() => {
            box.classList.remove('error');
            rounds++;
            span = Math.max(3, span - 1);
            startRound();
          }, 1000);
        }
      };
    });

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      onEnd({ accuracy, avgRtMs: 0, rounds }); // rt is not strictly tracked in memory-span typically, or we can use 0
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default cellarSpanModule;
