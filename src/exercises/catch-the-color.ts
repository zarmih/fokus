import { ExerciseModule, BlockResult } from './contract';

const catchTheColorModule: ExerciseModule = {
  manifest: {
    id: 'catch-the-color',
    name: 'Цветолов',
    domain: 'speed',
    skills: ['reaction_speed', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Кликайте ТОЛЬКО на объекты заданного цвета. Другие игнорируйте.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let falseAlarms = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const colors = [
      { id: 'red', val: '#ef4444' },
      { id: 'blue', val: '#3b82f6' },
      { id: 'green', val: '#10b981' },
      { id: 'yellow', val: '#eab308' }
    ];

    el.innerHTML = `
      <style>
        .cc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .cc-target {
          font-size: 20px;
          font-weight: 600;
        }
        .cc-obj {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: transparent;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .cc-obj:active { transform: scale(0.9); }
      </style>
      <div class="cc-arena">
        <div class="cc-target" id="cc-target"></div>
        <div class="cc-obj" id="cc-obj"></div>
      </div>
    `;

    const targetEl = el.querySelector('#cc-target') as HTMLElement;
    const objEl = el.querySelector('#cc-obj') as HTMLElement;
    
    let currentTargetColor = colors[0];
    let isObjVisible = false;
    let isTargetObj = false;
    let t0 = performance.now();
    let timeoutId: any;

    const changeTarget = () => {
      currentTargetColor = colors[Math.floor(Math.random() * colors.length)];
      targetEl.innerHTML = `Цель: <span style="color:${currentTargetColor.val}">⬤</span>`;
    };

    const hideObj = () => {
      if (isGameOver) return;
      isObjVisible = false;
      objEl.style.background = 'transparent';
      
      if (isTargetObj) {
        // Missed target
        rounds++;
        rts.push(1000); // penalty time
      }
      
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      timeoutId = setTimeout(showObj, 500 + Math.random() * 1000);
    };

    const showObj = () => {
      if (isGameOver) return;
      
      if (Math.random() < 0.2) changeTarget();

      isTargetObj = Math.random() > 0.5;
      const c = isTargetObj ? currentTargetColor : colors.filter(x => x.id !== currentTargetColor.id)[Math.floor(Math.random()*(colors.length-1))];
      
      objEl.style.background = c.val;
      isObjVisible = true;
      t0 = performance.now();

      // Time it stays visible depends on level
      const visibleMs = Math.max(400, 1000 - level * 100);
      timeoutId = setTimeout(hideObj, visibleMs);
    };

    objEl.onclick = () => {
      if (!isObjVisible || isGameOver) return;
      clearTimeout(timeoutId);
      rounds++;
      
      if (isTargetObj) {
        correct++;
        rts.push(performance.now() - t0);
      } else {
        falseAlarms++;
        rts.push(performance.now() - t0);
      }
      
      isObjVisible = false;
      objEl.style.background = 'transparent';
      
      if (isTimeUp()) {
        endBlock();
      } else {
        timeoutId = setTimeout(showObj, 500 + Math.random() * 800);
      }
    };

    changeTarget();
    timeoutId = setTimeout(showObj, 1000);

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeoutId);
      const totalEvents = rounds + falseAlarms;
      const accuracy = totalEvents > 0 ? Math.max(0, correct - falseAlarms) / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds: correct });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeoutId);
    };
  }
};

export default catchTheColorModule;
