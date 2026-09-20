import { ExerciseModule, BlockResult } from './contract';

const tokenWarpModule: ExerciseModule = {
  manifest: {
    id: 'token-warp',
    name: 'Сдвиг жетона',
    domain: 'flexibility',
    skills: ['rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте фигуры по текущему правилу (Цвет или Форма). Внимание: правило может внезапно измениться!'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let rts: number[] = [];
    let t0 = performance.now();
    
    const colors = ['red', 'green', 'blue'];
    const shapes = ['circle', 'square', 'triangle'];
    let roundsSinceWarp = 0;
    let warpInterval = Math.max(2, 6 - Math.floor(level / 3)); 
    
    let currentRule: 'color' | 'shape' = Math.random() > 0.5 ? 'color' : 'shape';
    let currentToken = { color: 'red', shape: 'square' };

    el.innerHTML = `
      <style>
        .tw-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 20px 0;
        }
        .tw-rule {
          font-size: 24px;
          font-weight: bold;
          padding: 10px 20px;
          border-radius: 8px;
          background: rgba(255,255,255,0.1);
          text-transform: uppercase;
          transition: background 0.3s;
        }
        .tw-rule.warp {
          background: var(--accent, #2196F3);
          animation: shake 0.4s;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
        .tw-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tw-token {
          width: 80px;
          height: 80px;
          transition: transform 0.2s;
        }
        .tw-token.shape-circle { border-radius: 50%; }
        .tw-token.shape-square { border-radius: 12px; }
        .tw-token.shape-triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); }
        .tw-token.color-red { background: #F44336; }
        .tw-token.color-green { background: #4CAF50; }
        .tw-token.color-blue { background: #2196F3; }
        
        .tw-buttons {
          display: flex;
          gap: 16px;
          width: 100%;
          max-width: 400px;
          justify-content: space-between;
        }
        .tw-btn {
          flex: 1;
          height: 80px;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          background: transparent;
          color: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
          gap: 8px;
          transition: background 0.2s;
        }
        .tw-btn:active { background: rgba(255,255,255,0.1); }
        .tw-btn-icon {
          width: 24px;
          height: 24px;
        }
        
        .tw-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          display: none;
          pointer-events: none;
        }
        .tw-overlay.correct {
          display: block;
          background: radial-gradient(circle, transparent, rgba(76, 175, 80, 0.2));
        }
        .tw-overlay.wrong {
          display: block;
          background: radial-gradient(circle, transparent, rgba(244, 67, 54, 0.3));
        }
      </style>
      <div class="tw-overlay" id="tw-overlay"></div>
      <div class="tw-layout">
        <div class="tw-rule" id="tw-rule">Правило</div>
        <div class="tw-stage">
          <div class="tw-token" id="tw-token"></div>
        </div>
        <div class="tw-buttons">
          <button class="tw-btn" onclick="tw_onBtnClick(0)">
            <span style="color:#F44336">Красный</span>
            <span>Круг</span>
          </button>
          <button class="tw-btn" onclick="tw_onBtnClick(1)">
            <span style="color:#4CAF50">Зелёный</span>
            <span>Квадрат</span>
          </button>
          <button class="tw-btn" onclick="tw_onBtnClick(2)">
            <span style="color:#2196F3">Синий</span>
            <span>Треугольник</span>
          </button>
        </div>
      </div>
    `;

    const ruleEl = el.querySelector('#tw-rule') as HTMLElement;
    const tokenEl = el.querySelector('#tw-token') as HTMLElement;
    const overlayEl = el.querySelector('#tw-overlay') as HTMLElement;

    const generateToken = () => {
      let nextColor = colors[Math.floor(Math.random() * colors.length)];
      let nextShape = shapes[Math.floor(Math.random() * shapes.length)];
      
      while (nextColor === currentToken.color && nextShape === currentToken.shape) {
        nextColor = colors[Math.floor(Math.random() * colors.length)];
        nextShape = shapes[Math.floor(Math.random() * shapes.length)];
      }
      currentToken = { color: nextColor, shape: nextShape };
    };

    const updateUI = (isWarp: boolean = false) => {
      ruleEl.innerText = currentRule === 'color' ? 'Сортируй по: ЦВЕТ' : 'Сортируй по: ФОРМА';
      if (isWarp) {
        ruleEl.classList.remove('warp');
        void ruleEl.offsetWidth;
        ruleEl.classList.add('warp');
      }
      
      tokenEl.className = `tw-token color-${currentToken.color} shape-${currentToken.shape}`;
      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds: totalRounds });
    };

    const startNext = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      let isWarp = false;
      roundsSinceWarp++;
      
      if (roundsSinceWarp >= warpInterval && Math.random() > 0.4) {
        currentRule = currentRule === 'color' ? 'shape' : 'color';
        roundsSinceWarp = 0;
        isWarp = true;
      }
      
      generateToken();
      updateUI(isWarp);
    };

    (window as any).tw_onBtnClick = (idx: number) => {
      if (isGameOver) return;
      
      const rt = performance.now() - t0;
      rts.push(rt);
      totalRounds++;
      
      let isCorrect = false;
      if (currentRule === 'color') {
        isCorrect = currentToken.color === colors[idx];
      } else {
        isCorrect = currentToken.shape === shapes[idx];
      }
      
      if (isCorrect) {
        correctRounds++;
        overlayEl.className = 'tw-overlay correct';
      } else {
        let penalty = 1000;
        if (roundsSinceWarp === 0) penalty = 2000; 
        rts.push(penalty);
        
        overlayEl.className = 'tw-overlay wrong';
      }
      
      setTimeout(() => {
        if (!isGameOver) overlayEl.className = 'tw-overlay';
      }, 200);
      
      startNext();
    };

    startNext();

    return () => {
      isGameOver = true;
      delete (window as any).tw_onBtnClick;
    };
  }
};

export default tokenWarpModule;
