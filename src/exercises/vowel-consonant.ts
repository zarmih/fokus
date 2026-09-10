import { ExerciseModule, BlockResult } from './contract';

const vowelConsonantModule: ExerciseModule = {
  manifest: {
    id: 'vowel-consonant',
    name: 'Алфавит',
    domain: 'flexibility',
    skills: ['rule_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Если цвет слова СИНИЙ — нажмите "Гласная". Если ОРАНЖЕВЫЙ — "Согласная", вне зависимости от буквы.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .vc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .vc-word {
          font-size: 80px;
          font-weight: 800;
          text-transform: uppercase;
          transition: color 0.1s;
        }
        .vc-controls {
          display: flex;
          gap: 40px;
        }
        .vc-btn {
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
        .vc-btn:active { transform: scale(0.95); }
      </style>
      <div class="vc-arena">
        <div class="vc-word" id="vc-word"></div>
        <div class="vc-controls">
          <button class="vc-btn" id="vc-vowel">Гласная</button>
          <button class="vc-btn" id="vc-cons">Согласная</button>
        </div>
      </div>
    `;

    const wordEl = el.querySelector('#vc-word') as HTMLElement;
    const btnVowel = el.querySelector('#vc-vowel') as HTMLElement;
    const btnCons = el.querySelector('#vc-cons') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIsVowel = false; // "vowel" button is correct

    const vowels = 'АЕЁИОУЫЭЮЯ'.split('');
    const consonants = 'БВГДЖЗЙКЛМНПРСТФХЦЧШЩ'.split('');

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const isBlue = Math.random() > 0.5; // Blue -> true if vowel, Orange -> true if consonant. Wait, instruction says:
      // "Если цвет слова СИНИЙ — нажмите Гласная (оцениваем букву). Если ОРАНЖЕВЫЙ — нажмите Согласная".
      // Wait, standard task:
      // If color is Blue: judge if the letter is a vowel.
      // If color is Orange: judge if the letter is a consonant.
      // Let me re-read my instruction: "Если цвет слова СИНИЙ — нажмите "Гласная". Если ОРАНЖЕВЫЙ — "Согласная", вне зависимости от буквы." That's a Stroop, not a rule switch.
      // Let's refine the standard task:
      // "СИНИЙ цвет — нажмите 'Да', если начинается на ГЛАСНУЮ. ОРАНЖЕВЫЙ цвет — нажмите 'Да', если начинается на СОГЛАСНУЮ."
      // Let's use two buttons: 'Гласная' and 'Согласная', and rule is: just classify the letter.
      // The switch is: If background is split, top half is vowel/cons, bottom half is odd/even? No, just letters.
      // Actually, standard rule switch:
      // Vowel / Consonant classification vs Upper / Lower case classification.
      // Let's do: "СИНИЙ — Гласная/Согласная? ОРАНЖЕВЫЙ — ЗАГЛАВНАЯ/строчная?"
      // But we just have Vowel/Cons buttons... Oh I can change labels!
      // Let's stick to the simplest:
      // Blue -> classify as Vowel/Consonant.
      // Orange -> classify as Upper/Lower case.
      // Buttons: [Гласная / ЗАГЛАВНАЯ] and [Согласная / строчная]

      const isColorBlue = Math.random() > 0.5;
      const isVowel = Math.random() > 0.5;
      const isUpper = Math.random() > 0.5;

      const charPool = isVowel ? vowels : consonants;
      let char = charPool[Math.floor(Math.random() * charPool.length)];
      if (!isUpper) char = char.toLowerCase();

      wordEl.textContent = char;
      wordEl.style.color = isColorBlue ? '#3b82f6' : '#f97316';

      btnVowel.innerHTML = 'Гласная<br><small>ЗАГЛАВНАЯ</small>';
      btnCons.innerHTML = 'Согласная<br><small>строчная</small>';

      // Left button (Vowel/Upper), Right button (Cons/Lower)
      if (isColorBlue) {
        targetIsVowel = isVowel; // Left if vowel, Right if cons
      } else {
        targetIsVowel = isUpper; // Left if upper, Right if lower
      }

      btnVowel.style.borderColor = 'var(--line)';
      btnCons.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = choseLeft === targetIsVowel;

      if (isCorrect) {
        correct++;
        if (choseLeft) btnVowel.style.borderColor = 'var(--ok)';
        else btnCons.style.borderColor = 'var(--ok)';
      } else {
        if (choseLeft) btnVowel.style.borderColor = 'var(--danger)';
        else btnCons.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnVowel.onclick = () => handleAns(true);
    btnCons.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    // Patch instruction slightly directly in DOM to reflect new logic if needed.
    // We already passed the instruction in manifest, I'll update it there.

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

// Patching manifest instruction to match the implementation
vowelConsonantModule.manifest.instruction = 'СИНИЙ цвет буквы: Гласная или Согласная? ОРАНЖЕВЫЙ цвет: ЗАГЛАВНАЯ или строчная?';

export default vowelConsonantModule;
