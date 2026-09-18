import { ExerciseModule, BlockResult } from './contract';

const awLogicGateModule: ExerciseModule = {
  manifest: {
    id: 'aw-logic-gate',
    name: 'Логический шлюз',
    domain: 'logic',
    skills: ['logical_reasoning', 'processing_speed'] as any,
    metricModel: 'speed-accuracy',
    instruction: 'Если фигура КРУГ — жмите ВЛЕВО. Если КВАДРАТ — ВПРАВО. НО если фон КРАСНЫЙ, правила меняются наоборот!'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let startTime = 0;
    
    let isReversed = false;
    let isCircle = true;

    el.innerHTML = `
      <style>
        .aw-logic-container { display:flex; flex-direction:column; justify-content:center; align-items:center; height:100%; width:100%; transition: background 0.2s; border-radius: 12px; }
        .aw-logic-shape { width:120px; height:120px; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .aw-logic-shape.circle { border-radius: 50%; }
        .aw-logic-shape.square { border-radius: 15px; }
        .aw-logic-controls { display:flex; gap: 40px; margin-top: 50px; }
        .aw-logic-btn { padding: 15px 40px; font-size: 24px; cursor:pointer; background: #2c3e50; color: white; border: none; border-radius: 8px; }
        .aw-logic-btn:active { background: #1a252f; }
      </style>
      <div class="aw-logic-container" id="aw-logic-bg">
        <div class="aw-logic-shape circle" id="aw-logic-shape"></div>
        <div class="aw-logic-controls">
          <button class="aw-logic-btn" id="aw-logic-left">ВЛЕВО</button>
          <button class="aw-logic-btn" id="aw-logic-right">ВПРАВО</button>
        </div>
      </div>
    `;

    const bg = el.querySelector('#aw-logic-bg') as HTMLElement;
    const shape = el.querySelector('#aw-logic-shape') as HTMLElement;
    const btnLeft = el.querySelector('#aw-logic-left') as HTMLElement;
    const btnRight = el.querySelector('#aw-logic-right') as HTMLElement;

    const showNext = () => {
      if (isGameOver) return;
      isReversed = Math.random() > 0.5;
      isCircle = Math.random() > 0.5;
      
      bg.style.background = isReversed ? '#e74c3c' : '#ecf0f1';
      shape.className = 'aw-logic-shape ' + (isCircle ? 'circle' : 'square');
      
      startTime = performance.now();
    };

    const handleAnswer = (choseLeft: boolean) => {
      if (isGameOver) return;
      rounds++;
      
      let correctLeft = isCircle;
      if (isReversed) correctLeft = !correctLeft;
      
      if (choseLeft === correctLeft) {
        correct++;
      }
      rts.push(performance.now() - startTime);
      
      if (isTimeUp()) {
        endBlock();
      } else {
        showNext();
      }
    };

    btnLeft.onclick = () => handleAnswer(true);
    btnRight.onclick = () => handleAnswer(false);

    const checkTime = setInterval(() => {
      if (isTimeUp() && !isGameOver) {
        endBlock();
      }
    }, 500);

    const endBlock = () => {
      isGameOver = true;
      clearInterval(checkTime);
      onEnd({
        rounds,
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 500
      });
    };

    showNext();

    return () => {
      isGameOver = true;
      clearInterval(checkTime);
    };
  }
};

export default awLogicGateModule;
