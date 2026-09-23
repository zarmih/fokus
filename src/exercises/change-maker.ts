import { ExerciseModule, BlockResult } from './contract';

const changeMakerModule: ExerciseModule = {
  manifest: {
    id: 'change-maker',
    name: 'Кассир',
    domain: 'logic',
    skills: ['mental_calculation', 'numerical_processing'],
    metricModel: 'speed-accuracy',
    instruction: 'Рассчитайте и выберите правильную сумму сдачи.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .cm-bill {
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 16px;
          padding: 24px 40px;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .cm-row {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          font-size: 24px;
          margin-bottom: 12px;
        }
        .cm-label { color: var(--text-dim); }
        .cm-value { font-weight: bold; color: var(--text); }
        .cm-divider { height: 2px; background: var(--line); margin: 16px 0; }
        
        .cm-options {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .cm-option {
          padding: 16px 32px;
          font-size: 28px;
          font-weight: 800;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s, background 0.2s;
          user-select: none;
        }
        .cm-option:active { transform: scale(0.95); }
        .cm-option:hover { border-color: var(--primary); }
      </style>
      <div class="cm-arena">
        <div class="cm-bill">
          <div class="cm-row">
            <span class="cm-label">Цена:</span>
            <span class="cm-value" id="cm-price">0</span>
          </div>
          <div class="cm-row">
            <span class="cm-label">Оплата:</span>
            <span class="cm-value" id="cm-paid">0</span>
          </div>
          <div class="cm-divider"></div>
          <div style="font-size: 20px; color: var(--text-dim);">Сдача = ?</div>
        </div>
        <div class="cm-options" id="cm-options"></div>
      </div>
    `;

    const priceEl = el.querySelector('#cm-price') as HTMLElement;
    const paidEl = el.querySelector('#cm-paid') as HTMLElement;
    const optionsEl = el.querySelector('#cm-options') as HTMLElement;

    let t0 = performance.now();
    let clickDisabled = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      clickDisabled = false;

      // Logic for price and paid
      // Level 1-3: ends in 0 or 5, paid is neat (50, 100)
      // Level 4-6: price is any, paid is neat (50, 100, 500)
      // Level 7+: price is any, paid is weird (e.g. 100 but price is 37)
      
      let price = 0;
      let paid = 0;

      if (level <= 3) {
        price = Math.floor(Math.random() * 8 + 1) * 5; // 5 to 40
        paid = 50;
        if (price > 40) { paid = 100; price = Math.floor(Math.random() * 8 + 1) * 10; }
      } else if (level <= 6) {
        price = Math.floor(Math.random() * 80) + 10; // 10 to 89
        paid = price < 50 ? 50 : 100;
      } else {
        price = Math.floor(Math.random() * 400) + 20; // 20 to 419
        if (price < 100) paid = 100;
        else if (price < 500) paid = 500;
        else paid = 1000;
        
        // sometimes non-round paid like paying 550 for 423 (to get smaller change)
        if (Math.random() > 0.7) {
            const extra = Math.floor(Math.random() * 4 + 1) * 10;
            paid = price + extra + Math.floor(Math.random() * 20);
            paid = Math.ceil(paid / 10) * 10;
        }
      }

      const change = paid - price;
      
      priceEl.textContent = price.toString();
      paidEl.textContent = paid.toString();

      // Generate options
      let options = [change];
      while (options.length < 3) {
        let dist = (Math.floor(Math.random() * 5) + 1) * 10;
        let distSmall = Math.floor(Math.random() * 5) + 1;
        
        // typical errors: off by 10, off by 1 in units place
        let err = change;
        if (Math.random() > 0.5) err += dist;
        else err -= dist;
        
        if (Math.random() > 0.5) {
            err += (Math.random() > 0.5 ? distSmall : -distSmall);
        }

        if (err > 0 && err !== change && !options.includes(err)) {
          options.push(err);
        }
      }

      options.sort(() => Math.random() - 0.5);
      
      optionsEl.innerHTML = '';
      options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'cm-option';
        btn.textContent = opt.toString();
        
        btn.onclick = () => {
          if (clickDisabled || isGameOver) return;
          clickDisabled = true;
          rounds++;
          rts.push(performance.now() - t0);

          if (opt === change) {
            correct++;
            btn.style.borderColor = 'var(--ok)';
            btn.style.background = 'rgba(16, 185, 129, 0.1)';
            setTimeout(startRound, 300);
          } else {
            btn.style.borderColor = 'var(--danger)';
            btn.style.background = 'rgba(239, 68, 68, 0.1)';
            setTimeout(startRound, 800);
          }
        };
        
        optionsEl.appendChild(btn);
      });

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default changeMakerModule;
