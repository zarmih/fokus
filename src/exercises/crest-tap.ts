import { ExerciseModule, BlockResult } from './contract';

const crestTapModule: ExerciseModule = {
  manifest: {
    id: 'crest-tap',
    name: 'Гребень',
    domain: 'attention',
    skills: ['reaction_speed', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Нажмите кнопку в тот момент, когда пульсирующий круг достигает МАКСИМАЛЬНОГО размера. Избегайте ранних нажатий.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let errors = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let animationFrameId: number;

    el.innerHTML = `
      <style>
        .ct-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          background: #0f172a;
          color: white;
          font-family: sans-serif;
        }
        .ct-wave-container {
          width: 200px;
          height: 200px;
          border: 2px dashed #475569;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .ct-wave {
          background: #38bdf8;
          border-radius: 50%;
          width: 0px;
          height: 0px;
          opacity: 0.8;
        }
        .ct-btn {
          padding: 16px 32px;
          font-size: 18px;
          font-weight: bold;
          border: none;
          border-radius: 8px;
          background: #10b981;
          color: white;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .ct-btn:active { transform: scale(0.95); }
        .ct-feedback {
          position: absolute;
          top: -40px;
          font-size: 24px;
          font-weight: bold;
          opacity: 0;
          transition: opacity 0.3s;
        }
      </style>
      <div class="ct-arena">
        <div class="ct-wave-container">
          <div class="ct-feedback" id="ct-feedback"></div>
          <div class="ct-wave" id="ct-wave"></div>
        </div>
        <button class="ct-btn" id="ct-btn">ТАП</button>
      </div>
    `;

    const waveEl = el.querySelector('#ct-wave') as HTMLElement;
    const btn = el.querySelector('#ct-btn') as HTMLButtonElement;
    const feedbackEl = el.querySelector('#ct-feedback') as HTMLElement;

    let startTime = 0;
    let duration = 0;
    let phase: 'idle' | 'growing' | 'shrinking' | 'result' = 'idle';
    let peakReached = false;
    let cycleTimeoutId: any;
    let timeoutFeedback: any;

    const startCycle = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'growing';
      peakReached = false;
      startTime = performance.now();
      // Level reduces duration, making it faster and harder
      duration = Math.max(1000, 2500 - level * 150); 
      
      requestAnimationFrame(animateWave);
    };

    const animateWave = (now: number) => {
      if (isGameOver || phase !== 'growing' && phase !== 'shrinking') return;

      const elapsed = now - startTime;
      const progress = elapsed / duration;

      if (progress >= 1) {
        // Cycle finished without tap
        handleTap(now, true); // forced miss
        return;
      }

      // Sine wave from 0 to PI
      const sizeProgress = Math.sin(progress * Math.PI);
      const size = sizeProgress * 200; // max size is 200px
      
      waveEl.style.width = `${size}px`;
      waveEl.style.height = `${size}px`;
      
      // Color change as it approaches peak
      const hue = 200 - (sizeProgress * 100); // 200 (blue) to 100 (green/yellow)
      waveEl.style.background = `hsl(${hue}, 90%, 60%)`;

      if (progress > 0.5) peakReached = true;

      animationFrameId = requestAnimationFrame(animateWave);
    };

    const showFeedback = (msg: string, color: string) => {
      feedbackEl.textContent = msg;
      feedbackEl.style.color = color;
      feedbackEl.style.opacity = '1';
      clearTimeout(timeoutFeedback);
      timeoutFeedback = setTimeout(() => {
        feedbackEl.style.opacity = '0';
      }, 500);
    };

    const handleTap = (time: number, isTimeout: boolean = false) => {
      if (phase === 'result' || phase === 'idle') return;
      
      const elapsed = time - startTime;
      const progress = elapsed / duration;
      
      rounds++;
      phase = 'result';
      waveEl.style.width = '0px';
      waveEl.style.height = '0px';

      if (isTimeout) {
        errors++;
        rts.push(1500);
        showFeedback('ПРОПУСК', '#ef4444');
      } else {
        // Peak is exactly at progress = 0.5
        const distance = Math.abs(0.5 - progress);
        
        // Window of tolerance based on level
        const tolerance = Math.max(0.05, 0.15 - level * 0.01);
        
        if (distance <= tolerance) {
          correct++;
          rts.push(elapsed);
          showFeedback('ОТЛИЧНО!', '#10b981');
        } else if (progress < 0.5) {
          errors++;
          rts.push(elapsed);
          showFeedback('РАНО', '#eab308');
        } else {
          errors++;
          rts.push(elapsed);
          showFeedback('ПОЗДНО', '#f97316');
        }
      }

      cycleTimeoutId = setTimeout(startCycle, 500 + Math.random() * 800);
    };

    btn.onmousedown = (e) => {
      e.preventDefault();
      handleTap(performance.now());
    };
    
    // Support touch
    btn.ontouchstart = (e) => {
      e.preventDefault();
      handleTap(performance.now());
    };

    cycleTimeoutId = setTimeout(startCycle, 1000);

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(animationFrameId);
      clearTimeout(cycleTimeoutId);
      clearTimeout(timeoutFeedback);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds: correct });
    };

    return () => {
      isGameOver = true;
      cancelAnimationFrame(animationFrameId);
      clearTimeout(cycleTimeoutId);
      clearTimeout(timeoutFeedback);
    };
  }
};

export default crestTapModule;
