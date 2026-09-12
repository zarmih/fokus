import { ExerciseModule, BlockResult } from './contract';

const quantumSyncModule: ExerciseModule = {
  manifest: {
    id: 'quantum-sync',
    name: 'Квантовая синхронизация',
    domain: 'attention',
    skills: ['sustained_attention', 'selective_attention', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за частицами. Если они вспыхивают одинаковым цветом, нажмите «ДА» (или стрелку Вправо). Если разными — «НЕТ» (Стрелка Влево).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .qs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .qs-reactor {
          position: relative;
          width: 200px;
          height: 200px;
          border-radius: 50%;
          border: 2px dashed var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qs-core {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--text);
          box-shadow: 0 0 20px var(--text);
        }
        .qs-particle {
          position: absolute;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #555;
          top: 50%;
          left: 50%;
          margin-top: -15px;
          margin-left: -15px;
          transition: background-color 0.1s;
        }
        .qs-controls {
          display: flex;
          gap: 20px;
        }
        .qs-btn {
          width: 120px;
          height: 60px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          color: var(--text);
        }
        .qs-btn:active { transform: scale(0.95); }
      </style>
      <div class="qs-arena">
        <div class="qs-reactor" id="qs-reactor">
          <div class="qs-core"></div>
          <div class="qs-particle" id="qs-p1"></div>
          <div class="qs-particle" id="qs-p2"></div>
        </div>
        <div class="qs-controls">
          <button class="qs-btn" id="qs-no">НЕТ (←)</button>
          <button class="qs-btn" id="qs-yes">ДА (→)</button>
        </div>
      </div>
    `;

    const p1 = el.querySelector('#qs-p1') as HTMLElement;
    const p2 = el.querySelector('#qs-p2') as HTMLElement;
    const btnNo = el.querySelector('#qs-no') as HTMLElement;
    const btnYes = el.querySelector('#qs-yes') as HTMLElement;

    let t0 = performance.now();
    let phase = 'wait'; // wait, flash
    let isMatch = false;
    let angle = 0;
    let animFrame: number;

    const colors = ['#FF3366', '#33CCFF', '#33FF66', '#FFCC00'];

    const animate = () => {
      if (isGameOver) return;
      angle += 0.05;
      
      const r = 100;
      p1.style.transform = `translate(${Math.cos(angle) * r}px, ${Math.sin(angle) * r}px)`;
      p2.style.transform = `translate(${Math.cos(angle + Math.PI) * r}px, ${Math.sin(angle + Math.PI) * r}px)`;
      
      animFrame = requestAnimationFrame(animate);
    };
    animate();

    let flashTimeout: any;

    const scheduleFlash = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      phase = 'wait';
      p1.style.backgroundColor = '#555';
      p2.style.backgroundColor = '#555';
      p1.style.boxShadow = 'none';
      p2.style.boxShadow = 'none';

      const delay = Math.random() * 1000 + 1000; // 1s to 2s
      flashTimeout = setTimeout(() => {
        triggerFlash();
      }, delay);
    };

    const triggerFlash = () => {
      if (isGameOver) return;
      phase = 'flash';
      t0 = performance.now();

      isMatch = Math.random() > 0.5;
      const c1 = colors[Math.floor(Math.random() * colors.length)];
      let c2 = c1;
      if (!isMatch) {
        let available = colors.filter(c => c !== c1);
        c2 = available[Math.floor(Math.random() * available.length)];
      }

      p1.style.backgroundColor = c1;
      p1.style.boxShadow = `0 0 15px ${c1}`;
      p2.style.backgroundColor = c2;
      p2.style.boxShadow = `0 0 15px ${c2}`;
    };

    const handleAns = (ansMatch: boolean) => {
      if (phase !== 'flash' || isGameOver) return;
      clearTimeout(flashTimeout);
      phase = 'wait';
      rounds++;
      rts.push(performance.now() - t0);

      const reactor = el.querySelector('#qs-reactor') as HTMLElement;
      if (ansMatch === isMatch) {
        correct++;
        reactor.style.borderColor = 'var(--ok)';
      } else {
        reactor.style.borderColor = 'var(--danger)';
      }

      setTimeout(() => {
        if (!isGameOver) {
          reactor.style.borderColor = 'var(--line)';
          scheduleFlash();
        }
      }, 300);
    };

    btnNo.onclick = () => handleAns(false);
    btnYes.onclick = () => handleAns(true);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns(false);
      if (e.key === 'ArrowRight') handleAns(true);
    };
    window.addEventListener('keydown', onKey);

    scheduleFlash();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      cancelAnimationFrame(animFrame);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      cancelAnimationFrame(animFrame);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default quantumSyncModule;
