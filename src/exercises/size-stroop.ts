import { ExerciseModule, BlockResult } from './contract';

const sizeStroopModule: ExerciseModule = {
  manifest: {
    id: 'size-stroop',
    name: 'Ловушка Размера',
    domain: 'flexibility',
    skills: ['inhibition', 'rule_switching'],
    metricModel: 'speed-accuracy',
    instruction: 'Если рамка СИНЯЯ — выберите число, которое больше математически. Если ЖЁЛТАЯ — число, которое больше физически.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ss-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 40px; font-family: sans-serif; }
        .ss-frame { padding: 40px; border: 8px solid; border-radius: 16px; display: flex; gap: 40px; align-items: center; justify-content: center; transition: border-color 0.2s; }
        .ss-frame.rule-math { border-color: #3b82f6; }
        .ss-frame.rule-phys { border-color: #eab308; }
        .ss-btn { background: transparent; border: none; cursor: pointer; padding: 10px; font-weight: bold; transition: transform 0.1s; }
        .ss-btn:active { transform: scale(0.9); }
      </style>
      <div class="ss-arena">
        <div class="ss-frame" id="ss-frame"></div>
      </div>
    `;

    const frameEl = el.querySelector('#ss-frame') as HTMLElement;
    let currentAns = 0;
    let t0 = performance.now();
    let rule = 'math';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      rule = Math.random() > 0.5 ? 'math' : 'phys';
      frameEl.className = `ss-frame rule-${rule}`;

      let n1, n2;
      do {
        n1 = Math.floor(Math.random() * 9) + 1;
        n2 = Math.floor(Math.random() * 9) + 1;
      } while (n1 === n2);

      const sizes = [32, 72];
      if (Math.random() > 0.5) sizes.reverse();

      frameEl.innerHTML = '';
      
      const b1 = document.createElement('button');
      b1.className = 'ss-btn';
      b1.style.fontSize = `${sizes[0]}px`;
      b1.textContent = n1.toString();
      
      const b2 = document.createElement('button');
      b2.className = 'ss-btn';
      b2.style.fontSize = `${sizes[1]}px`;
      b2.textContent = n2.toString();

      if (rule === 'math') {
        currentAns = n1 > n2 ? n1 : n2;
      } else {
        currentAns = sizes[0] > sizes[1] ? n1 : n2;
      }

      b1.onclick = () => handleAns(n1);
      b2.onclick = () => handleAns(n2);

      frameEl.appendChild(b1);
      frameEl.appendChild(b2);

      t0 = performance.now();
    };

    const handleAns = (ans: number) => {
      if (isGameOver) return;
      rounds++;
      if (ans === currentAns) correct++;
      rts.push(performance.now() - t0);
      startRound();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      onEnd({
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000,
        rounds
      });
    };

    return () => { isGameOver = true; };
  }
};
export default sizeStroopModule;
