import { ExerciseModule, BlockResult } from './contract';

const ayShapeShiftModule: ExerciseModule = {
  manifest: {
    id: 'ay-shape-shift',
    name: 'Сдвиг форм',
    domain: 'attention',
    skills: ['pattern_recognition', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Если фигуры ОДИНАКОВЫЕ — жмите "Одинаковые". Если РАЗНЫЕ — "Разные".'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ss-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          gap: 2rem;
        }
        .ss-shapes {
          display: flex;
          gap: 2rem;
        }
        .ss-shape {
          width: 100px;
          height: 100px;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .ss-shape svg {
          width: 80px;
          height: 80px;
          fill: #3b82f6;
        }
        .ss-controls {
          display: flex;
          gap: 1rem;
        }
        .ss-btn {
          padding: 1rem 2rem;
          font-size: 1.2rem;
          border: none;
          border-radius: 8px;
          background: #cbd5e1;
          cursor: pointer;
          transition: background 0.1s;
        }
        .ss-btn:hover {
          background: #94a3b8;
        }
      </style>
      <div class="ss-arena">
        <div class="ss-shapes">
          <div class="ss-shape" id="ss-left"></div>
          <div class="ss-shape" id="ss-right"></div>
        </div>
        <div class="ss-controls">
          <button class="ss-btn" id="ss-btn-same">Одинаковые</button>
          <button class="ss-btn" id="ss-btn-diff">Разные</button>
        </div>
      </div>
    `;

    const leftShape = el.querySelector('#ss-left') as HTMLElement;
    const rightShape = el.querySelector('#ss-right') as HTMLElement;
    const btnSame = el.querySelector('#ss-btn-same') as HTMLElement;
    const btnDiff = el.querySelector('#ss-btn-diff') as HTMLElement;

    const shapes = [
      '<circle cx="40" cy="40" r="35"/>',
      '<rect x="10" y="10" width="60" height="60"/>',
      '<polygon points="40,5 75,70 5,70"/>',
      '<polygon points="40,10 70,40 40,70 10,40"/>'
    ];

    let t0 = 0;
    let isMatch = false;

    const renderRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      isMatch = Math.random() > 0.5;
      const s1 = Math.floor(Math.random() * shapes.length);
      let s2 = s1;
      
      if (!isMatch) {
        while (s2 === s1) {
          s2 = Math.floor(Math.random() * shapes.length);
        }
      }

      leftShape.innerHTML = `<svg viewBox="0 0 80 80">${shapes[s1]}</svg>`;
      rightShape.innerHTML = `<svg viewBox="0 0 80 80">${shapes[s2]}</svg>`;
      
      t0 = performance.now();
    };

    const handleAnswer = (userSaidSame: boolean) => {
      if (isGameOver) return;
      
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;
      
      if (userSaidSame === isMatch) {
        correct++;
      }
      
      renderRound();
    };

    btnSame.onclick = () => handleAnswer(true);
    btnDiff.onclick = () => handleAnswer(false);

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

export default ayShapeShiftModule;
