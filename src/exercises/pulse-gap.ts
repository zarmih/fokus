import { ExerciseModule, BlockResult } from './contract';

export default {
  manifest: {
    id: 'pulse-gap',
    name: 'Пропуск пульса',
    domain: 'speed',
    skills: ['reaction_speed', 'processing_speed'],
    metricModel: 'timing-precision',
    instruction: 'Следите за последовательностью вспышек. Один из элементов пропустит свою очередь. После окончания серии укажите, где был пропуск.',
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let errors = 0;
    let totalRt = 0;
    let isDestroyed = false;
    let currentTimeout: number;

    const runRound = () => {
      if (isDestroyed) return;
      if (isTimeUp()) {
        const acc = rounds === 0 ? 0 : Math.max(0, 1 - errors / rounds);
        onEnd({ accuracy: acc, avgRtMs: rounds > 0 ? totalRt / rounds : 0, rounds });
        return;
      }
      
      const numDots = Math.min(12, 4 + Math.floor(level / 2));
      const tempo = Math.max(150, 600 - level * 40);
      
      el.innerHTML = '';
      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.gap = '15px';
      container.style.justifyContent = 'center';
      container.style.alignItems = 'center';
      container.style.height = '100%';
      container.style.flexWrap = 'wrap';
      container.style.padding = '20px';
      el.appendChild(container);

      const dots: HTMLDivElement[] = [];
      for (let i = 0; i < numDots; i++) {
        const dot = document.createElement('div');
        dot.style.width = '40px';
        dot.style.height = '40px';
        dot.style.borderRadius = '50%';
        dot.style.backgroundColor = 'var(--surface)';
        dot.style.border = '2px solid var(--border)';
        dot.style.transition = 'background-color 0.1s';
        container.appendChild(dot);
        dots.push(dot);
      }

      const missingIndex = Math.floor(Math.random() * numDots);
      let currentIndex = 0;

      const flashNext = () => {
        if (isDestroyed) return;
        if (currentIndex >= numDots) {
          // Enable user input
          const startTime = Date.now();
          dots.forEach((dot, idx) => {
            dot.style.cursor = 'pointer';
            dot.onclick = () => {
              if (isDestroyed) return;
              const rt = Date.now() - startTime;
              totalRt += rt;
              rounds++;
              if (idx !== missingIndex) {
                errors++;
                dot.style.backgroundColor = 'var(--error)';
                dots[missingIndex].style.backgroundColor = 'var(--primary)';
              } else {
                dot.style.backgroundColor = 'var(--primary)';
              }
              dots.forEach(d => {
                d.onclick = null;
                d.style.cursor = 'default';
              });
              currentTimeout = window.setTimeout(runRound, 1000);
            };
          });
          return;
        }

        const i = currentIndex;
        if (i !== missingIndex) {
          dots[i].style.backgroundColor = 'var(--primary)';
          window.setTimeout(() => {
            if (!isDestroyed && i !== missingIndex) {
              dots[i].style.backgroundColor = 'var(--surface)';
            }
          }, tempo * 0.5);
        }

        currentIndex++;
        currentTimeout = window.setTimeout(flashNext, tempo);
      };

      currentTimeout = window.setTimeout(flashNext, 800); // Initial delay before sequence
    };

    runRound();

    return () => {
      isDestroyed = true;
      clearTimeout(currentTimeout);
    };
  }
} as ExerciseModule;
