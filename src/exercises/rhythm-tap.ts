import { ExerciseModule, BlockResult } from './contract';

const rhythmTapModule: ExerciseModule = {
  manifest: {
    id: 'rhythm-tap',
    name: 'Ритм',
    domain: 'speed',
    skills: ['reaction_speed'],
    metricModel: 'timing-precision',
    instruction: 'Внимательно следите за пульсацией. Когда она закончится, повторите ритм, нажимая на круг.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .rt-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .rt-circle {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: var(--surface);
          border: 4px solid var(--line);
          transition: background 0.05s, transform 0.05s;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          color: var(--text);
          user-select: none;
          touch-action: none;
        }
        .rt-circle.active {
          background: var(--accent);
          transform: scale(0.95);
        }
        .rt-status {
          font-size: 20px;
          font-weight: bold;
          min-height: 28px;
          text-align: center;
        }
      </style>
      <div class="rt-arena">
        <div class="rt-status" id="rt-status"></div>
        <div class="rt-circle" id="rt-circle"></div>
      </div>
    `;

    const circle = el.querySelector('#rt-circle') as HTMLElement;
    const status = el.querySelector('#rt-status') as HTMLElement;

    let targetIntervals: number[] = [];
    let userTaps: number[] = [];
    let phase: 'idle' | 'playback' | 'input' = 'idle';
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];
    
    const cleanup = () => {
      timeoutIds.forEach(clearTimeout);
      timeoutIds = [];
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      cleanup();
      phase = 'idle';
      status.textContent = 'Приготовьтесь...';
      circle.textContent = '';
      circle.style.borderColor = 'var(--line)';
      
      const numTaps = Math.min(3 + Math.floor(level / 2), 6);
      targetIntervals = [];
      for (let i = 0; i < numTaps - 1; i++) {
        targetIntervals.push(Math.floor(Math.random() * 600) + 300);
      }
      
      userTaps = [];
      
      timeoutIds.push(setTimeout(playSequence, 1000));
    };
    
    const playSequence = () => {
      if (isGameOver) return;
      phase = 'playback';
      status.textContent = 'Слушайте ритм';
      
      let totalTime = 0;
      
      const flash = () => {
        circle.classList.add('active');
        timeoutIds.push(setTimeout(() => circle.classList.remove('active'), 100));
      };
      
      flash();
      
      for (let i = 0; i < targetIntervals.length; i++) {
        totalTime += targetIntervals[i];
        timeoutIds.push(setTimeout(flash, totalTime));
      }
      
      timeoutIds.push(setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        status.textContent = 'Повторите ритм!';
        circle.textContent = 'TAP';
      }, totalTime + 500));
    };

    const handleTapDown = (e: Event) => {
      e.preventDefault();
      if (phase !== 'input' || isGameOver) return;
      circle.classList.add('active');
      userTaps.push(performance.now());
      
      if (userTaps.length === targetIntervals.length + 1) {
        evaluate();
      }
    };
    
    const handleTapUp = (e: Event) => {
      e.preventDefault();
      circle.classList.remove('active');
    };

    circle.addEventListener('mousedown', handleTapDown);
    circle.addEventListener('touchstart', handleTapDown, { passive: false });
    
    window.addEventListener('mouseup', handleTapUp);
    window.addEventListener('touchend', handleTapUp);
    
    const evaluate = () => {
      phase = 'idle';
      rounds++;
      circle.textContent = '';
      
      let userIntervals: number[] = [];
      for (let i = 1; i < userTaps.length; i++) {
        userIntervals.push(userTaps[i] - userTaps[i-1]);
      }
      
      let totalDiff = 0;
      for (let i = 0; i < targetIntervals.length; i++) {
        totalDiff += Math.abs(targetIntervals[i] - userIntervals[i]);
      }
      
      const avgDiff = totalDiff / targetIntervals.length;
      rts.push(avgDiff); 
      
      const tolerance = Math.max(300 - level * 20, 100);
      const isCorrect = avgDiff < tolerance;
      
      if (isCorrect) {
        correct++;
        circle.style.borderColor = 'var(--ok, #4caf50)';
        status.textContent = 'Отлично!';
      } else {
        circle.style.borderColor = 'var(--danger, #f44336)';
        status.textContent = 'Мимо...';
      }
      
      timeoutIds.push(setTimeout(startRound, 1000));
    };
    
    startRound();
    
    const endBlock = () => {
      isGameOver = true;
      cleanup();
      window.removeEventListener('mouseup', handleTapUp);
      window.removeEventListener('touchend', handleTapUp);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };
    
    return () => {
      isGameOver = true;
      cleanup();
      window.removeEventListener('mouseup', handleTapUp);
      window.removeEventListener('touchend', handleTapUp);
    };
  }
};

export default rhythmTapModule;
