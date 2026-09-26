import { ExerciseModule, BlockResult } from './contract';

const symbolMatchModule: ExerciseModule = {
  manifest: {
    id: 'symbol-match',
    name: 'Совпадение символов',
    domain: 'attention',
    skills: ['visual_scanning', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Найдите один символ, который есть на обеих карточках. Нажмите на него.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .sm-cards {
          display: flex;
          gap: 20px;
        }
        @media (max-width: 600px) {
          .sm-cards {
            flex-direction: column;
          }
        }
        .sm-card {
          width: 200px;
          height: 200px;
          border: 4px solid var(--line);
          border-radius: 50%;
          position: relative;
          background: var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sm-symbol {
          position: absolute;
          font-size: 32px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s;
        }
        .sm-symbol:active { transform: scale(0.8); }
      </style>
      <div class="sm-arena" id="sm-arena">
        <div class="sm-cards" id="sm-cards"></div>
      </div>
    `;

    const arena = el.querySelector('#sm-arena') as HTMLElement;
    const cardsContainer = el.querySelector('#sm-cards') as HTMLElement;
    
    // Some distinct emoji/symbols
    const allSymbols = ['⭐','🔥','⚡','☀️','🌙','☁️','❄️','💧','🍎','🍒','🍓','🍉','🍌','🍕','🍔','🍟','⚽','🏀','🎾','🎱','🚗','🚀','✈️','🛸','🐶','🐱','🐭','🦊'];
    
    let currentTarget = '';
    let t0 = performance.now();
    
    const count = Math.min(4 + level, 8);

    const handleAns = (sym: string) => {
      if (isGameOver) return;
      rounds++;
      if (sym === currentTarget) {
        correct++;
        arena.style.background = 'rgba(16, 185, 129, 0.05)';
      } else {
        errors++;
        arena.style.background = 'rgba(239, 68, 68, 0.05)';
      }
      setTimeout(() => arena.style.background = 'transparent', 150);
      rts.push(performance.now() - t0);
      startRound();
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      const shuffled = [...allSymbols].sort(() => Math.random() - 0.5);
      const chosen = shuffled.slice(0, count * 2 - 1);
      
      currentTarget = chosen[0];
      
      const card1Syms = [currentTarget, ...chosen.slice(1, count)];
      const card2Syms = [currentTarget, ...chosen.slice(count, count * 2 - 1)];
      
      card1Syms.sort(() => Math.random() - 0.5);
      card2Syms.sort(() => Math.random() - 0.5);

      cardsContainer.innerHTML = '';
      
      const renderCard = (syms: string[]) => {
        const card = document.createElement('div');
        card.className = 'sm-card';
        syms.forEach((sym, i) => {
          const el = document.createElement('div');
          el.className = 'sm-symbol';
          el.textContent = sym;
          
          const angle = (i / syms.length) * Math.PI * 2;
          const r = 50 + Math.random() * 30; // 50-80
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          el.style.transform = `translate(${x}px, ${y}px) scale(${0.8 + Math.random()*0.6})`;
          
          el.onclick = () => handleAns(sym);
          card.appendChild(el);
        });
        cardsContainer.appendChild(card);
      };
      
      renderCard(card1Syms);
      renderCard(card2Syms);

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default symbolMatchModule;
