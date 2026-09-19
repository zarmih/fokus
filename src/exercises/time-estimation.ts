import { ExerciseModule, BlockResult } from './contract';
import { mountStage } from './stage';

export class TimeEstimationEngine {
  targetSeconds = 0;
  startTime = 0;
  
  generate(level: number) {
    const min = 2 + Math.floor(level / 3);
    const max = 4 + Math.floor(level / 2);
    this.targetSeconds = Math.floor(Math.random() * (max - min + 1)) + min;
    return this.targetSeconds;
  }
  
  start() {
    this.startTime = performance.now();
  }
  
  stop() {
    const elapsed = (performance.now() - this.startTime) / 1000;
    const diff = Math.abs(elapsed - this.targetSeconds);
    const success = diff <= 0.6; // margin of error
    return { elapsed, diff, success };
  }
}

const timeEstimationModule: ExerciseModule = {
  manifest: {
    id: 'time-estimation',
    name: 'Чувство времени',
    domain: 'attention',
    skills: ['sustained_attention'],
    metricModel: 'timing-precision',
    instruction: 'Запомните целевое время. Нажмите "Старт", отсчитайте время про себя, затем нажмите "Стоп".'
  },
  render(el, level, onEnd, isTimeUp) {
    const engine = new TimeEstimationEngine();
    const stage = mountStage(el, 'attention');
    let rounds = 0;
    let correct = 0;
    let totalError = 0;
    const rts: number[] = [];
    
    let isTiming = false;
    
    stage.board.innerHTML = `
      <style>
        .te-box { display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 30px; }
        .te-target { font-size: 64px; font-weight: 800; color: var(--text); }
        .te-btn { padding: 20px 48px; font-size: 24px; font-weight: bold; border-radius: 100px; border: none; background: var(--primary); color: white; cursor: pointer; user-select: none; transition: transform 0.1s, opacity 0.2s; }
        .te-btn:active { transform: scale(0.95); }
        .te-btn.timing { background: var(--danger); }
        .te-feedback { font-size: 20px; font-weight: 600; opacity: 0; transition: opacity 0.2s; }
      </style>
      <div class="te-box">
        <div class="te-target" id="te-target"></div>
        <button class="te-btn" id="te-btn">СТАРТ</button>
        <div class="te-feedback" id="te-feedback"></div>
      </div>
    `;
    
    const targetEl = stage.board.querySelector('#te-target') as HTMLElement;
    const btn = stage.board.querySelector('#te-btn') as HTMLButtonElement;
    const feedback = stage.board.querySelector('#te-feedback') as HTMLElement;
    
    let t0 = performance.now();
    let timer: number;
    
    const startRound = () => {
      if (isTimeUp()) {
        endBlock();
        return;
      }
      isTiming = false;
      const target = engine.generate(level);
      targetEl.textContent = `${target} сек`;
      btn.textContent = 'СТАРТ';
      btn.className = 'te-btn';
      feedback.style.opacity = '0';
      t0 = performance.now();
    };
    
    const handleAction = () => {
      if (!isTiming) {
        // Start
        isTiming = true;
        engine.start();
        targetEl.textContent = '...';
        btn.textContent = 'СТОП';
        btn.className = 'te-btn timing';
      } else {
        // Stop
        const res = engine.stop();
        rounds++;
        rts.push(res.elapsed * 1000);
        totalError += res.diff;
        if (res.success) {
          correct++;
          stage.pulse(true);
          feedback.style.color = 'var(--success)';
          feedback.textContent = `Точно! (${res.elapsed.toFixed(2)} с)`;
        } else {
          stage.pulse(false);
          feedback.style.color = 'var(--danger)';
          feedback.textContent = `Мимо: ${res.elapsed.toFixed(2)} с`;
        }
        feedback.style.opacity = '1';
        isTiming = false;
        btn.disabled = true;
        
        timer = window.setTimeout(() => {
          btn.disabled = false;
          startRound();
        }, 1500);
      }
    };
    
    btn.addEventListener('click', handleAction);
    startRound();
    
    const endBlock = () => {
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      stage.cleanup();
      onEnd({ accuracy, avgRtMs, rounds });
    };
    
    return () => {
      clearTimeout(timer);
      stage.cleanup();
    };
  }
};
export default timeEstimationModule;
