import { ExerciseModule, BlockResult } from './contract';

const tallyUpdateModule: ExerciseModule = {
  manifest: {
    id: 'tally-update',
    name: 'Обновление счёта',
    domain: 'memory',
    skills: ['working_memory', 'sustained_attention'],
    metricModel: 'memory-span',
    instruction: 'Считайте количество появляющихся фигур каждой формы. Когда появится вопрос, выберите правильное число или лидирующую форму.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .tu-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .tu-display {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 16px;
          font-size: 60px;
        }
        .tu-shape {
          width: 60px;
          height: 60px;
        }
        .tu-shape.circle { border-radius: 50%; background: var(--accent); }
        .tu-shape.square { background: var(--ok); }
        .tu-shape.triangle {
          width: 0; height: 0;
          border-left: 30px solid transparent;
          border-right: 30px solid transparent;
          border-bottom: 52px solid var(--danger);
        }
        .tu-shape.star {
          background: var(--text);
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
        }
        .tu-question {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          color: var(--text);
          max-width: 400px;
        }
        .tu-controls {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .tu-btn {
          padding: 16px 24px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          min-width: 80px;
        }
        .tu-btn:active { transform: scale(0.95); }
      </style>
      <div class="tu-arena">
        <div class="tu-question" id="tu-question"></div>
        <div class="tu-display" id="tu-display"></div>
        <div class="tu-controls" id="tu-controls"></div>
      </div>
    `;

    const displayEl = el.querySelector('#tu-display') as HTMLElement;
    const questionEl = el.querySelector('#tu-question') as HTMLElement;
    const controlsEl = el.querySelector('#tu-controls') as HTMLElement;

    const shapes = ['circle', 'square', 'triangle', 'star'];
    let currentShapes: string[] = [];
    let counts: Record<string, number> = {};
    
    let timer: any;
    let seqLength = 0;
    let streamIndex = 0;
    let stream: string[] = [];
    let phase = 'stream';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'stream';
      controlsEl.innerHTML = '';
      questionEl.textContent = 'Считайте фигуры...';
      
      const numCategories = Math.min(4, 2 + Math.floor(level / 3));
      currentShapes = shapes.slice(0, numCategories);
      
      counts = {};
      currentShapes.forEach(s => counts[s] = 0);
      
      seqLength = 4 + Math.floor(level * 1.5) + Math.floor(Math.random() * 3);
      stream = [];
      
      for (let i = 0; i < seqLength; i++) {
        const s = currentShapes[Math.floor(Math.random() * currentShapes.length)];
        stream.push(s);
      }
      
      streamIndex = 0;
      showNextItem();
    };

    const showNextItem = () => {
      if (isGameOver) return;

      if (streamIndex >= stream.length) {
        askQuestion();
        return;
      }

      const shape = stream[streamIndex];
      counts[shape]++;
      
      displayEl.innerHTML = `<div class="tu-shape ${shape}"></div>`;
      
      const exposure = Math.max(600, 1500 - level * 100);
      
      timer = setTimeout(() => {
        displayEl.innerHTML = '';
        timer = setTimeout(() => {
          streamIndex++;
          showNextItem();
        }, 300);
      }, exposure);
    };

    const askQuestion = () => {
      phase = 'question';
      displayEl.innerHTML = '<div style="font-size:40px;">?</div>';
      
      const qType = Math.random() > 0.3 ? 'count' : 'leader'; // 70% count, 30% leader
      
      if (qType === 'count') {
        const target = currentShapes[Math.floor(Math.random() * currentShapes.length)];
        const ans = counts[target];
        
        questionEl.innerHTML = `Сколько было <span style="display:inline-block; vertical-align:middle;" class="tu-shape ${target}" style="width:20px;height:20px;"></span> ?`;
        
        let opts = [ans];
        while(opts.length < 4) {
          let fake = ans + (Math.floor(Math.random() * 5) - 2);
          if (fake >= 0 && !opts.includes(fake)) opts.push(fake);
        }
        opts.sort((a,b) => a-b);
        
        controlsEl.innerHTML = opts.map(o => `<button class="tu-btn" data-ans="${o}">${o}</button>`).join('');
        
        controlsEl.querySelectorAll('.tu-btn').forEach(btn => {
          (btn as HTMLElement).onclick = () => handleAns(parseInt(btn.getAttribute('data-ans')!), ans, btn as HTMLElement);
        });
      } else {
        // leader
        let max = -1;
        let leaders: string[] = [];
        for (const s of currentShapes) {
          if (counts[s] > max) { max = counts[s]; leaders = [s]; }
          else if (counts[s] === max) { leaders.push(s); }
        }
        const target = leaders[0]; // just pick one if tie
        
        questionEl.textContent = 'Какая фигура появлялась чаще всего?';
        
        controlsEl.innerHTML = currentShapes.map(s => 
          `<button class="tu-btn" data-ans="${s}"><div class="tu-shape ${s}" style="width:30px;height:30px;"></div></button>`
        ).join('');
        
        controlsEl.querySelectorAll('.tu-btn').forEach(btn => {
          (btn as HTMLElement).onclick = () => {
            const ansStr = btn.getAttribute('data-ans')!;
            const isCorrect = leaders.includes(ansStr);
            handleAnsStr(isCorrect, btn as HTMLElement);
          };
        });
      }
    };

    const handleAns = (ans: number, correctAns: number, btn: HTMLElement) => {
      handleAnsStr(ans === correctAns, btn);
    };
    
    const handleAnsStr = (isCorrect: boolean, btn: HTMLElement) => {
      if (phase !== 'question' || isGameOver) return;
      phase = 'result';
      rounds++;
      
      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }
      
      setTimeout(startRound, 1000);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timer);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      onEnd({ accuracy, avgRtMs: 0, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timer);
    };
  }
};

export default tallyUpdateModule;
