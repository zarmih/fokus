import { ExerciseManifest, ExerciseModule, BlockResult } from '../contract';
import { mountStage } from '../stage';

export const manifest: ExerciseManifest = {
  id: 'fractal-symmetry',
  name: 'Симметрия',
  domain: 'logic',
  skills: ['spatial_reasoning', 'logical_reasoning'],
  metricModel: 'logic-correctness',
  instruction: 'Восстанови симметрию узора относительно центральной оси.'
};

export function render(
  container: HTMLElement,
  level: number,
  onEnd: (r: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const stage = mountStage(container, 'logic');
  let rounds = 0;
  let totalAccuracy = 0;
  let totalRt = 0;
  let timers: number[] = [];

  const startRound = () => {
    if (isTimeUp()) {
      finish();
      return;
    }
    const roundStartTime = Date.now();
    const size = Math.min(4 + Math.floor(level / 5), 8);
    const half = Math.floor(size / 2);
    
    const pattern = new Set<string>();
    const dotsCount = Math.max(3, level + 2);
    for (let i = 0; i < dotsCount; i++) {
      const x = Math.floor(Math.random() * half);
      const y = Math.floor(Math.random() * size);
      pattern.add(`${x},${y}`);
    }

    const required = new Set<string>();
    for (let item of pattern) {
      const [x, y] = item.split(',').map(Number);
      required.add(`${size - 1 - x},${y}`);
    }

    const selected = new Set<string>();

    stage.setStatus('Отметь симметричные клетки');
    stage.board.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(${size}, 40px); gap: 4px; margin: 0 auto; background: #222; padding: 10px; border-radius: 8px; position: relative;">
        <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255, 255, 255, 0.2); transform: translateX(-50%); pointer-events: none;"></div>
        ${Array.from({ length: size * size }, (_, i) => {
          const x = i % size;
          const y = Math.floor(i / size);
          const isLeft = x < half;
          const isFilled = pattern.has(`${x},${y}`);
          if (isLeft) {
            return `<div style="width: 40px; height: 40px; background: ${isFilled ? '#3b82f6' : '#333'}; border-radius: 4px;"></div>`;
          } else {
            return `<button class="sym-btn" data-x="${x}" data-y="${y}" style="width: 40px; height: 40px; background: #333; border: none; border-radius: 4px; cursor: pointer;"></button>`;
          }
        }).join('')}
      </div>
      <div style="margin-top: 20px; text-align: center;">
        <button id="sym-submit" style="padding: 10px 20px; background: #10b981; border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer;">Готово</button>
      </div>
    `;

    const btns = stage.board.querySelectorAll('.sym-btn') as NodeListOf<HTMLButtonElement>;
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const x = btn.dataset.x!;
        const y = btn.dataset.y!;
        const key = `${x},${y}`;
        if (selected.has(key)) {
          selected.delete(key);
          btn.style.background = '#333';
        } else {
          selected.add(key);
          btn.style.background = '#eab308';
        }
      });
    });

    const submitBtn = stage.board.querySelector('#sym-submit') as HTMLButtonElement;
    submitBtn.addEventListener('click', () => {
      const rt = Date.now() - roundStartTime;
      let correct = true;
      if (selected.size !== required.size) correct = false;
      else {
        for (let item of required) {
          if (!selected.has(item)) {
            correct = false;
            break;
          }
        }
      }
      
      const acc = correct ? 1 : 0;
      totalAccuracy += acc;
      totalRt += rt;
      rounds++;
      
      stage.pulse(correct);
      
      btns.forEach(btn => {
        const key = `${btn.dataset.x},${btn.dataset.y}`;
        if (required.has(key)) btn.style.background = '#10b981';
        else if (selected.has(key)) btn.style.background = '#ef4444';
      });

      submitBtn.disabled = true;
      btns.forEach(b => (b.disabled = true));

      timers.push(window.setTimeout(() => startRound(), 800));
    });
  };

  const finish = () => {
    stage.cleanup();
    onEnd({
      accuracy: rounds > 0 ? totalAccuracy / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => {
    timers.forEach(clearTimeout);
    stage.cleanup();
  };
}

export const fractalSymmetryModule: ExerciseModule = {
  manifest,
  render
};
export default fractalSymmetryModule;
