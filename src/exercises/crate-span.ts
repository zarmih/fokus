import { ExerciseModule, BlockResult } from './contract';

const crateSpanModule: ExerciseModule = {
  manifest: {
    id: 'crate-span',
    name: 'Ящик',
    domain: 'memory',
    skills: ['visual_memory', 'working_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните последовательность загорающихся ящиков и повторите её.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cs-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .cs-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .cs-crate {
          width: 80px;
          height: 80px;
          background: var(--surface-alt);
          border: 4px solid var(--line);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .cs-crate.highlight {
          background: var(--accent);
          border-color: var(--accent);
        }
        .cs-crate.wrong {
          background: var(--danger);
          border-color: var(--danger);
        }
      </style>
      <div class="cs-arena">
        <div class="cs-grid" id="cs-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#cs-grid') as HTMLElement;
    const crates: HTMLElement[] = [];
    for (let i = 0; i < 9; i++) {
      const c = document.createElement('div');
      c.className = 'cs-crate';
      grid.appendChild(c);
      crates.push(c);
    }
    
    let sequence: number[] = [];
    let playerIndex = 0;
    let currentSpan = 3 + Math.floor(level / 3);
    let timer: any;
    let allowInput = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      allowInput = false;
      playerIndex = 0;
      sequence = [];
      for (let i = 0; i < currentSpan; i++) {
        let n = Math.floor(Math.random() * 9);
        // avoid same consecutive
        if (i > 0 && sequence[i-1] === n) {
          n = (n + 1) % 9;
        }
        sequence.push(n);
      }

      playSequence(0);
    };

    const playSequence = (idx: number) => {
      if (isGameOver) return;
      if (idx >= sequence.length) {
        allowInput = true;
        return;
      }

      const crateIdx = sequence[idx];
      crates[crateIdx].classList.add('highlight');
      timer = setTimeout(() => {
        crates[crateIdx].classList.remove('highlight');
        timer = setTimeout(() => playSequence(idx + 1), 300);
      }, 500);
    };

    crates.forEach((c, idx) => {
      c.onpointerdown = () => {
        if (!allowInput || isGameOver) return;
        
        c.classList.add('highlight');
        setTimeout(() => c.classList.remove('highlight'), 200);

        if (sequence[playerIndex] === idx) {
          playerIndex++;
          if (playerIndex >= sequence.length) {
            allowInput = false;
            correct++;
            rounds++;
            currentSpan++; // increase difficulty
            setTimeout(startRound, 1000);
          }
        } else {
          allowInput = false;
          c.classList.add('wrong');
          setTimeout(() => c.classList.remove('wrong'), 500);
          rounds++;
          currentSpan = Math.max(3, currentSpan - 1); // decrease difficulty
          setTimeout(startRound, 1000);
        }
      };
    });

    setTimeout(startRound, 1000);

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

export default crateSpanModule;
