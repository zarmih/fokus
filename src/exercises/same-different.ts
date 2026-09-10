import { ExerciseModule, BlockResult } from './contract';

const sameDifferentModule: ExerciseModule = {
  manifest: {
    id: 'same-different',
    name: 'Близнецы',
    domain: 'speed',
    skills: ['processing_speed', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите, являются ли две фигуры АБСОЛЮТНО ОДИНАКОВЫМИ.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sd-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .sd-pair {
          display: flex;
          gap: 40px;
          align-items: center;
          justify-content: center;
        }
        .sd-item {
          font-size: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 120px;
          height: 120px;
          background: rgba(255,255,255,0.05);
          border-radius: 24px;
          border: 4px solid var(--line);
        }
        .sd-controls {
          display: flex;
          gap: 40px;
          width: 100%;
          justify-content: center;
        }
        .sd-btn {
          width: 160px;
          height: 80px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .sd-btn:active { transform: scale(0.95); }
      </style>
      <div class="sd-arena">
        <div class="sd-pair">
          <div class="sd-item" id="sd-left"></div>
          <div class="sd-item" id="sd-right"></div>
        </div>
        <div class="sd-controls">
          <button class="sd-btn" id="sd-btn-same">Одинаковые</button>
          <button class="sd-btn" id="sd-btn-diff">Разные</button>
        </div>
      </div>
    `;

    const leftEl = el.querySelector('#sd-left') as HTMLElement;
    const rightEl = el.querySelector('#sd-right') as HTMLElement;
    const btnSame = el.querySelector('#sd-btn-same') as HTMLElement;
    const btnDiff = el.querySelector('#sd-btn-diff') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIsSame = false;

    // Complex Unicode symbols to make it slightly challenging
    const symbols = [
      '۞', '۩', 'ᴥ', 'ᴕ', 'ᴨ', 'ᴪ', 'ᵯ', 'ᵰ', 'ᵱ', 'ᵲ',
      'ᵳ', 'ᵴ', 'ᵵ', 'ᵶ', 'ᵷ', 'ᵸ', 'ᵹ', 'ᵺ', 'ᵻ', 'ᵼ',
      '℗', '℘', 'ℛ', 'ℜ', '℣', '℥', '℧', 'ℨ', 'K', 'Å',
      'ℬ', 'ℭ', '℮', 'ℯ', 'ℰ', 'ℱ', 'Ⅎ', 'ℳ', 'ℴ', 'ℵ'
    ];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      targetIsSame = Math.random() > 0.5;

      const baseIdx = Math.floor(Math.random() * symbols.length);
      const baseSym = symbols[baseIdx];

      let otherSym = baseSym;
      if (!targetIsSame) {
        let otherIdx = Math.floor(Math.random() * symbols.length);
        while (otherIdx === baseIdx) {
          otherIdx = Math.floor(Math.random() * symbols.length);
        }
        otherSym = symbols[otherIdx];
      }

      leftEl.textContent = baseSym;
      rightEl.textContent = otherSym;

      // Color variation at higher levels
      if (level > 4) {
        const c1 = Math.random() > 0.5 ? '#3b82f6' : '#ef4444';
        const c2 = targetIsSame ? c1 : (Math.random() > 0.5 ? '#3b82f6' : '#ef4444');
        leftEl.style.color = c1;
        rightEl.style.color = c2;
        // If colors are different, then they are definitely different, but we consider the whole object.
        // Wait, if instruction says ABSOLUTELY IDENTICAL, color must match too.
        // Let's refine targetIsSame definition:
        if (c1 !== c2) targetIsSame = false;
      } else {
        leftEl.style.color = 'var(--text)';
        rightEl.style.color = 'var(--text)';
      }

      leftEl.style.borderColor = 'var(--line)';
      rightEl.style.borderColor = 'var(--line)';
      btnSame.style.borderColor = 'var(--line)';
      btnDiff.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (ansIsSame: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ansIsSame === targetIsSame;

      if (isCorrect) {
        correct++;
        leftEl.style.borderColor = 'var(--ok)';
        rightEl.style.borderColor = 'var(--ok)';
        if (ansIsSame) btnSame.style.borderColor = 'var(--ok)';
        else btnDiff.style.borderColor = 'var(--ok)';
      } else {
        leftEl.style.borderColor = 'var(--danger)';
        rightEl.style.borderColor = 'var(--danger)';
        if (ansIsSame) btnSame.style.borderColor = 'var(--danger)';
        else btnDiff.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnSame.onclick = () => handleAns(true);
    btnDiff.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 800;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default sameDifferentModule;
