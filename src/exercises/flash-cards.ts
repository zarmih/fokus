import { ExerciseModule, BlockResult } from './contract';

const flashCardsModule: ExerciseModule = {
  manifest: {
    id: 'flash-cards',
    name: 'Где же он?',
    domain: 'memory',
    skills: ['visual_memory', 'working_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните расположение карточек. Затем найдите заданную.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let t0 = performance.now();

    const count = Math.min(12, 4 + Math.floor(level) * 2);

    el.innerHTML = `
      <style>
        .fc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 24px;
        }
        .fc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
          gap: 12px;
          width: 100%;
          max-width: 300px;
        }
        .fc-card {
          width: 60px;
          height: 80px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          cursor: pointer;
          transition: transform 0.3s;
          transform-style: preserve-3d;
        }
        .fc-card.flipped {
          transform: rotateY(180deg);
          background: var(--accent);
          color: transparent;
          border-color: var(--accent);
        }
        .fc-card.correct {
          background: var(--ok);
          transform: rotateY(0deg);
          color: #fff;
        }
        .fc-card.wrong {
          background: var(--danger);
          transform: rotateY(0deg);
          color: #fff;
        }
        .fc-task {
          font-size: 20px;
          font-weight: 600;
          color: var(--text);
          height: 30px;
        }
      </style>
      <div class="fc-arena">
        <div class="fc-task" id="fc-task">Запоминайте...</div>
        <div class="fc-grid" id="fc-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#fc-grid') as HTMLElement;
    const taskEl = el.querySelector('#fc-task') as HTMLElement;
    
    const icons = ['🍎', '🍌', '🍒', '🍇', '🍉', '🍓', '🍑', '🍍', '🥥', '🥝', '🍋', '🍐'];
    let currentTarget = '';
    let isInputPhase = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      grid.innerHTML = '';
      isInputPhase = false;
      taskEl.textContent = 'Запоминайте...';
      
      const subset = [...icons].sort(() => Math.random() - 0.5).slice(0, count);
      currentTarget = subset[Math.floor(Math.random() * subset.length)];

      const cards: HTMLElement[] = [];

      subset.forEach(icon => {
        const card = document.createElement('div');
        card.className = 'fc-card';
        card.textContent = icon;
        card.onclick = () => {
          if (!isInputPhase || isGameOver) return;
          isInputPhase = false;
          rounds++;
          rts.push(performance.now() - t0);
          
          if (icon === currentTarget) {
            correct++;
            card.classList.add('correct');
          } else {
            card.classList.add('wrong');
            // show the correct one
            cards.forEach(c => {
              if (c.textContent === currentTarget) c.classList.add('correct');
            });
          }
          
          setTimeout(startRound, 800);
        };
        cards.push(card);
        grid.appendChild(card);
      });

      // Flip after delay
      setTimeout(() => {
        if (isGameOver) return;
        cards.forEach(c => c.classList.add('flipped'));
        taskEl.innerHTML = `Где: <b>${currentTarget}</b>?`;
        isInputPhase = true;
        t0 = performance.now();
      }, 2000 + level * 200);
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default flashCardsModule;
