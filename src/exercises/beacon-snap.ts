import { ExerciseModule, BlockResult } from './contract';

const beaconSnapModule: ExerciseModule = {
  manifest: {
    id: 'beacon-snap',
    name: 'Маяк',
    domain: 'attention',
    skills: ['selective_attention', 'reaction_speed', 'visual_scanning'],
    metricModel: 'timing-precision',
    instruction: 'Запомните целевой цвет. Когда маяк нужного цвета вспыхнет, быстро нажмите на него. Игнорируйте другие цвета.'
  },
  
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .bs-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; position: relative; }
        .bs-cue { font-size: 24px; font-weight: bold; margin-bottom: 40px; text-transform: uppercase; height: 32px;}
        .bs-grid { display: grid; gap: 24px; position: relative; }
        .bs-beacon { width: 80px; height: 80px; border-radius: 50%; background: var(--surface); border: 2px solid var(--line); transition: background-color 0.1s, transform 0.1s; cursor: pointer; }
        .bs-beacon.flash { transform: scale(1.1); box-shadow: 0 0 20px currentColor; }
        .bs-beacon:active { transform: scale(0.95); }
      </style>
      <div class="bs-arena" id="bs-arena">
        <div class="bs-cue" id="bs-cue">ЦЕЛЬ: </div>
        <div class="bs-grid" id="bs-grid"></div>
      </div>
    `;

    const gridEl = el.querySelector('#bs-grid') as HTMLElement;
    const cueEl = el.querySelector('#bs-cue') as HTMLElement;

    const gridSize = level > 5 ? 4 : (level > 2 ? 3 : 2);
    gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    
    const numBeacons = gridSize * gridSize;
    for (let i = 0; i < numBeacons; i++) {
      const b = document.createElement('div');
      b.className = 'bs-beacon';
      b.dataset.index = String(i);
      gridEl.appendChild(b);
    }
    const beacons = Array.from(gridEl.querySelectorAll('.bs-beacon')) as HTMLElement[];

    const colors = [
      { name: 'СИНИЙ', hex: '#118AB2' },
      { name: 'КРАСНЫЙ', hex: '#EF476F' },
      { name: 'ЗЕЛЕНЫЙ', hex: '#06D6A0' },
      { name: 'ЖЕЛТЫЙ', hex: '#FFD166' }
    ];

    let targetColor = colors[0];
    let isFlashing = false;
    let activeBeaconIndex = -1;
    let currentFlashTarget = false;
    let t0 = 0;
    let flashTimeout: any = null;
    let nextFlashTimeout: any = null;

    const scheduleNext = () => {
      if (isGameOver || isTimeUp()) return isGameOver ? undefined : endBlock();
      isFlashing = false;
      activeBeaconIndex = -1;
      beacons.forEach(b => {
        b.style.backgroundColor = 'var(--surface)';
        b.style.color = 'var(--surface)';
        b.classList.remove('flash');
      });

      const delay = 500 + Math.random() * 800;
      nextFlashTimeout = setTimeout(doFlash, delay);
    };

    const doFlash = () => {
      if (isGameOver || isTimeUp()) return isGameOver ? undefined : endBlock();
      
      activeBeaconIndex = Math.floor(Math.random() * numBeacons);
      const falseProb = Math.min(0.7, 0.2 + level * 0.1);
      currentFlashTarget = Math.random() > falseProb;
      
      let c = targetColor;
      if (!currentFlashTarget) {
        const others = colors.filter(x => x.name !== targetColor.name);
        c = others[Math.floor(Math.random() * others.length)];
      }

      const b = beacons[activeBeaconIndex];
      b.style.backgroundColor = c.hex;
      b.style.color = c.hex;
      b.classList.add('flash');
      isFlashing = true;
      t0 = performance.now();

      const windowMs = Math.max(400, 1000 - level * 100);
      
      flashTimeout = setTimeout(() => {
        if (isFlashing && currentFlashTarget) {
          rounds++;
        }
        scheduleNext();
      }, windowMs);
    };

    const handleTap = (idx: number) => {
      if (isGameOver) return;
      if (isFlashing && idx === activeBeaconIndex) {
        rounds++;
        const rt = performance.now() - t0;
        if (currentFlashTarget) {
          correct++;
          rts.push(rt);
        }
        isFlashing = false;
        clearTimeout(flashTimeout);
        scheduleNext();
      } else if (!isFlashing || idx !== activeBeaconIndex) {
        rounds++;
      }
    };

    beacons.forEach(b => {
      b.onmousedown = () => handleTap(parseInt(b.dataset.index!));
      b.ontouchstart = (e) => { e.preventDefault(); handleTap(parseInt(b.dataset.index!)); };
    });

    const setTarget = () => {
      targetColor = colors[Math.floor(Math.random() * colors.length)];
      cueEl.innerHTML = `ЦЕЛЬ: <span style="color:${targetColor.hex}">${targetColor.name}</span>`;
    };

    setTarget();
    scheduleNext();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      clearTimeout(nextFlashTimeout);
      onEnd({
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000,
        rounds
      });
    };

    return () => {
      isGameOver = true;
      clearTimeout(flashTimeout);
      clearTimeout(nextFlashTimeout);
    };
  }
};

export default beaconSnapModule;
