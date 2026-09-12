import { ExerciseModule, BlockResult } from './contract';

const flipAgendaModule: ExerciseModule = {
  manifest: {
    id: 'flip-agenda',
    name: 'Смена повестки',
    domain: 'flexibility',
    skills: ['task_switching', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за правилом. Если "Цвет": Красный - влево, Синий - вправо. Если "Форма": Круг - влево, Квадрат - вправо.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .fa-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .fa-agenda {
          font-size: 24px;
          font-weight: bold;
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 2px;
          padding: 8px 16px;
          border: 2px solid var(--accent);
          border-radius: 8px;
        }
        .fa-stimulus {
          width: 100px;
          height: 100px;
          transition: transform 0.1s;
        }
        .fa-shape-circle { border-radius: 50%; }
        .fa-shape-square { border-radius: 12px; }
        .fa-controls {
          display: flex;
          gap: 24px;
        }
        .fa-btn {
          width: 80px;
          height: 80px;
          font-size: 40px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .fa-btn:active { transform: scale(0.9); }
        .fa-legend {
          font-size: 14px;
          color: var(--text);
          opacity: 0.7;
          display: flex;
          gap: 30px;
          margin-bottom: -20px;
        }
      </style>
      <div class="fa-arena">
        <div class="fa-legend">
          <div>⬅️ Красный / Круг</div>
          <div>Синий / Квадрат ➡️</div>
        </div>
        <div class="fa-agenda" id="fa-agenda">ПРАВИЛО</div>
        <div class="fa-stimulus" id="fa-stimulus"></div>
        <div class="fa-controls">
          <button class="fa-btn" id="fa-left">←</button>
          <button class="fa-btn" id="fa-right">→</button>
        </div>
      </div>
    `;

    const agendaEl = el.querySelector('#fa-agenda') as HTMLElement;
    const stimEl = el.querySelector('#fa-stimulus') as HTMLElement;
    const btnLeft = el.querySelector('#fa-left') as HTMLElement;
    const btnRight = el.querySelector('#fa-right') as HTMLElement;

    type Rule = 'color' | 'shape';
    type Color = 'red' | 'blue';
    type Shape = 'circle' | 'square';

    let currentRule: Rule = 'color';
    let currentColor: Color = 'red';
    let currentShape: Shape = 'circle';
    let expectedAns: 'left' | 'right' = 'left';
    let ruleFlipsIn = 3;
    
    let t0 = performance.now();
    let phase = 'input';

    const applyStimulus = () => {
      agendaEl.textContent = currentRule === 'color' ? 'ЦВЕТ' : 'ФОРМА';
      
      stimEl.className = 'fa-stimulus';
      stimEl.classList.add(currentShape === 'circle' ? 'fa-shape-circle' : 'fa-shape-square');
      stimEl.style.backgroundColor = currentColor === 'red' ? '#ff4757' : '#2ed573'; // use a generic blue/green for blue
      if(currentColor === 'blue') stimEl.style.backgroundColor = '#1e90ff';

      if (currentRule === 'color') {
        expectedAns = currentColor === 'red' ? 'left' : 'right';
      } else {
        expectedAns = currentShape === 'circle' ? 'left' : 'right';
      }
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      ruleFlipsIn--;
      if (ruleFlipsIn <= 0) {
        currentRule = currentRule === 'color' ? 'shape' : 'color';
        // Flips happen more often on higher levels
        ruleFlipsIn = level > 5 ? (2 + Math.floor(Math.random() * 2)) : (3 + Math.floor(Math.random() * 3));
      }

      currentColor = Math.random() > 0.5 ? 'red' : 'blue';
      currentShape = Math.random() > 0.5 ? 'circle' : 'square';
      
      // Make it incongruent more often on high levels
      if (level > 3 && Math.random() > 0.5) {
        // e.g. rule is color, red -> left. Make shape square -> right.
        if (currentRule === 'color') {
          currentShape = currentColor === 'red' ? 'square' : 'circle';
        } else {
          currentColor = currentShape === 'circle' ? 'blue' : 'red';
        }
      }

      applyStimulus();
      t0 = performance.now();
    };

    const handleAns = (ans: 'left' | 'right') => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ans === expectedAns;
      if (isCorrect) {
        correct++;
        stimEl.style.transform = 'scale(1.1)';
        stimEl.style.boxShadow = '0 0 15px var(--ok)';
      } else {
        stimEl.style.transform = 'translateX(10px)';
        stimEl.style.boxShadow = '0 0 15px var(--danger)';
      }

      setTimeout(() => {
        stimEl.style.transform = 'none';
        stimEl.style.boxShadow = 'none';
        startRound();
      }, 300);
    };

    btnLeft.onclick = () => handleAns('left');
    btnRight.onclick = () => handleAns('right');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns('left');
      if (e.key === 'ArrowRight') handleAns('right');
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default flipAgendaModule;
