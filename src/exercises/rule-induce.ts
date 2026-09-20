import { ExerciseModule, BlockResult } from './contract';

const ruleInduceModule: ExerciseModule = {
  manifest: {
    id: 'rule-induce',
    name: 'Поиск правила',
    domain: 'logic',
    skills: ['pattern_recognition', 'logical_reasoning'],
    metricModel: 'logic-correctness',
    instruction: 'Изучите примеры и поймите, по какому правилу карточки попадают в Группу А или Б. Затем распределите новую карточку.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ri-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
          padding: 10px;
        }
        .ri-examples {
          display: flex;
          flex-wrap: wrap;
          gap: 15px;
          justify-content: center;
          margin-bottom: 20px;
        }
        .ri-card-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        .ri-card {
          width: 60px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 8px;
          font-size: 30px;
        }
        .ri-label {
          font-size: 14px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
        }
        .ri-label.a { background: #d4edda; color: #155724; }
        .ri-label.b { background: #f8d7da; color: #721c24; }
        
        .ri-test-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 15px;
          padding: 20px;
          border-top: 2px dashed var(--line);
          width: 100%;
        }
        .ri-test-card {
          width: 80px;
          height: 100px;
          font-size: 40px;
          border: 3px solid var(--accent);
        }
        .ri-controls {
          display: flex;
          gap: 20px;
        }
        .ri-btn {
          padding: 10px 20px;
          font-size: 18px;
          font-weight: bold;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .ri-btn.a { background: #d4edda; color: #155724; }
        .ri-btn.b { background: #f8d7da; color: #721c24; }
        .ri-btn:active { transform: scale(0.95); }
      </style>
      <div class="ri-arena">
        <div style="font-weight:bold; color:var(--text);">Примеры:</div>
        <div class="ri-examples" id="ri-examples"></div>
        <div class="ri-test-zone">
          <div style="font-weight:bold; color:var(--text);">Куда отнести эту карточку?</div>
          <div class="ri-card ri-test-card" id="ri-test-card"></div>
          <div class="ri-controls">
            <button class="ri-btn a" id="ri-btn-a">Группа А</button>
            <button class="ri-btn b" id="ri-btn-b">Группа Б</button>
          </div>
        </div>
      </div>
    `;

    const examplesEl = el.querySelector('#ri-examples') as HTMLElement;
    const testCardEl = el.querySelector('#ri-test-card') as HTMLElement;
    const btnA = el.querySelector('#ri-btn-a') as HTMLButtonElement;
    const btnB = el.querySelector('#ri-btn-b') as HTMLButtonElement;

    const shapes = ['▲', '●', '■', '★'];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f'];

    let t0 = 0;
    let expectedGroup = 'a';
    let timer: any;

    const generateRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      // Determine rule
      const ruleType = level < 3 ? (Math.random() < 0.5 ? 'color' : 'shape') : 'color'; 
      // Actually let's just pick a random feature as the rule
      // ruleFeature: e.g. color '#e74c3c' belongs to A, rest B
      const ruleIsColor = Math.random() < 0.5;
      const ruleTarget = ruleIsColor 
        ? colors[Math.floor(Math.random() * colors.length)] 
        : shapes[Math.floor(Math.random() * shapes.length)];

      const evaluate = (c: string, s: string) => {
        if (ruleIsColor) return c === ruleTarget ? 'a' : 'b';
        return s === ruleTarget ? 'a' : 'b';
      };

      // Generate 4-6 examples
      const numExamples = level > 3 ? 6 : 4;
      let examples: {c: string, s: string, g: string}[] = [];
      
      // Ensure at least one A and one B
      let forceA = true;
      let forceB = true;

      for (let i = 0; i < numExamples; i++) {
        let c, s, g;
        do {
          c = colors[Math.floor(Math.random() * colors.length)];
          s = shapes[Math.floor(Math.random() * shapes.length)];
          g = evaluate(c, s);
        } while (
          (forceA && g !== 'a' && i === 0) || 
          (forceB && g !== 'b' && i === 1)
        );
        
        examples.push({c, s, g});
      }

      examplesEl.innerHTML = examples.map(ex => `
        <div class="ri-card-wrap">
          <div class="ri-card" style="color: ${ex.c}">${ex.s}</div>
          <div class="ri-label ${ex.g}">Группа ${ex.g.toUpperCase()}</div>
        </div>
      `).join('');

      // Test card
      let testC, testS;
      // 50% chance for A or B to keep it balanced
      const targetG = Math.random() < 0.5 ? 'a' : 'b';
      do {
        testC = colors[Math.floor(Math.random() * colors.length)];
        testS = shapes[Math.floor(Math.random() * shapes.length)];
      } while (evaluate(testC, testS) !== targetG);

      testCardEl.style.color = testC;
      testCardEl.textContent = testS;
      expectedGroup = targetG;

      // reset buttons
      btnA.style.opacity = '1';
      btnB.style.opacity = '1';
      btnA.style.pointerEvents = 'auto';
      btnB.style.pointerEvents = 'auto';

      t0 = performance.now();
    };

    const handleAns = (group: string) => {
      if (isGameOver) return;
      btnA.style.pointerEvents = 'none';
      btnB.style.pointerEvents = 'none';

      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = group === expectedGroup;
      if (isCorrect) correct++;

      if (group === 'a') {
        btnA.style.opacity = isCorrect ? '1' : '0.5';
        btnB.style.opacity = isCorrect ? '0.5' : '1';
      } else {
        btnB.style.opacity = isCorrect ? '1' : '0.5';
        btnA.style.opacity = isCorrect ? '0.5' : '1';
      }

      timer = setTimeout(generateRound, 800);
    };

    btnA.onclick = () => handleAns('a');
    btnB.onclick = () => handleAns('b');

    generateRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timer);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timer);
    };
  }
};

export default ruleInduceModule;
