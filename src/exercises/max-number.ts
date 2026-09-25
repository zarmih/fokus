import { ExerciseModule, BlockResult } from './contract';

const maxNumberModule: ExerciseModule = {
  manifest: {
    id: 'max-number',
    name: 'Максимальное число',
    domain: 'speed',
    skills: ['visual_scanning', 'numerical_processing'],
    metricModel: 'speed-accuracy',
    instruction: 'Среди всех чисел на экране как можно быстрее найдите и нажмите на НАИБОЛЬШЕЕ число.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mn-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
        }
        .mn-grid {
          display: grid;
          gap: 16px;
          width: 100%;
          max-width: 600px;
          margin: auto;
          justify-content: center;
          align-content: center;
        }
        .mn-item {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: 700;
          color: var(--text);
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          height: 80px;
          cursor: pointer;
          transition: transform 0.1s, background 0.2s, border-color 0.2s;
          user-select: none;
        }
        .mn-item:active {
          transform: scale(0.95);
        }
      </style>
      <div class="mn-container">
        <div class="mn-grid" id="mn-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#mn-grid') as HTMLElement;
    let t0 = performance.now();

    const getCount = () => {
      if (level < 2) return 4;
      if (level < 4) return 6;
      if (level < 7) return 9;
      return 12;
    };

    const getRange = () => {
      if (level < 3) return { min: 10, max: 99 };
      if (level < 6) return { min: 100, max: 499 };
      return { min: 100, max: 999 };
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      grid.innerHTML = '';
      const count = getCount();
      const { min, max } = getRange();
      
      const numbers = new Set<number>();
      while (numbers.size < count) {
        numbers.add(Math.floor(Math.random() * (max - min + 1)) + min);
      }
      
      const numsArray = Array.from(numbers);
      const maxNum = Math.max(...numsArray);

      numsArray.forEach((num) => {
        const item = document.createElement('div');
        item.className = 'mn-item';
        item.textContent = num.toString();
        
        item.onclick = () => {
          if (isGameOver) return;
          rounds++;
          rts.push(performance.now() - t0);
          
          if (num === maxNum) {
            correct++;
            item.style.background = 'var(--ok)';
            item.style.borderColor = 'var(--ok)';
            item.style.color = '#000';
          } else {
            item.style.background = 'var(--danger)';
            item.style.borderColor = 'var(--danger)';
            Array.from(grid.children).forEach((child: any) => {
              if (child.textContent === maxNum.toString()) {
                child.style.borderColor = 'var(--ok)';
                child.style.borderWidth = '4px';
              }
            });
          }
          
          Array.from(grid.children).forEach((child: any) => child.style.pointerEvents = 'none');
          setTimeout(startRound, 400);
        };
        
        grid.appendChild(item);
      });

      let cols = 2;
      if (count > 4) cols = 3;
      if (count > 9) cols = 4;
      grid.style.gridTemplateColumns = `repeat(${cols}, minmax(80px, 1fr))`;

      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default maxNumberModule;
