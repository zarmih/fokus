import { ExerciseModule, BlockResult } from './contract';

const wordLengthSortModule: ExerciseModule = {
  manifest: {
    id: 'word-length-sort',
    name: 'По длине слов',
    domain: 'speed',
    skills: ['processing_speed', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте на слова в порядке возрастания их длины (от самого короткого к самому длинному).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .wls-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .wls-words {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          justify-content: center;
          gap: 20px;
          max-width: 800px;
        }
        .wls-btn {
          padding: 20px 40px;
          font-size: 24px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, background-color 0.2s, color 0.2s;
        }
        .wls-btn:active { transform: scale(0.95); }
        .wls-btn.selected {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          pointer-events: none;
        }
        .wls-btn.error {
          background: var(--danger);
          color: white;
          border-color: var(--danger);
        }
      </style>
      <div class="wls-arena">
        <div class="wls-words" id="wls-words"></div>
      </div>
    `;

    const wordsEl = el.querySelector('#wls-words') as HTMLElement;

    let t0 = performance.now();
    let currentWords: string[] = [];
    let selectedCount = 0;
    let wordCount = Math.min(3 + Math.floor(level / 2), 6);

    const dictionary = [
      'Я', 'ОН', 'МЫ', 'ЛЕС', 'КОТ', 'ДОМ', 'ВОДА', 'РЫБА', 'СТОЛ', 'СЛОВО', 'ПТИЦА', 'КАМЕНЬ', 'ВЕСНА', 
      'СОБАКА', 'ДЕРЕВО', 'ЯБЛОКО', 'ЧЕЛОВЕК', 'ПРИРОДА', 'САМОЛЕТ', 'КАРАНДАШ', 'ПРОГРАММА', 'ВЕЛОСИПЕД', 
      'ТЕМПЕРАТУРА', 'ЭЛЕКТРИЧЕСТВО'
    ];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      selectedCount = 0;
      wordCount = Math.min(3 + Math.floor(level / 3), 6);

      // Pick words of different lengths
      const lengths = new Set<number>();
      currentWords = [];
      
      let attempts = 0;
      while (currentWords.length < wordCount && attempts < 100) {
        const w = dictionary[Math.floor(Math.random() * dictionary.length)];
        if (!lengths.has(w.length)) {
          lengths.add(w.length);
          currentWords.push(w);
        }
        attempts++;
      }
      
      // Shuffle words for display
      const displayWords = [...currentWords].sort(() => Math.random() - 0.5);
      
      // Sort original for validation (ascending)
      currentWords.sort((a, b) => a.length - b.length);

      wordsEl.innerHTML = '';
      displayWords.forEach((w) => {
        const btn = document.createElement('button');
        btn.className = 'wls-btn';
        btn.textContent = w;
        btn.onclick = () => handleAns(btn, w);
        wordsEl.appendChild(btn);
      });

      t0 = performance.now();
    };

    const handleAns = (btn: HTMLElement, word: string) => {
      if (isGameOver) return;

      const expected = currentWords[selectedCount];
      
      if (word === expected) {
        btn.classList.add('selected');
        selectedCount++;
        
        if (selectedCount === currentWords.length) {
          rounds++;
          correct++;
          rts.push(performance.now() - t0);
          setTimeout(startRound, 300);
        }
      } else {
        btn.classList.add('error');
        rounds++;
        rts.push(performance.now() - t0);
        setTimeout(startRound, 500);
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default wordLengthSortModule;
