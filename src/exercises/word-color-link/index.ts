import { ExerciseModule, BlockResult } from '../contract';
import { WordColorLinkEngine, Trial } from './engine';

export default {
  manifest: {
    id: 'word-color-link',
    name: 'Цвет слов',
    domain: 'memory',
    skills: ['working_memory', 'recall'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните, каким цветом написано слово. Затем выберите этот цвет из предложенных вариантов.',
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let errors = 0;
    let totalRt = 0;
    let isDestroyed = false;
    let currentTimeout: number;

    const engine = new WordColorLinkEngine();

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = '100%';
    container.style.gap = '20px';
    container.style.padding = '20px';
    el.appendChild(container);

    const wordDiv = document.createElement('div');
    wordDiv.style.fontSize = '4rem';
    wordDiv.style.fontWeight = 'bold';
    container.appendChild(wordDiv);

    const btnsDiv = document.createElement('div');
    btnsDiv.style.display = 'none';
    btnsDiv.style.gap = '15px';
    btnsDiv.style.flexWrap = 'wrap';
    btnsDiv.style.justifyContent = 'center';
    container.appendChild(btnsDiv);

    const runRound = () => {
      if (isDestroyed) return;
      if (isTimeUp()) {
        const acc = rounds === 0 ? 0 : Math.max(0, 1 - errors / rounds);
        onEnd({ accuracy: acc, avgRtMs: rounds > 0 ? totalRt / rounds : 0, rounds });
        return;
      }

      const trial = engine.generateTrial();
      wordDiv.textContent = trial.word;
      wordDiv.style.color = trial.colorHex;
      btnsDiv.style.display = 'none';
      btnsDiv.innerHTML = '';

      const memorizeTime = Math.max(800, 2000 - level * 100);

      currentTimeout = window.setTimeout(() => {
        if (isDestroyed) return;
        wordDiv.style.color = 'var(--text-primary)';
        btnsDiv.style.display = 'flex';

        const startTime = Date.now();

        trial.options.forEach((opt) => {
          const btn = document.createElement('button');
          btn.textContent = opt.label;
          btn.style.padding = '10px 20px';
          btn.style.fontSize = '1.2rem';
          btn.onclick = () => {
            if (isDestroyed) return;
            totalRt += Date.now() - startTime;
            rounds++;
            if (opt.hex !== trial.colorHex) errors++;
            runRound();
          };
          btnsDiv.appendChild(btn);
        });
      }, memorizeTime);
    };

    runRound();

    return () => {
      isDestroyed = true;
      clearTimeout(currentTimeout);
    };
  }
} as ExerciseModule;
