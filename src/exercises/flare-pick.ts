import { ExerciseModule, BlockResult } from './contract';

const flarePickModule: ExerciseModule = {
  manifest: {
    id: 'flare-pick',
    name: 'Вспышка',
    domain: 'attention',
    skills: ['selective_attention', 'inhibition'],
    metricModel: 'speed-accuracy',
    instruction: 'Следите за тусклыми точками. Нажимайте на точку ТОЛЬКО в момент её яркой вспышки. Не нажимайте в другое время.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    
    let numDots = Math.min(40, 10 + Math.floor(level * 2));
    let flashDuration = Math.max(200, 1000 - level * 80);
    let isiMin = Math.max(300, 1500 - level * 100);
    let isiMax = Math.max(600, 2500 - level * 150);

    el.innerHTML = `
      <style>
        .fp-container {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #111;
          border-radius: 12px;
        }
        .fp-dot {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transform: translate(-50%, -50%);
          cursor: pointer;
          transition: background 0.1s, transform 0.1s;
        }
        .fp-dot.flashing {
          background: #fff;
          box-shadow: 0 0 15px #fff;
          transform: translate(-50%, -50%) scale(1.2);
        }
        .fp-dot.feedback-correct {
          background: var(--ok, #4CAF50) !important;
          box-shadow: 0 0 20px var(--ok, #4CAF50) !important;
        }
        .fp-dot.feedback-wrong {
          background: var(--danger, #F44336) !important;
          box-shadow: 0 0 20px var(--danger, #F44336) !important;
        }
      </style>
      <div class="fp-container" id="fp-container"></div>
    `;

    const container = el.querySelector('#fp-container') as HTMLElement;
    const dots: HTMLElement[] = [];
    let rts: number[] = [];
    
    for (let i = 0; i < numDots; i++) {
      const dot = document.createElement('div');
      dot.className = 'fp-dot';
      
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 80;
      dot.style.left = `${x}%`;
      dot.style.top = `${y}%`;
      
      dot.onmousedown = (e) => {
        e.preventDefault();
        onDotClick(i);
      };
      
      dots.push(dot);
      container.appendChild(dot);
    }

    let activeDotIndex = -1;
    let flashTimeout: any;
    let nextFlashTimeout: any;
    let flashStartTime = 0;

    const scheduleNextFlash = () => {
      if (isGameOver) return;
      const delay = isiMin + Math.random() * (isiMax - isiMin);
      nextFlashTimeout = setTimeout(doFlash, delay);
    };

    const doFlash = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      activeDotIndex = Math.floor(Math.random() * numDots);
      const dot = dots[activeDotIndex];
      dot.classList.add('flashing');
      flashStartTime = performance.now();

      flashTimeout = setTimeout(() => {
        if (isGameOver) return;
        dot.classList.remove('flashing');
        totalRounds++; // missed tap counts as round
        activeDotIndex = -1;
        scheduleNextFlash();
      }, flashDuration);
    };

    const onDotClick = (idx: number) => {
      if (isGameOver) return;
      
      const dot = dots[idx];
      totalRounds++;
      
      if (idx === activeDotIndex) {
        correctRounds++;
        rts.push(performance.now() - flashStartTime);
        
        dot.classList.remove('flashing');
        dot.classList.add('feedback-correct');
        clearTimeout(flashTimeout);
        activeDotIndex = -1;
        
        setTimeout(() => {
          if (!isGameOver) dot.classList.remove('feedback-correct');
        }, 300);
        
        scheduleNextFlash();
      } else {
        dot.classList.add('feedback-wrong');
        rts.push(flashDuration);
        
        setTimeout(() => {
          if (!isGameOver) dot.classList.remove('feedback-wrong');
        }, 300);
      }
    };

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      clearTimeout(nextFlashTimeout);
      const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : flashDuration;
      onEnd({ accuracy, avgRtMs, rounds: totalRounds });
    };

    scheduleNextFlash();

    return () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      clearTimeout(nextFlashTimeout);
    };
  }
};

export default flarePickModule;
