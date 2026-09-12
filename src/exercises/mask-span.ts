import { ExerciseModule, BlockResult } from './contract';

const maskSpanModule: ExerciseModule = {
  manifest: {
    id: 'mask-span',
    name: 'Маска-спан',
    domain: 'memory',
    skills: ['visual_memory', 'working_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните символы. После маски выберите все символы, которые были показаны (порядок не важен).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const sequenceLength = 3 + Math.floor(level);
    const flashDuration = 1500;
    const maskDuration = 800;
    
    const ALPHABET = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');

    el.innerHTML = `
      <style>
        .ms-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .ms-display {
          display: flex;
          gap: 12px;
          min-height: 60px;
        }
        .ms-char {
          font-size: 32px;
          font-weight: 700;
          color: var(--text);
          background: var(--surface);
          width: 50px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }
        .ms-keyboard {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 20px;
        }
        .ms-key {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
          background: var(--surface);
          border: 1px solid var(--border, #ccc);
          border-radius: 8px;
          cursor: pointer;
          user-select: none;
        }
        .ms-key.selected {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .ms-key:active {
          transform: scale(0.95);
        }
        .ms-hidden {
          display: none !important;
        }
      </style>
      <div class="ms-wrapper">
        <div class="ms-display" id="ms-display"></div>
        <div class="ms-keyboard ms-hidden" id="ms-keyboard"></div>
      </div>
    `;

    const display = el.querySelector('#ms-display') as HTMLElement;
    const keyboard = el.querySelector('#ms-keyboard') as HTMLElement;
    
    let t0 = performance.now();
    let currentTarget: string[] = [];
    let selectedChars: string[] = [];
    let timeoutIds: any[] = [];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      display.innerHTML = '';
      keyboard.innerHTML = '';
      keyboard.classList.add('ms-hidden');
      selectedChars = [];

      // Generate random target sequence
      const shuffled = [...ALPHABET].sort(() => 0.5 - Math.random());
      currentTarget = shuffled.slice(0, sequenceLength);

      // Show target
      currentTarget.forEach(char => {
        const div = document.createElement('div');
        div.className = 'ms-char';
        div.textContent = char;
        display.appendChild(div);
      });

      timeoutIds.push(setTimeout(() => {
        if (isGameOver) return;
        // Apply mask
        const chars = display.querySelectorAll('.ms-char');
        chars.forEach(c => c.textContent = '#');

        timeoutIds.push(setTimeout(() => {
          if (isGameOver) return;
          showKeyboard(shuffled);
        }, maskDuration));

      }, flashDuration));
    };

    const showKeyboard = (shuffledAlphabet: string[]) => {
      display.innerHTML = '<div style="font-size:18px;">Выберите показанные символы:</div>';
      keyboard.classList.remove('ms-hidden');

      // Generate 12 keys: targets + random distractors
      const distractors = shuffledAlphabet.slice(sequenceLength, 12);
      const keys = [...currentTarget, ...distractors].slice(0, 12).sort(() => 0.5 - Math.random());

      t0 = performance.now();

      keys.forEach(char => {
        const btn = document.createElement('div');
        btn.className = 'ms-key';
        btn.textContent = char;
        btn.onclick = () => {
          if (isGameOver) return;
          if (selectedChars.includes(char)) {
            selectedChars = selectedChars.filter(c => c !== char);
            btn.classList.remove('selected');
          } else {
            selectedChars.push(char);
            btn.classList.add('selected');
          }

          if (selectedChars.length === sequenceLength) {
            checkResult();
          }
        };
        keyboard.appendChild(btn);
      });
    };

    const checkResult = () => {
      rts.push(performance.now() - t0);
      rounds++;

      const isCorrect = currentTarget.every(c => selectedChars.includes(c));
      if (isCorrect) {
        correct++;
      } else {
        errors++;
      }

      startRound();
    };

    const endBlock = () => {
      isGameOver = true;
      timeoutIds.forEach(clearTimeout);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a, b) => a + b, 0) / rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { 
      isGameOver = true;
      timeoutIds.forEach(clearTimeout);
    };
  }
};

export default maskSpanModule;
