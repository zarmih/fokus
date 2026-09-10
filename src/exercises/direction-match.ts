import { ExerciseModule, BlockResult } from './contract';

const directionMatchModule: ExerciseModule = {
  manifest: {
    id: 'direction-match',
    name: 'Вектор',
    domain: 'flexibility',
    skills: ['rule_switching', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Если текст БЕЛЫЙ — нажимайте по тексту. Если текст ЖЁЛТЫЙ — нажимайте туда, куда указывает стрелка.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .dm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .dm-card {
          width: 240px;
          height: 240px;
          background: rgba(255,255,255,0.05);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          transition: transform 0.1s, background 0.2s;
        }
        .dm-arrow {
          font-size: 80px;
          color: var(--text);
        }
        .dm-text {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: 2px;
        }
        .dm-controls {
          display: flex;
          gap: 24px;
        }
        .dm-btn {
          width: 80px;
          height: 80px;
          font-size: 40px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .dm-btn:active { transform: scale(0.9); }
      </style>
      <div class="dm-arena">
        <div class="dm-card" id="dm-card">
          <div class="dm-arrow" id="dm-arrow"></div>
          <div class="dm-text" id="dm-text"></div>
        </div>
        <div class="dm-controls">
          <button class="dm-btn" id="dm-left">←</button>
          <button class="dm-btn" id="dm-right">→</button>
        </div>
      </div>
    `;

    const card = el.querySelector('#dm-card') as HTMLElement;
    const arrowEl = el.querySelector('#dm-arrow') as HTMLElement;
    const textEl = el.querySelector('#dm-text') as HTMLElement;
    const btnLeft = el.querySelector('#dm-left') as HTMLElement;
    const btnRight = el.querySelector('#dm-right') as HTMLElement;

    let targetDir = 'left';
    let t0 = performance.now();
    let phase = 'input';

    const switchProb = 0.3 + level * 0.05;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      const isArrowRule = Math.random() < switchProb;
      const arrowDir = Math.random() > 0.5 ? 'left' : 'right';
      const textDir = Math.random() > 0.5 ? 'left' : 'right';

      targetDir = isArrowRule ? arrowDir : textDir;

      arrowEl.textContent = arrowDir === 'left' ? '←' : '→';
      textEl.textContent = textDir === 'left' ? 'ВЛЕВО' : 'ВПРАВО';
      
      textEl.style.color = isArrowRule ? 'var(--accent)' : 'var(--text)';

      t0 = performance.now();
    };

    const handleAns = (dir: string) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      if (dir === targetDir) {
        correct++;
        card.style.background = 'rgba(16, 185, 129, 0.2)';
      } else {
        card.style.background = 'rgba(239, 68, 68, 0.2)';
        card.style.transform = 'translateX(10px)';
      }

      setTimeout(() => {
        card.style.background = 'rgba(255,255,255,0.05)';
        card.style.transform = 'none';
        startRound();
      }, 300);
    };

    btnLeft.onclick = () => handleAns('left');
    btnRight.onclick = () => handleAns('right');

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns('left');
      if (e.key === 'ArrowRight') handleAns('right');
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

export default directionMatchModule;
