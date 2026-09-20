import { ExerciseModule, BlockResult } from './contract';

const ALPHABET = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ';

const letterShiftModule: ExerciseModule = {
  manifest: {
    id: 'letter-shift',
    name: 'Сдвиг букв',
    domain: 'logic',
    skills: ['mental_calculation', 'working_memory'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите, какая буква получится, если сдвинуть заданную букву по алфавиту на указанное число шагов. Используйте мышь или цифры 1-4.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ls-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 30px; }
        .ls-task { font-size: 64px; font-weight: bold; color: var(--text); }
        .ls-options { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; }
        .ls-btn { padding: 20px 40px; font-size: 32px; font-weight: bold; border-radius: 12px; background: var(--surface); border: 2px solid var(--line); cursor: pointer; user-select: none; color: var(--text); }
        .ls-btn:active { transform: scale(0.95); }
      </style>
      <div class="ls-arena">
        <div class="ls-task" id="ls-task">А + 2</div>
        <div class="ls-options" id="ls-options"></div>
      </div>
    `;

    const taskEl = el.querySelector('#ls-task') as HTMLElement;
    const optionsEl = el.querySelector('#ls-options') as HTMLElement;

    let t0 = 0;
    let currentAnswer = '';
    
    const generateTask = () => {
      if (isGameOver) return;
      if (isTimeUp()) { endBlock(); return; }

      const maxShift = Math.min(5, 2 + Math.floor(level / 2));
      const shift = (Math.floor(Math.random() * maxShift) + 1) * (Math.random() < 0.5 ? 1 : -1);
      
      let startIndex = Math.floor(Math.random() * ALPHABET.length);
      while (startIndex + shift < 0 || startIndex + shift >= ALPHABET.length) {
        startIndex = Math.floor(Math.random() * ALPHABET.length);
      }
      
      const startLetter = ALPHABET[startIndex];
      const sign = shift > 0 ? '+' : '';
      taskEl.textContent = `${startLetter} ${sign}${shift}`;
      
      const targetIndex = startIndex + shift;
      currentAnswer = ALPHABET[targetIndex];
      
      const options = new Set<string>();
      options.add(currentAnswer);
      while (options.size < 4) {
        const randIndex = Math.floor(Math.random() * ALPHABET.length);
        options.add(ALPHABET[randIndex]);
      }
      
      const optionsArr = Array.from(options).sort(() => Math.random() - 0.5);
      
      optionsEl.innerHTML = '';
      optionsArr.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'ls-btn';
        btn.textContent = opt;
        btn.onclick = () => handleHit(opt);
        optionsEl.appendChild(btn);
      });

      t0 = performance.now();
    };

    const handleHit = (ans: string) => {
      if (isGameOver) return;
      rounds++;
      rts.push(performance.now() - t0);
      if (ans === currentAnswer) {
        correct++;
      }
      generateTask();
    };

    const onKey = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < optionsEl.children.length) {
        const btn = optionsEl.children[idx] as HTMLButtonElement;
        btn.click();
      }
    };
    window.addEventListener('keydown', onKey);

    generateTask();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default letterShiftModule;
