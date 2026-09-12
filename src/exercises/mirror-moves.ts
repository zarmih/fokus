import { ExerciseModule, BlockResult } from './contract';

const mirrorMovesModule: ExerciseModule = {
  manifest: {
    id: 'mirror-moves',
    name: 'Зеркальные Шаги',
    domain: 'speed',
    skills: ['reaction_speed', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Стрелка указывает направление. Если стрелка СИНЯЯ — нажмите туда же. Если КРАСНАЯ — нажмите в противоположную сторону.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .mm-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 40px; font-family: sans-serif; }
        .mm-arrow { font-size: 80px; font-weight: bold; display: flex; align-items: center; justify-content: center; transition: color 0.2s; }
        .mm-arrow.rule-same { color: #3b82f6; }
        .mm-arrow.rule-mirror { color: #ef4444; }
        .mm-controls { display: grid; grid-template-columns: 60px 60px 60px; grid-template-rows: 60px 60px 60px; gap: 10px; }
        .mm-btn { font-size: 24px; border: 2px solid #ccc; background: #fff; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .mm-btn:active { transform: scale(0.9); }
        .mm-btn.up { grid-column: 2; grid-row: 1; }
        .mm-btn.left { grid-column: 1; grid-row: 2; }
        .mm-btn.right { grid-column: 3; grid-row: 2; }
        .mm-btn.down { grid-column: 2; grid-row: 3; }
      </style>
      <div class="mm-arena">
        <div class="mm-arrow" id="mm-arrow"></div>
        <div class="mm-controls">
          <button class="mm-btn up" id="btn-up">↑</button>
          <button class="mm-btn left" id="btn-left">←</button>
          <button class="mm-btn right" id="btn-right">→</button>
          <button class="mm-btn down" id="btn-down">↓</button>
        </div>
      </div>
    `;

    const arrowEl = el.querySelector('#mm-arrow') as HTMLElement;
    
    const dirs = ['up', 'right', 'down', 'left'];
    const arrows: Record<string, string> = { 'up': '↑', 'right': '→', 'down': '↓', 'left': '←' };
    
    let currentAns = '';
    let t0 = performance.now();
    let rule = 'same';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      rule = Math.random() > 0.5 ? 'same' : 'mirror';
      arrowEl.className = `mm-arrow rule-${rule}`;

      const dirIdx = Math.floor(Math.random() * 4);
      const dir = dirs[dirIdx];
      arrowEl.textContent = arrows[dir];

      if (rule === 'same') {
        currentAns = dir;
      } else {
        currentAns = dirs[(dirIdx + 2) % 4];
      }

      t0 = performance.now();
    };

    const handleAns = (ans: string) => {
      if (isGameOver) return;
      rounds++;
      if (ans === currentAns) correct++;
      rts.push(performance.now() - t0);
      startRound();
    };

    (el.querySelector('#btn-up') as HTMLElement).onclick = () => handleAns('up');
    (el.querySelector('#btn-left') as HTMLElement).onclick = () => handleAns('left');
    (el.querySelector('#btn-right') as HTMLElement).onclick = () => handleAns('right');
    (el.querySelector('#btn-down') as HTMLElement).onclick = () => handleAns('down');

    startRound();

    const endBlock = () => {
      isGameOver = true;
      onEnd({
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000,
        rounds
      });
    };

    return () => { isGameOver = true; };
  }
};
export default mirrorMovesModule;
