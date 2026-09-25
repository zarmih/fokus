import { ExerciseModule, BlockResult } from './contract';

const WORDS = [
  'АВТОМОБИЛЬ', // А(1) О(1) И(1) -> 3. В(1) Т(1) М(1) Б(1) Л(1) -> 5 (V < C)
  'ОКОЕ', // О(2) Е(1) -> 3. К(1) -> 1 (V > C)
  'АУДИО', // А(1) У(1) И(1) О(1) -> 4. Д(1) -> 1 (V > C)
  'ЯБЛОКО', // Я(1) О(2) -> 3. Б(1) Л(1) К(1) -> 3 (V = C -> V not > C)
  'КНИГА', // И(1) А(1) -> 2. К(1) Н(1) Г(1) -> 3 (V < C)
  'АВИАЦИЯ', // А(2) И(2) Я(1) -> 5. В(1) Ц(1) -> 2 (V > C)
  'ИДЕЯ', // И(1) Е(1) Я(1) -> 3. Д(1) -> 1 (V > C)
  'КОМПЬЮТЕР', // О(1) Ю(1) Е(1) -> 3. К(1) М(1) П(1) Т(1) Р(1) -> 5 (V < C)
  'ЭВОЛЮЦИЯ', // Э(1) О(1) Ю(1) И(1) Я(1) -> 5. В(1) Л(1) Ц(1) -> 3 (V > C)
  'СТРОИТЕЛЬСТВО', // О(2) И(1) Е(1) -> 4. С(2) Т(3) Р(1) Л(1) В(1) -> 8 (V < C)
  'УЕДИНЕНИЕ', // У(1) Е(3) И(1) -> 5. Д(1) Н(2) -> 3 (V > C)
  'АЛИБИ' // А(1) И(2) -> 3. Л(1) Б(1) -> 2 (V > C)
];

const VOWELS = new Set(['А', 'Е', 'Ё', 'И', 'О', 'У', 'Ы', 'Э', 'Ю', 'Я']);
const CONSONANTS = new Set(['Б', 'В', 'Г', 'Д', 'Ж', 'З', 'Й', 'К', 'Л', 'М', 'Н', 'П', 'Р', 'С', 'Т', 'Ф', 'Х', 'Ц', 'Ч', 'Ш', 'Щ']);

const vowelConsonantCountModule: ExerciseModule = {
  manifest: {
    id: 'vowel-consonant-count',
    name: 'Гласные и Согласные',
    domain: 'speed',
    skills: ['processing_speed', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Если в слове гласных больше, чем согласных — жмите «Да» (Влево). Иначе — «Нет» (Вправо).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .vcc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .vcc-target {
          font-size: 64px;
          font-weight: bold;
          letter-spacing: 2px;
          text-align: center;
        }
        .vcc-controls {
          display: flex;
          gap: 20px;
        }
        .vcc-btn {
          padding: 20px 40px;
          font-size: 24px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .vcc-btn:active { transform: scale(0.95); }
      </style>
      <div class="vcc-arena">
        <div class="vcc-target" id="vcc-target"></div>
        <div class="vcc-controls">
          <button class="vcc-btn" id="vcc-yes">Да (Влево)</button>
          <button class="vcc-btn" id="vcc-no">Нет (Вправо)</button>
        </div>
      </div>
    `;

    const targetEl = el.querySelector('#vcc-target') as HTMLElement;
    const btnYes = el.querySelector('#vcc-yes') as HTMLElement;
    const btnNo = el.querySelector('#vcc-no') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let isVowelsGreater = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      
      let vCount = 0;
      let cCount = 0;
      for (const char of word) {
        if (VOWELS.has(char)) vCount++;
        else if (CONSONANTS.has(char)) cCount++;
      }
      
      isVowelsGreater = vCount > cCount;
      targetEl.textContent = word;

      btnYes.style.borderColor = 'var(--line)';
      btnNo.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (yes: boolean, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = yes === isVowelsGreater;

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnYes.onclick = () => handleAns(true, btnYes);
    btnNo.onclick = () => handleAns(false, btnNo);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true, btnYes);
      if (e.code === 'ArrowRight') handleAns(false, btnNo);
    };
    window.addEventListener('keydown', onKey);

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

export default vowelConsonantCountModule;
