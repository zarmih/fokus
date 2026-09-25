import { ExerciseModule, BlockResult } from './contract';

const letterNumberSwitchModule: ExerciseModule = {
  manifest: {
    id: 'letter-number-switch',
    name: 'Переключение Буква-Цифра',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Если рамка ЖЁЛТАЯ — выберите ГЛАСНАЯ ли буква. Если СИНЯЯ — ЧЁТНАЯ ли цифра. Используйте стрелки Влево (Гласная/Чётная) и Вправо (Согласная/Нечётная).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .lns-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 30px;
        }
        .lns-frame {
          width: 160px;
          height: 160px;
          border: 8px solid;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 64px;
          font-weight: 800;
          transition: border-color 0.2s;
        }
        .lns-frame.rule-letter { border-color: #eab308; }
        .lns-frame.rule-number { border-color: #3b82f6; }
        .lns-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .lns-btn {
          padding: 16px 24px;
          font-size: 18px;
          font-weight: 600;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          cursor: pointer;
        }
        .lns-btn:active { transform: scale(0.95); }
      </style>
      <div class="lns-arena">
        <div class="lns-frame" id="lns-frame"></div>
        <div class="lns-controls" id="lns-controls"></div>
      </div>
    `;

    const frame = el.querySelector('#lns-frame') as HTMLElement;
    const controls = el.querySelector('#lns-controls') as HTMLElement;
    
    let currentAns = '';
    let t0 = performance.now();
    let rule = 'letter';
    const switchProb = 0.2 + level * 0.05;
    
    const vowels = ['А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я'];
    const consonants = ['Б', 'В', 'Г', 'Д', 'Ж', 'З', 'К', 'Л', 'М', 'Н', 'П', 'Р', 'С', 'Т', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ'];
    const evens = ['2', '4', '6', '8'];
    const odds = ['1', '3', '5', '7', '9'];

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    const handleAns = (ans: string) => {
      if (isGameOver) return;
      rounds++;
      if (ans === currentAns) {
        correct++;
        frame.style.background = 'rgba(16, 185, 129, 0.1)';
      } else {
        errors++;
        frame.style.background = 'rgba(239, 68, 68, 0.1)';
      }
      setTimeout(() => frame.style.background = 'transparent', 150);
      rts.push(performance.now() - t0);
      startRound();
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns('left');
      if (e.key === 'ArrowRight') handleAns('right');
    };
    window.addEventListener('keydown', handleKey);

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      if (Math.random() < switchProb) {
        rule = rule === 'letter' ? 'number' : 'letter';
      }

      frame.className = `lns-frame rule-${rule}`;
      
      const lIsVowel = Math.random() < 0.5;
      const nIsEven = Math.random() < 0.5;
      const l = lIsVowel ? pick(vowels) : pick(consonants);
      const n = nIsEven ? pick(evens) : pick(odds);
      
      frame.textContent = l + n;

      controls.innerHTML = '';
      
      if (rule === 'letter') {
        currentAns = lIsVowel ? 'left' : 'right';
        const b1 = document.createElement('button'); b1.className='lns-btn'; b1.textContent='Гласная (Влево)'; b1.onclick = () => handleAns('left');
        const b2 = document.createElement('button'); b2.className='lns-btn'; b2.textContent='Согласная (Вправо)'; b2.onclick = () => handleAns('right');
        controls.appendChild(b1); controls.appendChild(b2);
      } else {
        currentAns = nIsEven ? 'left' : 'right';
        const b1 = document.createElement('button'); b1.className='lns-btn'; b1.textContent='Чётная (Влево)'; b1.onclick = () => handleAns('left');
        const b2 = document.createElement('button'); b2.className='lns-btn'; b2.textContent='Нечётная (Вправо)'; b2.onclick = () => handleAns('right');
        controls.appendChild(b1); controls.appendChild(b2);
      }

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', handleKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { 
      isGameOver = true; 
      window.removeEventListener('keydown', handleKey);
    };
  }
};

export default letterNumberSwitchModule;
