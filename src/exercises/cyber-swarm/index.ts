import { ExerciseManifest, ExerciseModule, BlockResult } from '../contract';
import { mountStage } from '../stage';

export const manifest: ExerciseManifest = {
  id: 'cyber-swarm',
  name: 'Кибер Рой',
  domain: 'speed',
  skills: ['processing_speed', 'visual_scanning', 'reaction_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Кликай по числам в порядке возрастания (от меньшего к большему).'
};

export function render(
  container: HTMLElement,
  level: number,
  onEnd: (r: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const stage = mountStage(container, 'speed');
  let rounds = 0;
  let totalAccuracy = 0;
  let totalRt = 0;
  let timers: number[] = [];
  let raf: number;

  const startRound = () => {
    if (isTimeUp()) {
      finish();
      return;
    }
    const roundStartTime = Date.now();
    const itemsCount = Math.min(5 + Math.floor(level / 2), 20);
    let nextExpected = 1;

    stage.setStatus('Найди ' + nextExpected);

    const items: { val: number; x: number; y: number; vx: number; vy: number; el: HTMLElement }[] = [];

    stage.board.innerHTML = `<div style="position: relative; width: 100%; height: 100%; overflow: hidden;" id="swarm-container"></div>`;
    const swarmContainer = stage.board.querySelector('#swarm-container') as HTMLElement;

    for (let i = 1; i <= itemsCount; i++) {
      const el = document.createElement('button');
      el.textContent = String(i);
      el.style.position = 'absolute';
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.borderRadius = '20px';
      el.style.background = '#3b82f6';
      el.style.border = 'none';
      el.style.color = 'white';
      el.style.fontWeight = 'bold';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.fontSize = '16px';
      
      const x = Math.random() * 80;
      const y = Math.random() * 80;
      const speedMult = 0.02 + level * 0.005;
      const vx = (Math.random() - 0.5) * speedMult;
      const vy = (Math.random() - 0.5) * speedMult;

      el.style.left = `${x}%`;
      el.style.top = `${y}%`;

      el.addEventListener('click', () => {
        if (i === nextExpected) {
          stage.pulse(true);
          el.style.display = 'none';
          nextExpected++;
          if (nextExpected > itemsCount) {
            cancelAnimationFrame(raf);
            const rt = Date.now() - roundStartTime;
            totalAccuracy += 1;
            totalRt += rt;
            rounds++;
            timers.push(window.setTimeout(() => startRound(), 500));
          } else {
            stage.setStatus('Найди ' + nextExpected);
          }
        } else {
          stage.pulse(false);
          // simple penalty
          totalRt += 1000;
        }
      });

      swarmContainer.appendChild(el);
      items.push({ val: i, x, y, vx, vy, el });
    }

    let lastTime = Date.now();
    const animate = () => {
      const now = Date.now();
      const dt = now - lastTime;
      lastTime = now;

      items.forEach(item => {
        if (item.val >= nextExpected) {
          item.x += item.vx * dt;
          item.y += item.vy * dt;

          if (item.x < 0 || item.x > 90) { item.vx *= -1; item.x = Math.max(0, Math.min(90, item.x)); }
          if (item.y < 0 || item.y > 90) { item.vy *= -1; item.y = Math.max(0, Math.min(90, item.y)); }

          item.el.style.left = `${item.x}%`;
          item.el.style.top = `${item.y}%`;
        }
      });
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
  };

  const finish = () => {
    cancelAnimationFrame(raf);
    stage.cleanup();
    onEnd({
      accuracy: rounds > 0 ? totalAccuracy / rounds : 0, // all completed are 100% accurate eventually, rt reflects errors
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => {
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    stage.cleanup();
  };
}

export const cyberSwarmModule: ExerciseModule = {
  manifest,
  render
};
export default cyberSwarmModule;
