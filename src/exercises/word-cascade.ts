import { ExerciseModule, BlockResult } from './contract';

const wordCascadeModule: ExerciseModule = {
  manifest: {
    id: 'word-cascade',
    name: 'Дежавю',
    domain: 'memory',
    skills: ['working_memory', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Символы появляются один за другим. Если символ уже был показан ранее в этой сессии, нажмите ПОВТОР. Иначе — НОВЫЙ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .wc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .wc-card {
          font-size: 80px;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border-radius: 32px;
          border: 4px solid var(--line);
          transition: transform 0.1s, border-color 0.2s;
        }
        .wc-controls {
          display: flex;
          gap: 40px;
        }
        .wc-btn {
          width: 160px;
          height: 80px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .wc-btn:active { transform: scale(0.95); }
      </style>
      <div class="wc-arena">
        <div class="wc-card" id="wc-card"></div>
        <div class="wc-controls">
          <button class="wc-btn" id="wc-new">НОВЫЙ</button>
          <button class="wc-btn" id="wc-seen">ПОВТОР</button>
        </div>
      </div>
    `;

    const card = el.querySelector('#wc-card') as HTMLElement;
    const btnNew = el.querySelector('#wc-new') as HTMLElement;
    const btnSeen = el.querySelector('#wc-seen') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let seenItems = new Set<string>();
    let currentItem = '';
    let isRepeat = false;

    const symbols = ['♠','♣','♥','♦','★','♦','♪','♫','☼','☾','☁','☂','☃','☄','☯','☠','☢','☣','☪','☮','⚓','⚔','⚖','⚛','⚡','⚢','⚣','⚤','⚥','⚦','⚧','⚨','⚩','⚪','⚫','🔴','🔵','🔶','🔷','🔺','🔻'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const probRepeat = Math.min(0.6, 0.2 + seenItems.size * 0.05);
      isRepeat = seenItems.size > 0 && Math.random() < probRepeat;

      if (isRepeat) {
        const arr = Array.from(seenItems);
        currentItem = arr[Math.floor(Math.random() * arr.length)];
      } else {
        do {
          currentItem = symbols[Math.floor(Math.random() * symbols.length)];
        } while (seenItems.has(currentItem));
      }

      card.textContent = currentItem;
      card.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (ansIsSeen: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ansIsSeen === isRepeat;

      if (isCorrect) {
        correct++;
        card.style.borderColor = 'var(--ok)';
      } else {
        card.style.borderColor = 'var(--danger)';
      }

      seenItems.add(currentItem);

      setTimeout(() => {
        card.textContent = '';
        card.style.borderColor = 'var(--line)';
        setTimeout(startRound, 200);
      }, 500);
    };

    btnNew.onclick = () => handleAns(false);
    btnSeen.onclick = () => handleAns(true);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(false);
      if (e.code === 'ArrowRight') handleAns(true);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
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

export default wordCascadeModule;
