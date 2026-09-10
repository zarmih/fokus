import { ExerciseModule, BlockResult } from './contract';

const reactionStrikeModule: ExerciseModule = {
  manifest: {
    id: 'reaction-strike',
    name: 'Перехват',
    domain: 'speed',
    skills: ['reaction_speed', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажмите кнопку ровно в тот момент, когда движущийся объект окажется в зоне перехвата.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .rs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
          position: relative;
        }
        .rs-track {
          width: 80%;
          height: 16px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          position: relative;
        }
        .rs-zone {
          position: absolute;
          top: -8px;
          height: 32px;
          border: 2px solid var(--accent);
          background: rgba(59, 130, 246, 0.2);
          border-radius: 4px;
        }
        .rs-target {
          position: absolute;
          top: -12px;
          width: 40px;
          height: 40px;
          background: var(--danger);
          border-radius: 50%;
          transform: translateX(-50%);
        }
        .rs-btn {
          padding: 16px 48px;
          font-size: 24px;
          font-weight: 700;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .rs-btn:active { transform: scale(0.95); }
      </style>
      <div class="rs-arena">
        <div class="rs-track" id="rs-track">
          <div class="rs-zone" id="rs-zone"></div>
          <div class="rs-target" id="rs-target"></div>
        </div>
        <button class="rs-btn" id="rs-btn">УДАР!</button>
      </div>
    `;

    const track = el.querySelector('#rs-track') as HTMLElement;
    const zone = el.querySelector('#rs-zone') as HTMLElement;
    const target = el.querySelector('#rs-target') as HTMLElement;
    const btn = el.querySelector('#rs-btn') as HTMLElement;

    let targetPos = 0;
    let targetSpeed = 0;
    let direction = 1;
    let zonePos = 0;
    let zoneWidth = 0;
    let raf: number;
    let phase = 'wait';
    let t0 = performance.now();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'move';
      
      zoneWidth = Math.max(10, 30 - level * 2); // % of track
      zonePos = 20 + Math.random() * (80 - zoneWidth - 20); // % position

      zone.style.width = `${zoneWidth}%`;
      zone.style.left = `${zonePos}%`;

      targetPos = direction === 1 ? 0 : 100;
      targetSpeed = 0.5 + level * 0.15 + Math.random() * 0.5;

      target.style.left = `${targetPos}%`;
      target.style.background = 'var(--danger)';
      zone.style.borderColor = 'var(--accent)';

      t0 = performance.now();
      tick();
    };

    const tick = () => {
      if (isGameOver || phase !== 'move') return;

      targetPos += targetSpeed * direction;
      
      if (targetPos > 100 || targetPos < 0) {
        direction *= -1;
        targetPos += targetSpeed * direction * 2;
      }

      target.style.left = `${targetPos}%`;
      
      raf = requestAnimationFrame(tick);
    };

    const handleStrike = () => {
      if (phase !== 'move' || isGameOver) return;
      phase = 'result';
      cancelAnimationFrame(raf);
      rounds++;

      const isHit = targetPos >= zonePos && targetPos <= zonePos + zoneWidth;
      
      if (isHit) {
        correct++;
        target.style.background = 'var(--ok)';
        zone.style.borderColor = 'var(--ok)';
      } else {
        target.style.background = '#64748b'; // dull
        zone.style.borderColor = 'var(--danger)';
      }

      rts.push(performance.now() - t0);
      
      setTimeout(startRound, 800);
    };

    btn.onclick = handleStrike;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') handleStrike();
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default reactionStrikeModule;
