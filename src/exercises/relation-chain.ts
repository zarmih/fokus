import { ExerciseModule, BlockResult } from './contract';

const relationChainModule: ExerciseModule = {
  manifest: {
    id: 'relation-chain',
    name: 'Цепочка связей',
    domain: 'logic',
    skills: ['logical_reasoning', 'pattern_recognition'],
    metricModel: 'logic-correctness',
    instruction: 'Проанализируйте утверждения и ответьте на вопрос. Будьте внимательны к логическим цепочкам.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .rc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 30px;
          padding: 20px;
        }
        .rc-statements {
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: var(--surface);
          padding: 24px;
          border-radius: 12px;
          border: 2px solid var(--line);
          width: 100%;
          max-width: 400px;
        }
        .rc-statement {
          font-size: 22px;
          text-align: center;
          color: var(--text);
        }
        .rc-question {
          font-size: 26px;
          font-weight: bold;
          text-align: center;
          color: var(--accent);
          margin-top: 10px;
        }
        .rc-controls {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .rc-btn {
          padding: 16px 32px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          min-width: 100px;
        }
        .rc-btn:active { transform: scale(0.95); }
      </style>
      <div class="rc-arena">
        <div class="rc-statements" id="rc-statements"></div>
        <div class="rc-question" id="rc-question"></div>
        <div class="rc-controls" id="rc-controls"></div>
      </div>
    `;

    const stEl = el.querySelector('#rc-statements') as HTMLElement;
    const qEl = el.querySelector('#rc-question') as HTMLElement;
    const controlsEl = el.querySelector('#rc-controls') as HTMLElement;

    const names = ['Альфа', 'Бета', 'Гамма', 'Дельта', 'Эпсилон'];
    const dimensions = [
      { adj: 'больше', rev: 'меньше', prop: 'size' },
      { adj: 'тяжелее', rev: 'легче', prop: 'weight' },
      { adj: 'быстрее', rev: 'медленнее', prop: 'speed' },
      { adj: 'старше', rev: 'младше', prop: 'age' }
    ];

    let t0 = performance.now();
    let phase = 'input';

    // Fisher-Yates shuffle
    const shuffle = (array: any[]) => {
      let currentIndex = array.length, randomIndex;
      while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const numItems = 3 + Math.floor(level / 3); // 3 items -> 2 statements, 4 -> 3
      const chainLen = Math.min(5, numItems);
      
      let curNames = shuffle([...names]).slice(0, chainLen);
      let dim = dimensions[Math.floor(Math.random() * dimensions.length)];
      
      // We assume ordered chain: curNames[0] > curNames[1] > curNames[2]...
      // Statements generation
      let statements = [];
      for (let i = 0; i < chainLen - 1; i++) {
        const p1 = curNames[i];
        const p2 = curNames[i+1];
        if (Math.random() > 0.5) {
          statements.push(`${p1} ${dim.adj}, чем ${p2}`);
        } else {
          statements.push(`${p2} ${dim.rev}, чем ${p1}`);
        }
      }
      
      // Shuffle statements
      statements = shuffle(statements);
      
      stEl.innerHTML = statements.map(s => `<div class="rc-statement">${s}</div>`).join('');

      let qType = Math.random();
      let targetAns = '';
      let opts = [];

      if (qType < 0.4) {
        // Find max
        qEl.textContent = `Кто самый ${dim.adj.replace('ее', 'ый').replace('ше', 'ший')}?`; // rough heuristic for Russian adj
        targetAns = curNames[0];
        opts = [...curNames];
      } else if (qType < 0.8) {
        // Find min
        qEl.textContent = `Кто самый ${dim.rev.replace('ее', 'ый').replace('ше', 'ший')}?`;
        targetAns = curNames[chainLen - 1];
        opts = [...curNames];
      } else {
        // Pairwise compare
        let idx1 = Math.floor(Math.random() * chainLen);
        let idx2 = idx1;
        while(idx1 === idx2) idx2 = Math.floor(Math.random() * chainLen);
        
        const isBigger = idx1 < idx2;
        qEl.textContent = `Правда ли, что ${curNames[idx1]} ${dim.adj}, чем ${curNames[idx2]}?`;
        targetAns = isBigger ? 'Да' : 'Нет';
        opts = ['Да', 'Нет'];
      }

      if (opts.length > 2) {
        opts = shuffle(opts);
      }

      controlsEl.innerHTML = opts.map(o => `<button class="rc-btn">${o}</button>`).join('');
      
      controlsEl.querySelectorAll('.rc-btn').forEach(btn => {
        (btn as HTMLElement).onclick = () => handleAns(btn.textContent!, targetAns, btn as HTMLElement);
      });

      t0 = performance.now();
    };

    const handleAns = (ans: string, correctAns: string, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'result';
      rounds++;
      
      const isCorrect = ans === correctAns;
      
      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }
      
      setTimeout(startRound, 800);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      onEnd({ accuracy, avgRtMs: 0, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default relationChainModule;
