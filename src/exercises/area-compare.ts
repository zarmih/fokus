import { ExerciseModule, BlockResult } from './contract';

const areaCompareModule: ExerciseModule = {
  manifest: {
    id: 'area-compare',
    name: 'Сравнение площадей',
    domain: 'logic',
    skills: ['spatial_reasoning', 'estimation'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажмите на фигуру, площадь которой больше.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ac-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .ac-board {
          display: flex;
          gap: 40px;
          align-items: center;
          justify-content: center;
        }
        .ac-option {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 150px;
          height: 150px;
          border-radius: 16px;
          cursor: pointer;
          border: 2px solid transparent;
          background: var(--surface-2, #2a2a2a);
          transition: transform 0.1s, border 0.2s;
        }
        .ac-option:active { transform: scale(0.95); }
        .ac-shape {
          background-color: var(--primary, #4caf50);
          transition: width 0.3s, height 0.3s;
        }
      </style>
      <div class="ac-arena">
        <div class="ac-board" id="ac-board">
          <div class="ac-option" id="ac-opt-0">
            <div class="ac-shape" id="ac-shape-0"></div>
          </div>
          <div class="ac-option" id="ac-opt-1">
            <div class="ac-shape" id="ac-shape-1"></div>
          </div>
        </div>
      </div>
    `;

    const opt0 = el.querySelector('#ac-opt-0') as HTMLElement;
    const opt1 = el.querySelector('#ac-opt-1') as HTMLElement;
    const shape0 = el.querySelector('#ac-shape-0') as HTMLElement;
    const shape1 = el.querySelector('#ac-shape-1') as HTMLElement;

    let t0 = performance.now();
    let largerIndex = -1;
    let clickDisabled = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      clickDisabled = false;
      opt0.style.borderColor = 'transparent';
      opt1.style.borderColor = 'transparent';

      // Difficulty logic: higher level = smaller area ratio difference
      // Minimum difference ratio starts at 1.5 and goes down to 1.05
      const diffRatio = Math.max(1.05, 1.5 - level * 0.05);

      const baseWidth = 40 + Math.random() * 40;
      const baseHeight = 40 + Math.random() * 40;
      const baseArea = baseWidth * baseHeight;

      const targetArea = baseArea * diffRatio;
      
      // Target shape dimensions (we randomize its aspect ratio to make it tricky)
      const targetWidth = 40 + Math.random() * 40;
      const targetHeight = targetArea / targetWidth;

      const shapes = [
        { w: baseWidth, h: baseHeight, area: baseArea },
        { w: targetWidth, h: targetHeight, area: targetArea }
      ];

      // Shuffle
      if (Math.random() > 0.5) {
        shapes.reverse();
      }

      largerIndex = shapes[0].area > shapes[1].area ? 0 : 1;

      // Sometimes make them circles instead of rectangles to vary estimation
      const isCircle = Math.random() > 0.5;
      
      shape0.style.width = `${shapes[0].w}px`;
      shape0.style.height = `${shapes[0].h}px`;
      shape0.style.borderRadius = isCircle ? '50%' : '8px';

      shape1.style.width = `${shapes[1].w}px`;
      shape1.style.height = `${shapes[1].h}px`;
      shape1.style.borderRadius = isCircle ? '50%' : '8px';

      t0 = performance.now();
    };

    const handleAns = (idx: number) => {
      if (isGameOver || clickDisabled) return;
      clickDisabled = true;
      rounds++;
      rts.push(performance.now() - t0);

      const chosenOpt = idx === 0 ? opt0 : opt1;
      const otherOpt = idx === 0 ? opt1 : opt0;

      if (idx === largerIndex) {
        correct++;
        chosenOpt.style.borderColor = 'var(--ok, #4caf50)';
        setTimeout(startRound, 300);
      } else {
        chosenOpt.style.borderColor = 'var(--danger, #f44336)';
        const correctOpt = largerIndex === 0 ? opt0 : opt1;
        correctOpt.style.borderColor = 'var(--ok, #4caf50)';
        setTimeout(startRound, 800);
      }
    };

    opt0.onclick = () => handleAns(0);
    opt1.onclick = () => handleAns(1);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default areaCompareModule;
