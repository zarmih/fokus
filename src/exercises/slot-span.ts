import { ExerciseModule, BlockResult } from './contract';

const slotSpanModule: ExerciseModule = {
  manifest: {
    id: 'slot-span',
    name: 'Ячейки',
    domain: 'memory',
    skills: ['working_memory', 'visual_memory', 'spatial_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните символы в ячейках. Затем восстановите их в правильном порядке.'
  },
  
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .ss-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 40px; }
        .ss-slots { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; max-width: 600px; }
        .ss-slot { width: 64px; height: 64px; border: 2px dashed var(--line); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; background: var(--surface); color: var(--text); }
        .ss-slot.active { border-color: var(--primary); box-shadow: 0 0 10px rgba(17, 138, 178, 0.3); }
        .ss-palette { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; max-width: 600px; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
        .ss-palette.visible { opacity: 1; pointer-events: auto; }
        .ss-btn { width: 56px; height: 56px; border-radius: 12px; background: var(--surface); border: 2px solid var(--line); font-size: 24px; font-weight: bold; cursor: pointer; color: var(--text); }
        .ss-btn:active { transform: scale(0.95); }
      </style>
      <div class="ss-arena">
        <div class="ss-slots" id="ss-slots"></div>
        <div class="ss-palette" id="ss-palette"></div>
      </div>
    `;

    const slotsEl = el.querySelector('#ss-slots') as HTMLElement;
    const paletteEl = el.querySelector('#ss-palette') as HTMLElement;

    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    let sequence: string[] = [];
    let userSequence: string[] = [];
    let t0 = 0;
    let displayTimeout: any;
    let resultTimeout: any;

    const span = Math.min(8, 2 + Math.floor(level / 2));

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) return endBlock();

      userSequence = [];
      slotsEl.innerHTML = '';
      paletteEl.innerHTML = '';
      paletteEl.classList.remove('visible');

      const available = [...glyphs];
      sequence = [];
      for (let i = 0; i < span; i++) {
        const idx = Math.floor(Math.random() * available.length);
        sequence.push(available[idx]);
        available.splice(idx, 1);
      }

      for (let i = 0; i < span; i++) {
        const s = document.createElement('div');
        s.className = 'ss-slot';
        s.textContent = sequence[i];
        slotsEl.appendChild(s);
      }

      let palette = [...sequence];
      while (palette.length < span + 3) {
        const char = glyphs[Math.floor(Math.random() * glyphs.length)];
        if (!palette.includes(char)) palette.push(char);
      }
      palette.sort(() => Math.random() - 0.5);

      palette.forEach(char => {
        const btn = document.createElement('button');
        btn.className = 'ss-btn';
        btn.textContent = char;
        btn.onclick = () => handleInput(char);
        paletteEl.appendChild(btn);
      });

      const displayMs = 1500 + span * 300;
      displayTimeout = setTimeout(() => {
        if (isGameOver) return;
        Array.from(slotsEl.children).forEach((el: any) => el.textContent = '');
        if (slotsEl.children[0]) slotsEl.children[0].classList.add('active');
        paletteEl.classList.add('visible');
        t0 = performance.now();
      }, displayMs);
    };

    const handleInput = (char: string) => {
      if (isGameOver) return;
      userSequence.push(char);
      
      const currentSlot = userSequence.length - 1;
      const slotDivs = Array.from(slotsEl.children) as HTMLElement[];
      
      if (currentSlot < slotDivs.length) {
        slotDivs[currentSlot].textContent = char;
        slotDivs[currentSlot].classList.remove('active');
        if (currentSlot + 1 < slotDivs.length) {
          slotDivs[currentSlot + 1].classList.add('active');
        }
      }

      if (userSequence.length === span) {
        rounds++;
        rts.push(performance.now() - t0);
        paletteEl.classList.remove('visible');

        const isCorrect = userSequence.join('') === sequence.join('');
        if (isCorrect) correct++;

        for (let i = 0; i < span; i++) {
          slotDivs[i].style.borderColor = userSequence[i] === sequence[i] ? 'var(--ok)' : 'var(--danger)';
          slotDivs[i].style.color = userSequence[i] === sequence[i] ? 'var(--ok)' : 'var(--danger)';
          if (userSequence[i] !== sequence[i]) {
             slotDivs[i].textContent = `${userSequence[i]}(${sequence[i]})`;
             slotDivs[i].style.fontSize = '18px';
          }
        }

        resultTimeout = setTimeout(startRound, 1500);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(displayTimeout);
      clearTimeout(resultTimeout);
      onEnd({
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000,
        rounds
      });
    };

    return () => {
      isGameOver = true;
      clearTimeout(displayTimeout);
      clearTimeout(resultTimeout);
    };
  }
};

export default slotSpanModule;
