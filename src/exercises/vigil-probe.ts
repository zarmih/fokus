import { ExerciseModule, BlockResult } from './contract';

const vigilProbeModule: ExerciseModule = {
  manifest: {
    id: 'vigil-probe',
    name: 'Бдительность',
    domain: 'attention',
    skills: ['sustained_attention', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте кнопку только тогда, когда появляется целевой объект. Пропускайте все остальные.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .vp-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .vp-target-info {
          font-size: 18px;
          color: var(--text);
          margin-bottom: 20px;
          text-align: center;
        }
        .vp-stimulus {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 4px solid var(--line);
          border-radius: 20px;
          font-size: 60px;
          transition: background 0.1s;
        }
        .vp-btn {
          width: 200px;
          height: 60px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 30px;
          background: var(--accent);
          color: #fff;
          border: none;
          cursor: pointer;
          transition: transform 0.1s, opacity 0.2s;
        }
        .vp-btn:active { transform: scale(0.95); }
        .vp-btn:disabled { opacity: 0.5; pointer-events: none; }
      </style>
      <div class="vp-arena">
        <div class="vp-target-info" id="vp-target-info">Цель: <b id="vp-target-name"></b></div>
        <div class="vp-stimulus" id="vp-stimulus"></div>
        <button class="vp-btn" id="vp-btn">ЦЕЛЬ!</button>
      </div>
    `;

    const targetInfoEl = el.querySelector('#vp-target-name') as HTMLElement;
    const stimulusEl = el.querySelector('#vp-stimulus') as HTMLElement;
    const btn = el.querySelector('#vp-btn') as HTMLButtonElement;

    const shapes = ['▲', '●', '■', '★', '♦'];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

    // Select target
    const targetShape = shapes[Math.floor(Math.random() * shapes.length)];
    const targetColor = colors[Math.floor(Math.random() * colors.length)];
    
    // Level scaling: 
    // Higher level -> faster duration, more similar distractors
    let durationMs = Math.max(400, 1500 - level * 100);
    let intervalMs = Math.max(300, 1000 - level * 50);
    const targetProb = Math.max(0.1, 0.4 - level * 0.03); // Target becomes rarer

    targetInfoEl.innerHTML = `<span style="color: ${targetColor}">${targetShape}</span>`;

    let t0 = 0;
    let currentIsTarget = false;
    let stimulusActive = false;
    let hasActedThisRound = false;
    let timer: any;

    const nextStimulus = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      hasActedThisRound = false;
      stimulusActive = true;
      rounds++;

      currentIsTarget = Math.random() < targetProb;

      let sShape = targetShape;
      let sColor = targetColor;

      if (!currentIsTarget) {
        // Generate distractor
        const distractType = Math.random();
        if (level > 4 && distractType < 0.5) {
          // Hard distractor: same color, different shape OR same shape, different color
          if (Math.random() < 0.5) {
            sShape = shapes.find(s => s !== targetShape) || shapes[0];
          } else {
            sColor = colors.find(c => c !== targetColor) || colors[0];
          }
        } else {
          // Easy distractor: different color and shape
          sShape = shapes.find(s => s !== targetShape) || shapes[0];
          sColor = colors.find(c => c !== targetColor) || colors[0];
        }
      }

      stimulusEl.style.color = sColor;
      stimulusEl.textContent = sShape;
      stimulusEl.style.background = 'var(--surface)';
      
      t0 = performance.now();
      
      timer = setTimeout(() => {
        hideStimulus();
      }, durationMs);
    };

    const hideStimulus = () => {
      if (isGameOver) return;
      stimulusActive = false;
      stimulusEl.textContent = '';
      
      // If it was not target and user didn't act -> correct rejection
      // If it was target and user didn't act -> miss
      if (!hasActedThisRound) {
        if (!currentIsTarget) {
          correct++;
        }
      }

      timer = setTimeout(() => {
        nextStimulus();
      }, intervalMs);
    };

    btn.onclick = () => {
      if (!stimulusActive || hasActedThisRound || isGameOver) return;
      hasActedThisRound = true;
      const rt = performance.now() - t0;
      
      if (currentIsTarget) {
        correct++;
        rts.push(rt);
        stimulusEl.style.background = '#d4edda'; // success visual hint
      } else {
        stimulusEl.style.background = '#f8d7da'; // error visual hint
      }
    };

    // start first
    timer = setTimeout(nextStimulus, 1000);

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timer);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timer);
    };
  }
};

export default vigilProbeModule;
