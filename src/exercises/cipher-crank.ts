import { ExerciseModule, BlockResult } from './contract';

const cipherCrankModule: ExerciseModule = {
  manifest: {
    id: 'cipher-crank',
    name: 'Шифровальный ключ',
    domain: 'memory',
    skills: ['working_memory', 'recall'],
    metricModel: 'memory-span',
    instruction: 'Запомните, какой символ (буква) соответствует какой фигуре. Затем воспроизведите последовательность фигур по заданным символам.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cc-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .cc-mapping {
          display: flex;
          gap: 30px;
          height: 80px;
        }
        .cc-pair {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          background: rgba(255,255,255,0.05);
          padding: 15px;
          border-radius: 12px;
          border: 1px solid var(--line);
        }
        .cc-symbol {
          font-size: 32px;
          font-weight: bold;
          color: var(--text);
        }
        .cc-shape {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }
        .cc-sequence {
          display: flex;
          gap: 15px;
          min-height: 50px;
          font-size: 36px;
          font-weight: bold;
          color: var(--accent);
          letter-spacing: 5px;
        }
        .cc-controls {
          display: flex;
          gap: 20px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
        }
        .cc-controls.active {
          opacity: 1;
          pointer-events: auto;
        }
        .cc-btn {
          width: 80px;
          height: 80px;
          font-size: 40px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .cc-btn:active { transform: scale(0.95); }
        .cc-feedback {
          display: flex;
          gap: 10px;
          min-height: 40px;
        }
        .cc-fb-item {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          border-bottom: 2px solid var(--line);
        }
      </style>
      <div class="cc-arena">
        <div class="cc-mapping" id="cc-mapping"></div>
        <div class="cc-sequence" id="cc-sequence"></div>
        <div class="cc-feedback" id="cc-feedback"></div>
        <div class="cc-controls" id="cc-controls"></div>
      </div>
    `;

    const mappingEl = el.querySelector('#cc-mapping') as HTMLElement;
    const sequenceEl = el.querySelector('#cc-sequence') as HTMLElement;
    const controlsEl = el.querySelector('#cc-controls') as HTMLElement;
    const feedbackEl = el.querySelector('#cc-feedback') as HTMLElement;

    const shapes = ['▲', '■', '●', '★', '♦'];
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    let t0 = performance.now();
    let currentMap: Record<string, string> = {};
    let targetSequence: string[] = [];
    let userSequence: string[] = [];
    let phase = 'memorize'; // memorize, recall

    let sequenceLength = 3;
    let mappingSize = 3;

    let timeout: any;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'memorize';
      userSequence = [];
      feedbackEl.innerHTML = '';
      controlsEl.classList.remove('active');
      controlsEl.innerHTML = '';
      
      // Adjust difficulty based on level
      if (level > 2) sequenceLength = 4;
      if (level > 4) mappingSize = 4;
      if (level > 6) sequenceLength = 5;

      // Create mapping
      let availableLetters = [...letters].sort(() => Math.random() - 0.5).slice(0, mappingSize);
      let availableShapes = [...shapes].sort(() => Math.random() - 0.5).slice(0, mappingSize);
      
      currentMap = {};
      availableLetters.forEach((l, i) => {
        currentMap[l] = availableShapes[i];
      });

      // Show mapping
      mappingEl.innerHTML = availableLetters.map(l => `
        <div class="cc-pair">
          <div class="cc-symbol">${l}</div>
          <div class="cc-shape">${currentMap[l]}</div>
        </div>
      `).join('');

      // Create sequence
      targetSequence = [];
      for (let i = 0; i < sequenceLength; i++) {
        targetSequence.push(availableLetters[Math.floor(Math.random() * availableLetters.length)]);
      }

      sequenceEl.innerHTML = 'ЗАПОМИНАНИЕ...';

      // Show for 3-4 seconds
      timeout = setTimeout(() => {
        startRecall(availableShapes);
      }, 3500);
    };

    const startRecall = (availableShapes: string[]) => {
      if (isGameOver) return;
      phase = 'recall';
      mappingEl.innerHTML = ''; // Hide mapping
      sequenceEl.innerHTML = targetSequence.join(' '); // Show sequence

      // Show controls
      // Shuffle shapes for buttons
      const shuffledShapes = [...availableShapes].sort(() => Math.random() - 0.5);
      
      controlsEl.innerHTML = shuffledShapes.map(s => `
        <button class="cc-btn" data-shape="${s}">${s}</button>
      `).join('');

      controlsEl.querySelectorAll('.cc-btn').forEach((b: any) => {
        b.onclick = () => handleInput(b.dataset.shape);
      });

      // Prepare feedback slots
      feedbackEl.innerHTML = targetSequence.map(() => `<div class="cc-fb-item"></div>`).join('');
      
      controlsEl.classList.add('active');
      t0 = performance.now();
    };

    const handleInput = (shape: string) => {
      if (phase !== 'recall' || isGameOver) return;
      
      userSequence.push(shape);
      const currentIndex = userSequence.length - 1;
      
      // Update feedback UI
      const fbItems = feedbackEl.querySelectorAll('.cc-fb-item');
      if (fbItems[currentIndex]) {
        fbItems[currentIndex].innerHTML = shape;
      }

      const expectedShape = currentMap[targetSequence[currentIndex]];
      
      if (shape !== expectedShape) {
        // Error
        fbItems[currentIndex].setAttribute('style', 'color: var(--danger); border-color: var(--danger)');
        finishRound(false);
      } else if (userSequence.length === targetSequence.length) {
        // Success
        fbItems[currentIndex].setAttribute('style', 'color: var(--ok); border-color: var(--ok)');
        finishRound(true);
      }
    };

    const finishRound = (isCorrect: boolean) => {
      phase = 'end';
      rounds++;
      rts.push(performance.now() - t0);
      
      controlsEl.classList.remove('active');

      if (isCorrect) correct++;

      // Show correct mapping briefly
      mappingEl.innerHTML = Object.keys(currentMap).map(l => `
        <div class="cc-pair" style="border-color: ${isCorrect ? 'var(--ok)' : 'var(--danger)'}">
          <div class="cc-symbol">${l}</div>
          <div class="cc-shape" style="color: ${isCorrect ? 'inherit' : 'var(--danger)'}">${currentMap[l]}</div>
        </div>
      `).join('');

      timeout = setTimeout(() => {
        startRound();
      }, 1500);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timeout);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timeout);
    };
  }
};

export default cipherCrankModule;
