import { ExerciseModule, BlockResult } from './contract';

const waveLockModule: ExerciseModule = {
  manifest: {
    id: 'wave-lock',
    name: 'Волна',
    domain: 'attention',
    skills: ['sustained_attention', 'reaction_speed', 'inhibition'],
    metricModel: 'timing-precision',
    instruction: 'Нажмите ПРОБЕЛ, когда подвижная волна окажется в зелёной зоне. Не торопитесь и не опаздывайте!'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .wl-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .wl-track {
          width: 80%;
          max-width: 600px;
          height: 40px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 20px;
          position: relative;
          overflow: hidden;
        }
        .wl-target-zone {
          position: absolute;
          height: 100%;
          background: rgba(76, 175, 80, 0.3); /* green-ish */
          border-left: 2px solid var(--ok);
          border-right: 2px solid var(--ok);
          top: 0;
        }
        .wl-wave {
          position: absolute;
          width: 20px;
          height: 100%;
          background: var(--accent);
          border-radius: 10px;
          top: 0;
          left: 0;
          transform: translateX(-50%);
        }
        .wl-btn {
          padding: 16px 32px;
          font-size: 24px;
          font-weight: 600;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          user-select: none;
        }
        .wl-btn:active { transform: scale(0.95); }
      </style>
      <div class="wl-arena">
        <div class="wl-track" id="wl-track">
          <div class="wl-target-zone" id="wl-target-zone"></div>
          <div class="wl-wave" id="wl-wave"></div>
        </div>
        <button class="wl-btn" id="wl-btn">БЛОК!</button>
      </div>
    `;

    const track = el.querySelector('#wl-track') as HTMLElement;
    const targetZone = el.querySelector('#wl-target-zone') as HTMLElement;
    const wave = el.querySelector('#wl-wave') as HTMLElement;
    const btn = el.querySelector('#wl-btn') as HTMLElement;

    let raf: number;
    let wavePos = 0; // 0 to 100 percent
    let waveDir = 1;
    let phase = 'wait';
    let t0 = 0;
    
    // config for round
    let targetCenter = 50; 
    let targetWidth = 20; 
    let speed = 0.5 + level * 0.1; 

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      phase = 'move';
      wavePos = 0;
      waveDir = 1;
      wave.style.left = '0%';
      wave.style.backgroundColor = 'var(--accent)';
      
      // randomize target
      targetWidth = Math.max(5, 30 - level * 2);
      targetCenter = 30 + Math.random() * 40; // between 30 and 70
      
      targetZone.style.left = `${targetCenter - targetWidth / 2}%`;
      targetZone.style.width = `${targetWidth}%`;
      
      t0 = performance.now();
      tick();
    };

    const tick = () => {
      if (isGameOver || phase !== 'move') return;
      
      wavePos += speed * waveDir;
      if (wavePos > 100) {
        wavePos = 100;
        waveDir = -1;
      } else if (wavePos < 0) {
        wavePos = 0;
        waveDir = 1;
      }
      
      wave.style.left = `${wavePos}%`;
      raf = requestAnimationFrame(tick);
    };

    const handleHit = () => {
      if (phase !== 'move') return;
      phase = 'result';
      cancelAnimationFrame(raf);
      rounds++;

      const hitRt = performance.now() - t0;
      rts.push(hitRt);
      
      const leftBound = targetCenter - targetWidth / 2;
      const rightBound = targetCenter + targetWidth / 2;
      
      if (wavePos >= leftBound && wavePos <= rightBound) {
        correct++;
        wave.style.backgroundColor = 'var(--ok)';
      } else {
        wave.style.backgroundColor = 'var(--danger)';
      }
      
      setTimeout(startRound, 800);
    };

    btn.onclick = handleHit;

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'move') {
        e.preventDefault();
        handleHit();
      }
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(raf);
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

export default waveLockModule;
