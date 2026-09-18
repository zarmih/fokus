import { ExerciseModule, BlockResult } from './contract';

const awShapePulseModule: ExerciseModule = {
  manifest: {
    id: 'aw-shape-pulse',
    name: 'Пульс фигур',
    domain: 'memory',
    skills: ['visual_memory', 'working_memory'] as any,
    metricModel: 'memory-span',
    instruction: 'Запомните последовательность пульсирующих фигур и воспроизведите её.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .aw-pulse-container { display:flex; gap: 20px; justify-content:center; align-items:center; height:100%; flex-wrap: wrap; }
        .aw-pulse-shape { width:100px; height:100px; background: #9b59b6; cursor:pointer; opacity: 0.5; transition: opacity 0.2s, transform 0.2s; display: flex; justify-content: center; align-items: center; font-size: 40px; color: white; user-select: none; }
        .aw-pulse-shape.active { opacity: 1; transform: scale(1.1); box-shadow: 0 0 15px rgba(155,89,182,0.8); }
        .aw-pulse-shape.circle { border-radius: 50%; }
        .aw-pulse-shape.square { border-radius: 10px; }
        .aw-pulse-shape.triangle { clip-path: polygon(50% 0%, 0% 100%, 100% 100%); background: #e67e22; border-radius: 0; }
      </style>
      <div class="aw-pulse-container" id="aw-pulse-container">
        <div class="aw-pulse-shape circle" data-id="0"></div>
        <div class="aw-pulse-shape square" data-id="1"></div>
        <div class="aw-pulse-shape triangle" data-id="2"></div>
      </div>
    `;

    const shapes = Array.from(el.querySelectorAll('.aw-pulse-shape')) as HTMLElement[];
    let sequence: number[] = [];
    let playerIndex = 0;
    let sequenceLength = Math.min(3 + Math.floor(level / 3), 8);
    let state: 'showing' | 'playing' = 'showing';

    const generateSequence = () => {
      sequence = [];
      for(let i = 0; i < sequenceLength; i++) {
        sequence.push(Math.floor(Math.random() * 3));
      }
    };

    const showSequence = async () => {
      state = 'showing';
      for (let i = 0; i < sequence.length; i++) {
        if (isGameOver) return;
        await new Promise(r => setTimeout(r, 400));
        if (isGameOver) return;
        shapes[sequence[i]].classList.add('active');
        await new Promise(r => setTimeout(r, 600));
        if (isGameOver) return;
        shapes[sequence[i]].classList.remove('active');
      }
      state = 'playing';
      playerIndex = 0;
    };

    const startRound = () => {
      if (isGameOver) return;
      generateSequence();
      showSequence();
    };

    shapes.forEach((shape) => {
      shape.onclick = () => {
        if (isGameOver || state !== 'playing') return;
        
        const id = parseInt(shape.dataset.id || '0');
        
        if (id === sequence[playerIndex]) {
          playerIndex++;
          shape.classList.add('active');
          setTimeout(() => { if (!isGameOver) shape.classList.remove('active'); }, 200);

          if (playerIndex >= sequence.length) {
            rounds++;
            correct++;
            if (isTimeUp()) endBlock();
            else setTimeout(startRound, 1000);
          }
        } else {
          rounds++;
          if (isTimeUp()) endBlock();
          else setTimeout(startRound, 1000);
        }
      };
    });

    const checkTime = setInterval(() => {
      if (isTimeUp() && !isGameOver) {
        endBlock();
      }
    }, 500);

    const endBlock = () => {
      isGameOver = true;
      clearInterval(checkTime);
      onEnd({
        rounds,
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: 0
      });
    };

    setTimeout(startRound, 500);

    return () => {
      isGameOver = true;
      clearInterval(checkTime);
    };
  }
};

export default awShapePulseModule;
