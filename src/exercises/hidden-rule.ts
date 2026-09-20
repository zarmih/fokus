import { ExerciseModule, BlockResult } from './contract';

const hiddenRuleModule: ExerciseModule = {
  manifest: {
    id: 'hidden-rule',
    name: 'Скрытые правила',
    domain: 'flexibility',
    skills: ['rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте фигуру влево или вправо. Правило (цвет или форма) неизвестно и периодически меняется.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .hr-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .hr-target-container {
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hr-target {
          width: 80px;
          height: 80px;
        }
        .hr-bins {
          display: flex;
          gap: 60px;
        }
        .hr-bin {
          width: 120px;
          height: 80px;
          border-radius: 12px;
          border: 2px dashed var(--line, #555);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          color: var(--text-dim, #888);
          text-align: center;
          cursor: pointer;
          transition: transform 0.1s, background-color 0.2s, border-color 0.2s;
        }
        .hr-bin:active { transform: scale(0.95); }
      </style>
      <div class="hr-arena">
        <div class="hr-target-container">
          <div class="hr-target" id="hr-target"></div>
        </div>
        <div class="hr-bins">
          <div class="hr-bin" id="hr-bin-0">Синий<br/>или Круг</div>
          <div class="hr-bin" id="hr-bin-1">Желтый<br/>или Квадрат</div>
        </div>
      </div>
    `;

    const targetEl = el.querySelector('#hr-target') as HTMLElement;
    const bin0 = el.querySelector('#hr-bin-0') as HTMLElement;
    const bin1 = el.querySelector('#hr-bin-1') as HTMLElement;

    type Shape = 'circle' | 'square';
    type Color = 'blue' | 'yellow';
    type Rule = 'shape' | 'color';

    let currentRule: Rule = 'color';
    let currentShape: Shape = 'circle';
    let currentColor: Color = 'blue';
    let correctStreak = 0;
    
    let t0 = performance.now();
    let clickDisabled = false;

    const generateTarget = () => {
      currentShape = Math.random() > 0.5 ? 'circle' : 'square';
      currentColor = Math.random() > 0.5 ? 'blue' : 'yellow';

      targetEl.style.borderRadius = currentShape === 'circle' ? '50%' : '8px';
      targetEl.style.backgroundColor = currentColor === 'blue' ? '#2196f3' : '#ffeb3b';
      targetEl.style.display = 'block';
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      clickDisabled = false;
      bin0.style.backgroundColor = 'transparent';
      bin0.style.borderColor = 'var(--line, #555)';
      bin1.style.backgroundColor = 'transparent';
      bin1.style.borderColor = 'var(--line, #555)';

      // Switch rule based on level difficulty
      // Higher level = more frequent switches (every 3-5 correct vs 5-8 correct)
      const switchThreshold = Math.max(3, 8 - Math.floor(level / 3));
      
      if (correctStreak >= switchThreshold && Math.random() > 0.3) {
        currentRule = currentRule === 'color' ? 'shape' : 'color';
        correctStreak = 0; // reset streak after switch
      }

      generateTarget();
      t0 = performance.now();
    };

    const handleAns = (binIndex: number) => {
      if (isGameOver || clickDisabled) return;
      clickDisabled = true;
      rounds++;
      rts.push(performance.now() - t0);

      // Evaluate logic
      let expectedBin = 0; // left
      if (currentRule === 'color') {
        expectedBin = currentColor === 'blue' ? 0 : 1;
      } else {
        expectedBin = currentShape === 'circle' ? 0 : 1;
      }

      const chosenBin = binIndex === 0 ? bin0 : bin1;

      if (binIndex === expectedBin) {
        correct++;
        correctStreak++;
        chosenBin.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
        chosenBin.style.borderColor = 'var(--ok, #4caf50)';
        setTimeout(startRound, 300);
      } else {
        correctStreak = 0; // reset on error
        chosenBin.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
        chosenBin.style.borderColor = 'var(--danger, #f44336)';
        setTimeout(startRound, 800);
      }
    };

    bin0.onclick = () => handleAns(0);
    bin1.onclick = () => handleAns(1);

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

export default hiddenRuleModule;
