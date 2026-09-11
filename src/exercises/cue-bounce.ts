import { ExerciseModule, BlockResult } from './contract';

const cueBounceModule: ExerciseModule = {
  manifest: {
    id: 'cue-bounce',
    name: 'Отскок правила',
    domain: 'flexibility',
    skills: ['rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за правилом сверху. Если "ЧЁТНОСТЬ", определите, чётное число или нечётное. Если "ВЕЛИЧИНА" — больше или меньше 5.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cb-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .cb-cue {
          font-size: 24px;
          font-weight: 700;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 2px;
          height: 30px;
        }
        .cb-stimulus {
          font-size: 64px;
          font-weight: 800;
          color: var(--text);
        }
        .cb-controls {
          display: flex;
          gap: 20px;
          width: 100%;
          max-width: 400px;
          justify-content: center;
        }
        .cb-btn {
          flex: 1;
          padding: 16px;
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          background: var(--surface);
          border: 2px solid var(--primary);
          border-radius: 12px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s;
        }
        .cb-btn:active {
          transform: scale(0.95);
        }
      </style>
      <div class="cb-wrapper">
        <div class="cb-cue" id="cb-cue"></div>
        <div class="cb-stimulus" id="cb-stimulus"></div>
        <div class="cb-controls">
          <div class="cb-btn" id="cb-btn-left"></div>
          <div class="cb-btn" id="cb-btn-right"></div>
        </div>
      </div>
    `;

    const cueEl = el.querySelector('#cb-cue') as HTMLElement;
    const stimEl = el.querySelector('#cb-stimulus') as HTMLElement;
    const btnLeft = el.querySelector('#cb-btn-left') as HTMLElement;
    const btnRight = el.querySelector('#cb-btn-right') as HTMLElement;

    let t0 = performance.now();
    let currentRule: 'parity' | 'magnitude' = 'parity';
    let currentNumber = 0;
    let switchProbability = 0.3 + Math.min(0.5, level * 0.1);

    const rules = [
      {
        id: 'parity',
        cue: 'Чётность',
        leftText: 'Чётное',
        rightText: 'Нечётное',
        checkLeft: (n: number) => n % 2 === 0,
        checkRight: (n: number) => n % 2 !== 0
      },
      {
        id: 'magnitude',
        cue: 'Величина',
        leftText: '< 5',
        rightText: '> 5',
        checkLeft: (n: number) => n < 5,
        checkRight: (n: number) => n > 5
      }
    ];

    const generateNumber = () => {
      let n;
      do {
        n = Math.floor(Math.random() * 9) + 1;
      } while (n === 5 || n === currentNumber);
      return n;
    };

    const handleAnswer = (isLeft: boolean) => {
      if (isGameOver) return;
      rts.push(performance.now() - t0);
      
      const ruleDef = rules.find(r => r.id === currentRule)!;
      const isCorrect = isLeft ? ruleDef.checkLeft(currentNumber) : ruleDef.checkRight(currentNumber);
      
      if (isCorrect) {
        correct++;
      } else {
        errors++;
      }
      rounds++;

      startRound();
    };

    btnLeft.onclick = () => handleAnswer(true);
    btnRight.onclick = () => handleAnswer(false);

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      if (Math.random() < switchProbability) {
        currentRule = currentRule === 'parity' ? 'magnitude' : 'parity';
      }

      currentNumber = generateNumber();
      const ruleDef = rules.find(r => r.id === currentRule)!;

      cueEl.textContent = ruleDef.cue;
      stimEl.textContent = currentNumber.toString();
      btnLeft.textContent = ruleDef.leftText;
      btnRight.textContent = ruleDef.rightText;

      t0 = performance.now();
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default cueBounceModule;
