import { ExerciseModule, BlockResult } from './contract';

const ayNumberGridModule: ExerciseModule = {
  manifest: {
    id: 'ay-number-grid',
    name: 'Числовая сетка',
    domain: 'speed',
    skills: ['visual_scanning', 'numerical_processing'],
    metricModel: 'speed-accuracy',
    instruction: 'Среди 4 чисел найдите и нажмите на САМОЕ БОЛЬШОЕ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ng-arena {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          width: 300px;
          margin: 0 auto;
          align-content: center;
          height: 100%;
        }
        .ng-btn {
          padding: 2rem;
          font-size: 2rem;
          border: none;
          border-radius: 12px;
          background: #e2e8f0;
          cursor: pointer;
          transition: background 0.1s;
        }
        .ng-btn:hover {
          background: #cbd5e1;
        }
      </style>
      <div class="ng-arena" id="ng-arena">
        <button class="ng-btn"></button>
        <button class="ng-btn"></button>
        <button class="ng-btn"></button>
        <button class="ng-btn"></button>
      </div>
    `;

    const btns = Array.from(el.querySelectorAll('.ng-btn')) as HTMLButtonElement[];
    let t0 = 0;
    let targetIndex = 0;

    const renderRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      // Generate 4 unique random numbers
      const nums = new Set<number>();
      while(nums.size < 4) {
        nums.add(Math.floor(Math.random() * 90) + 10);
      }
      const numArr = Array.from(nums);
      
      const maxVal = Math.max(...numArr);
      targetIndex = numArr.indexOf(maxVal);

      btns.forEach((btn, idx) => {
        btn.textContent = numArr[idx].toString();
        btn.onclick = () => handleAnswer(idx);
      });

      t0 = performance.now();
    };

    const handleAnswer = (idx: number) => {
      if (isGameOver) return;
      
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;
      
      if (idx === targetIndex) {
        correct++;
      } else {
        rts.push(rt + 1000); // penalty
      }
      
      renderRound();
    };

    renderRound();

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

export default ayNumberGridModule;
