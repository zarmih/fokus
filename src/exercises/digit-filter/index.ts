import { ExerciseModule, BlockResult } from '../contract';
import { DigitFilterEngine } from './engine';

export default {
  manifest: {
    id: 'digit-filter',
    name: 'Фильтр цифр',
    domain: 'attention',
    skills: ['inhibition', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте ПРОБЕЛ (или касайтесь экрана) ТОЛЬКО когда видите ЧЕТНУЮ ЦИФРУ. Игнорируйте нечетные цифры и буквы.',
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let errors = 0;
    let totalRt = 0;
    let isDestroyed = false;
    let currentTimeout: number;

    const engine = new DigitFilterEngine();

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = '100%';
    container.style.userSelect = 'none';
    el.appendChild(container);

    const charDiv = document.createElement('div');
    charDiv.style.fontSize = '8rem';
    charDiv.style.fontWeight = 'bold';
    charDiv.style.color = 'var(--text-primary)';
    container.appendChild(charDiv);

    let isTarget = false;
    let startTime = 0;
    let hasResponded = false;

    const runRound = () => {
      if (isDestroyed) return;
      if (isTimeUp()) {
        const acc = rounds === 0 ? 0 : Math.max(0, 1 - errors / rounds);
        onEnd({ accuracy: acc, avgRtMs: rounds > 0 ? totalRt / rounds : 0, rounds });
        return;
      }

      hasResponded = false;
      const trial = engine.generateStream(level);
      isTarget = trial.isTarget;
      charDiv.textContent = trial.char;
      startTime = Date.now();

      // Clear screen early to create a flash effect
      window.setTimeout(() => {
        if (!isDestroyed) {
          charDiv.textContent = '';
        }
      }, 500);

      const delay = Math.max(600, 1500 - level * 100);
      currentTimeout = window.setTimeout(() => {
        if (!isDestroyed) {
          if (isTarget && !hasResponded) {
            errors++;
            rounds++;
          } else if (!isTarget && !hasResponded) {
            rounds++;
          }
          runRound();
        }
      }, delay);
    };

    runRound();

    const handleInput = () => {
      if (isDestroyed || hasResponded) return;
      hasResponded = true;
      if (isTarget) {
        totalRt += Date.now() - startTime;
        rounds++;
      } else {
        errors++;
        rounds++;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    container.addEventListener('pointerdown', handleInput);

    return () => {
      isDestroyed = true;
      clearTimeout(currentTimeout);
      window.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('pointerdown', handleInput);
    };
  }
} as ExerciseModule;
