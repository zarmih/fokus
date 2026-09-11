import { ExerciseModule, BlockResult } from './contract';

const rulePivotModule: ExerciseModule = {
  manifest: {
    id: 'rule-pivot',
    name: 'Поворот правила',
    domain: 'flexibility',
    skills: ['task_switching', 'rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте фигуру по указанному правилу (по цвету или по форме), используя стрелки ВЛЕВО и ВПРАВО.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .rp-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 30px;
        }
        .rp-rule {
          font-size: 28px;
          font-weight: bold;
          color: var(--text);
          text-transform: uppercase;
          padding: 8px 16px;
          background: var(--surface);
          border-radius: 8px;
          border: 2px solid var(--line);
        }
        .rp-card {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border-radius: 12px;
          border: 2px solid var(--line);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .rp-bins {
          display: flex;
          gap: 100px;
          width: 100%;
          justify-content: center;
        }
        .rp-bin {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: bold;
          color: var(--text-dim);
        }
        .rp-bin-card {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border-radius: 8px;
          border: 2px dashed var(--line);
        }
        .shape-circle {
          width: 60%;
          height: 60%;
          border-radius: 50%;
        }
        .shape-square {
          width: 60%;
          height: 60%;
        }
        .shape-triangle {
          width: 0;
          height: 0;
          border-left: 30px solid transparent;
          border-right: 30px solid transparent;
          border-bottom: 50px solid;
        }
      </style>
      <div class="rp-arena">
        <div class="rp-rule" id="rp-rule">ПРАВИЛО</div>
        <div class="rp-card" id="rp-card"></div>
        <div class="rp-bins">
          <div class="rp-bin">
            <div class="rp-bin-card" id="rp-bin-left"></div>
            <div>← ВЛЕВО</div>
          </div>
          <div class="rp-bin">
            <div class="rp-bin-card" id="rp-bin-right"></div>
            <div>ВПРАВО →</div>
          </div>
        </div>
      </div>
    `;

    const ruleEl = el.querySelector('#rp-rule') as HTMLElement;
    const cardEl = el.querySelector('#rp-card') as HTMLElement;
    const leftBinEl = el.querySelector('#rp-bin-left') as HTMLElement;
    const rightBinEl = el.querySelector('#rp-bin-right') as HTMLElement;

    const shapes = ['circle', 'square', 'triangle'];
    const colors = ['#f44336', '#2196f3', '#4caf50']; // red, blue, green

    let currentRule: 'color' | 'shape' = 'color';
    let targetShape = '';
    let targetColor = '';
    let leftShape = '', leftColor = '';
    let rightShape = '', rightColor = '';
    
    let phase = 'wait';
    let t0 = 0;

    const createShapeEl = (shape: string, color: string) => {
      const div = document.createElement('div');
      div.className = `shape-${shape}`;
      if (shape === 'triangle') {
        div.style.borderBottomColor = color;
      } else {
        div.style.backgroundColor = color;
      }
      return div;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      // Determine rule (mostly alternate, sometimes stick)
      if (Math.random() > 0.3) {
        currentRule = currentRule === 'color' ? 'shape' : 'color';
      }
      
      ruleEl.textContent = currentRule === 'color' ? 'ПО ЦВЕТУ' : 'ПО ФОРМЕ';
      
      // Pick 2 distinct bins
      const s1 = shapes[Math.floor(Math.random() * shapes.length)];
      const c1 = colors[Math.floor(Math.random() * colors.length)];
      
      let s2 = shapes[Math.floor(Math.random() * shapes.length)];
      while (s2 === s1) s2 = shapes[Math.floor(Math.random() * shapes.length)];
      
      let c2 = colors[Math.floor(Math.random() * colors.length)];
      while (c2 === c1) c2 = colors[Math.floor(Math.random() * colors.length)];
      
      leftShape = s1; leftColor = c1;
      rightShape = s2; rightColor = c2;
      
      leftBinEl.innerHTML = '';
      leftBinEl.appendChild(createShapeEl(leftShape, leftColor));
      
      rightBinEl.innerHTML = '';
      rightBinEl.appendChild(createShapeEl(rightShape, rightColor));
      
      // Target card logic
      // Should match one bin by rule
      const targetSide = Math.random() > 0.5 ? 'left' : 'right';
      
      if (currentRule === 'color') {
        targetColor = targetSide === 'left' ? leftColor : rightColor;
        // make shape not match the correct bin to force rule adherence
        targetShape = targetSide === 'left' ? rightShape : leftShape; 
      } else {
        targetShape = targetSide === 'left' ? leftShape : rightShape;
        targetColor = targetSide === 'left' ? rightColor : leftColor;
      }
      
      // Edge case if we somehow made them identical, avoid it but it's handled by setup
      cardEl.innerHTML = '';
      cardEl.appendChild(createShapeEl(targetShape, targetColor));
      
      t0 = performance.now();
    };

    const handleInput = (dir: 'left' | 'right') => {
      if (phase !== 'input') return;
      phase = 'result';
      
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;
      
      let isCorrect = false;
      if (currentRule === 'color') {
        if (dir === 'left' && targetColor === leftColor) isCorrect = true;
        if (dir === 'right' && targetColor === rightColor) isCorrect = true;
      } else {
        if (dir === 'left' && targetShape === leftShape) isCorrect = true;
        if (dir === 'right' && targetShape === rightShape) isCorrect = true;
      }
      
      if (isCorrect) {
        correct++;
        cardEl.style.borderColor = 'var(--ok)';
      } else {
        cardEl.style.borderColor = 'var(--danger)';
      }
      
      setTimeout(() => {
        cardEl.style.borderColor = 'var(--line)';
        startRound();
      }, 400);
    };

    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'input') return;
      if (e.code === 'ArrowLeft') handleInput('left');
      if (e.code === 'ArrowRight') handleInput('right');
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default rulePivotModule;
