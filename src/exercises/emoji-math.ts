import { ExerciseModule, BlockResult } from './contract';

const emojiMathModule: ExerciseModule = {
  manifest: {
    id: 'emoji-math',
    name: 'Эмодзи Математика',
    domain: 'logic',
    skills: ['logical_reasoning', 'working_memory'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните стоимость эмодзи. Решайте примеры.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .em-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 20px; font-family: sans-serif; }
        .em-dict { font-size: 24px; margin-bottom: 20px; display: flex; gap: 20px; }
        .em-eq { font-size: 48px; font-weight: bold; margin-bottom: 30px; }
        .em-controls { display: flex; gap: 10px; }
        .em-btn { padding: 15px 25px; font-size: 24px; border-radius: 8px; border: 2px solid #ccc; background: #fff; cursor: pointer; }
      </style>
      <div class="em-arena">
        <div class="em-dict" id="em-dict"></div>
        <div class="em-eq" id="em-eq"></div>
        <div class="em-controls" id="em-controls"></div>
      </div>
    `;

    const dictEl = el.querySelector('#em-dict') as HTMLElement;
    const eqEl = el.querySelector('#em-eq') as HTMLElement;
    const controlsEl = el.querySelector('#em-controls') as HTMLElement;

    const emojis = ['🍎', '🍌', '🍉'];
    const values = [1, 2, 3];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }

    dictEl.textContent = emojis.map((e, i) => `${e}=${values[i]}`).join('   ');

    let currentAns = 0;
    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      const e1 = Math.floor(Math.random() * 3);
      const e2 = Math.floor(Math.random() * 3);
      const isPlus = Math.random() > 0.5;

      if (isPlus) {
        currentAns = values[e1] + values[e2];
        eqEl.textContent = `${emojis[e1]} + ${emojis[e2]} = ?`;
      } else {
        const max = values[e1] > values[e2] ? e1 : e2;
        const min = values[e1] > values[e2] ? e2 : e1;
        currentAns = values[max] - values[min];
        eqEl.textContent = `${emojis[max]} - ${emojis[min]} = ?`;
      }

      controlsEl.innerHTML = '';
      const options = new Set<number>();
      options.add(currentAns);
      while(options.size < 3) {
        options.add(Math.floor(Math.random() * 7));
      }
      const optArr = Array.from(options).sort((a,b) => a-b);
      optArr.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'em-btn';
        btn.textContent = opt.toString();
        btn.onclick = () => handleAns(opt);
        controlsEl.appendChild(btn);
      });
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
export default emojiMathModule;
