import { ExerciseModule, BlockResult } from './contract';
import { mountStage } from './stage';

export class ColorFrequencyEngine {
  colors = ['#ef4444', '#3b82f6', '#10b981', '#eab308', '#a855f7', '#f97316'];
  
  generate(level: number) {
    const numColors = Math.min(2 + Math.floor(level / 4), 5);
    const totalDots = 12 + level * 3;
    
    let selectedColors = [...this.colors].sort(() => Math.random() - 0.5).slice(0, numColors);
    
    let counts = new Array(numColors).fill(1);
    let remaining = totalDots - numColors;
    
    for(let i = 0; i < numColors - 1; i++) {
        let maxAssign = remaining - (numColors - 1 - i);
        if (maxAssign < 1) maxAssign = 1;
        let c = Math.floor(Math.random() * maxAssign) + 1;
        counts[i] += c;
        remaining -= c;
    }
    counts[numColors - 1] += remaining;
    
    let maxCount = Math.max(...counts);
    let maxIndices = counts.map((c, i) => c === maxCount ? i : -1).filter(i => i !== -1);
    if (maxIndices.length > 1) {
        counts[maxIndices[0]] += 1; // force unique max
    }
    
    maxCount = Math.max(...counts);
    let winningIndex = counts.indexOf(maxCount);
    let winningColor = selectedColors[winningIndex];
    
    let dots: string[] = [];
    for(let i = 0; i < numColors; i++) {
      for(let j = 0; j < counts[i]; j++) {
        dots.push(selectedColors[i]);
      }
    }
    dots.sort(() => Math.random() - 0.5);
    
    return { dots, selectedColors, winningColor };
  }
  
  submit(selectedColor: string, winningColor: string) {
    return selectedColor === winningColor;
  }
}

const colorFrequencyModule: ExerciseModule = {
  manifest: {
    id: 'color-frequency',
    name: 'Доминирующий цвет',
    domain: 'attention',
    skills: ['selective_attention', 'visual_scanning'],
    metricModel: 'speed-accuracy',
    instruction: 'Вам покажут поле с разноцветными точками. Выберите цвет, которого больше всего.'
  },
  render(el, level, onEnd, isTimeUp) {
    const engine = new ColorFrequencyEngine();
    const stage = mountStage(el, 'attention');
    let rounds = 0;
    let correct = 0;
    const rts: number[] = [];
    
    stage.board.innerHTML = `
      <style>
        .cf-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 32px; }
        .cf-dots { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; max-width: 320px; }
        .cf-dot { width: 24px; height: 24px; border-radius: 50%; opacity: 0; transform: scale(0); animation: cf-pop 0.3s forwards; }
        @keyframes cf-pop { to { opacity: 1; transform: scale(1); } }
        .cf-controls { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
        .cf-btn { width: 56px; height: 56px; border-radius: 16px; border: 3px solid var(--line); cursor: pointer; transition: transform 0.1s; }
        .cf-btn:active { transform: scale(0.9); }
      </style>
      <div class="cf-arena">
        <div class="cf-dots" id="cf-dots"></div>
        <div class="cf-controls" id="cf-controls"></div>
      </div>
    `;
    
    const dotsEl = stage.board.querySelector('#cf-dots') as HTMLElement;
    const controlsEl = stage.board.querySelector('#cf-controls') as HTMLElement;
    
    let t0 = performance.now();
    let timer: number;
    let roundActive = false;
    let currentState: ReturnType<typeof engine.generate>;
    
    const startRound = () => {
      if (isTimeUp()) {
        endBlock();
        return;
      }
      currentState = engine.generate(level);
      dotsEl.innerHTML = '';
      controlsEl.innerHTML = '';
      
      currentState.dots.forEach((color, idx) => {
        const d = document.createElement('div');
        d.className = 'cf-dot';
        d.style.backgroundColor = color;
        d.style.animationDelay = `${idx * 5}ms`;
        dotsEl.appendChild(d);
      });
      
      currentState.selectedColors.forEach(color => {
        const btn = document.createElement('button');
        btn.className = 'cf-btn';
        btn.style.backgroundColor = color;
        btn.onclick = () => {
          if (!roundActive) return;
          roundActive = false;
          const rt = performance.now() - t0;
          rts.push(rt);
          rounds++;
          
          const isCorrect = engine.submit(color, currentState.winningColor);
          stage.pulse(isCorrect);
          if (isCorrect) correct++;
          
          timer = window.setTimeout(startRound, isCorrect ? 300 : 700);
        };
        controlsEl.appendChild(btn);
      });
      
      roundActive = true;
      t0 = performance.now();
    };
    
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
export default colorFrequencyModule;
