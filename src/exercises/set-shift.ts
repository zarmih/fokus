import { ExerciseModule, BlockResult } from './contract';

export default {
  manifest: {
    id: 'set-shift',
    name: 'Смена установки',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Классифицируйте центральную фигуру по указанному правилу (ЦВЕТ или ФОРМА), выбирая левый или правый вариант. Правило будет меняться!',
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let errors = 0;
    let totalRt = 0;
    let isDestroyed = false;
    let currentRule: 'ЦВЕТ' | 'ФОРМА' = 'ЦВЕТ';
    let consecutiveSameRule = 0;
    
    // Bins (reference cards)
    const leftBin = { color: 'var(--error)', shape: 'square' }; // Red Square
    const rightBin = { color: 'var(--primary)', shape: 'circle' }; // Blue Circle

    // Target cards to present (mixed matches)
    const targets = [
      { color: 'var(--error)', shape: 'circle' }, // Matches left on color, right on shape
      { color: 'var(--primary)', shape: 'square' } // Matches right on color, left on shape
    ];

    const runRound = () => {
      if (isDestroyed) return;
      if (isTimeUp()) {
        const acc = rounds === 0 ? 0 : Math.max(0, 1 - errors / rounds);
        onEnd({ accuracy: acc, avgRtMs: rounds > 0 ? totalRt / rounds : 0, rounds });
        return;
      }

      el.innerHTML = '';

      // Determine rule change
      const shiftChance = consecutiveSameRule > 2 ? 0.3 + (consecutiveSameRule * 0.1) : 0;
      let ruleChanged = false;
      if (Math.random() < shiftChance) {
        currentRule = currentRule === 'ЦВЕТ' ? 'ФОРМА' : 'ЦВЕТ';
        consecutiveSameRule = 0;
        ruleChanged = true;
      } else {
        consecutiveSameRule++;
      }

      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.height = '100%';
      container.style.gap = '40px';
      el.appendChild(container);

      const ruleEl = document.createElement('div');
      ruleEl.textContent = currentRule;
      ruleEl.style.fontSize = '32px';
      ruleEl.style.fontWeight = 'bold';
      ruleEl.style.padding = '10px 30px';
      ruleEl.style.borderRadius = '8px';
      ruleEl.style.backgroundColor = ruleChanged ? 'var(--text)' : 'transparent';
      ruleEl.style.color = ruleChanged ? 'var(--bg)' : 'var(--text)';
      ruleEl.style.transition = 'all 0.3s';
      container.appendChild(ruleEl);

      const target = targets[Math.floor(Math.random() * targets.length)];

      const createShape = (color: string, shape: string, size: string) => {
        const div = document.createElement('div');
        div.style.width = size;
        div.style.height = size;
        div.style.backgroundColor = color;
        div.style.borderRadius = shape === 'circle' ? '50%' : '8px';
        return div;
      };

      const targetContainer = document.createElement('div');
      targetContainer.style.display = 'flex';
      targetContainer.style.justifyContent = 'center';
      targetContainer.style.alignItems = 'center';
      targetContainer.style.height = '120px';
      targetContainer.appendChild(createShape(target.color, target.shape, '100px'));
      container.appendChild(targetContainer);

      const binsContainer = document.createElement('div');
      binsContainer.style.display = 'flex';
      binsContainer.style.gap = '60px';
      binsContainer.style.marginTop = '20px';
      container.appendChild(binsContainer);

      const startTime = Date.now();

      const createBin = (bin: { color: string, shape: string }, isLeft: boolean) => {
        const binWrapper = document.createElement('div');
        binWrapper.style.display = 'flex';
        binWrapper.style.flexDirection = 'column';
        binWrapper.style.alignItems = 'center';
        binWrapper.style.gap = '10px';
        binWrapper.style.cursor = 'pointer';
        binWrapper.style.padding = '20px';
        binWrapper.style.border = '2px solid var(--border)';
        binWrapper.style.borderRadius = '12px';
        binWrapper.style.transition = 'background-color 0.2s';
        
        binWrapper.appendChild(createShape(bin.color, bin.shape, '60px'));
        
        binWrapper.onclick = () => {
          if (isDestroyed) return;
          const rt = Date.now() - startTime;
          totalRt += rt;
          rounds++;
          
          let correct = false;
          if (currentRule === 'ЦВЕТ') {
            correct = target.color === bin.color;
          } else {
            correct = target.shape === bin.shape;
          }

          if (!correct) {
            errors++;
            binWrapper.style.backgroundColor = 'var(--error)';
            setTimeout(runRound, 400);
          } else {
            binWrapper.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
            setTimeout(runRound, 150);
          }
        };
        
        return binWrapper;
      };

      binsContainer.appendChild(createBin(leftBin, true));
      binsContainer.appendChild(createBin(rightBin, false));
    };

    runRound();

    return () => {
      isDestroyed = true;
    };
  }
} as ExerciseModule;
