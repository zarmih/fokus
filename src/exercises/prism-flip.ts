import { ExerciseModule, BlockResult } from './contract';

const prismFlipModule: ExerciseModule = {
  manifest: {
    id: 'prism-flip',
    name: 'Призма',
    domain: 'flexibility',
    skills: ['task_switching', 'rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте фигуры по текущему правилу (ЦВЕТ или ФОРМА). Внимание: правило может внезапно измениться!'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .pf-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 32px; }
        .pf-rule { font-size: 32px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .pf-token { width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }
        .pf-shape { width: 80px; height: 80px; }
        .pf-circle { border-radius: 50%; }
        .pf-square { border-radius: 12px; }
        .pf-triangle { width: 0; height: 0; border-left: 40px solid transparent; border-right: 40px solid transparent; border-bottom: 80px solid; background: none !important; }
        .pf-options { display: flex; gap: 48px; }
        .pf-btn { background: var(--surface); border: 2px solid var(--line); border-radius: 16px; padding: 24px; cursor: pointer; transition: transform 0.1s; }
        .pf-btn:active { transform: scale(0.95); }
      </style>
      <div class="pf-arena">
        <div class="pf-rule" id="pf-rule">ПРАВИЛО</div>
        <div class="pf-token" id="pf-center"></div>
        <div class="pf-options">
          <button class="pf-btn" id="pf-opt1"></button>
          <button class="pf-btn" id="pf-opt2"></button>
        </div>
      </div>
    `;

    const ruleEl = el.querySelector('#pf-rule') as HTMLElement;
    const centerEl = el.querySelector('#pf-center') as HTMLElement;
    const opt1El = el.querySelector('#pf-opt1') as HTMLElement;
    const opt2El = el.querySelector('#pf-opt2') as HTMLElement;

    const colors = ['#EF476F', '#06D6A0', '#118AB2', '#FFD166'];
    const shapes = ['circle', 'square', 'triangle'];
    let currentRule: 'color' | 'shape' = 'color';
    let t0 = 0;
    let justFlipped = false;
    let targetMatchIndex = 0;

    const renderShape = (c: string, s: string) => {
      if (s === 'triangle') {
        return `<div class="pf-shape pf-triangle" style="border-bottom-color: ${c}"></div>`;
      }
      return `<div class="pf-shape pf-${s}" style="background-color: ${c}"></div>`;
    };

    const nextRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) return endBlock();

      const flipProb = 0.2 + (level * 0.05);
      if (Math.random() < Math.min(flipProb, 0.7)) {
        currentRule = currentRule === 'color' ? 'shape' : 'color';
        justFlipped = true;
      } else {
        justFlipped = false;
      }

      ruleEl.textContent = currentRule === 'color' ? 'ЦВЕТ' : 'ФОРМА';
      ruleEl.style.color = currentRule === 'color' ? 'var(--primary)' : 'var(--accent)';

      const tc = colors[Math.floor(Math.random() * colors.length)];
      const ts = shapes[Math.floor(Math.random() * shapes.length)];
      centerEl.innerHTML = renderShape(tc, ts);

      targetMatchIndex = Math.random() > 0.5 ? 1 : 0;
      
      let distC = colors.find(c => c !== tc) || colors[0];
      let distS = shapes.find(s => s !== ts) || shapes[0];

      let optMatch = currentRule === 'color' ? {c: tc, s: distS} : {c: distC, s: ts};
      let optDist = currentRule === 'color' ? {c: distC, s: ts} : {c: tc, s: distS};

      if (targetMatchIndex === 0) {
        opt1El.innerHTML = renderShape(optMatch.c, optMatch.s);
        opt2El.innerHTML = renderShape(optDist.c, optDist.s);
      } else {
        opt1El.innerHTML = renderShape(optDist.c, optDist.s);
        opt2El.innerHTML = renderShape(optMatch.c, optMatch.s);
      }

      t0 = performance.now();
    };

    const handleAns = (idx: number) => {
      if (isGameOver) return;
      rounds++;
      const rt = performance.now() - t0;
      rts.push(rt);

      if (idx === targetMatchIndex) {
        correct++;
        centerEl.style.transform = 'scale(1.1)';
      } else {
        if (justFlipped) {
          correct = Math.max(0, correct - 1);
        }
        centerEl.style.transform = 'translateY(10px)';
      }
      
      setTimeout(() => {
        centerEl.style.transform = 'none';
        nextRound();
      }, 150);
    };

    opt1El.onclick = () => handleAns(0);
    opt2El.onclick = () => handleAns(1);
    
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns(0);
      if (e.key === 'ArrowRight') handleAns(1);
    };
    window.addEventListener('keydown', onKey);
    
    nextRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      onEnd({
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000,
        rounds
      });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default prismFlipModule;
