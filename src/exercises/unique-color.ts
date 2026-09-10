import { ExerciseModule, BlockResult } from './contract';

const uniqueColorModule: ExerciseModule = {
  manifest: {
    id: 'unique-color',
    name: 'Одиночка',
    domain: 'attention',
    skills: ['visual_scanning', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Найдите квадрат, цвет которого не повторяется.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .uc-arena {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
        }
        .uc-grid {
          display: grid;
          gap: 12px;
        }
        .uc-cell {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          cursor: pointer;
          transition: transform 0.1s;
        }
        .uc-cell:active { transform: scale(0.9); }
      </style>
      <div class="uc-arena">
        <div class="uc-grid" id="uc-grid"></div>
      </div>
    `;

    const grid = el.querySelector('#uc-grid') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIdx = 0;

    // Use HSL for good distinction
    const getColors = (count: number) => {
      const colors: string[] = [];
      const startHue = Math.floor(Math.random() * 360);
      for (let i = 0; i < count; i++) {
        const h = (startHue + i * (360 / count)) % 360;
        colors.push(`hsl(${h}, 80%, 60%)`);
      }
      return colors;
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      grid.innerHTML = '';

      // Grid must be odd to have exactly one unique: 3x3=9, 5x5=25
      const gridSize = level > 5 ? 5 : 3;
      const totalCells = gridSize * gridSize;
      
      grid.style.gridTemplateColumns = `repeat(${gridSize}, 56px)`;

      const pairCount = (totalCells - 1) / 2;
      const allColors = getColors(pairCount + 1);
      
      const uniqueColor = allColors[0];
      const pairColors = allColors.slice(1);

      const items: string[] = [uniqueColor];
      pairColors.forEach(c => {
        items.push(c);
        items.push(c);
      });

      items.sort(() => Math.random() - 0.5);
      targetIdx = items.indexOf(uniqueColor);

      items.forEach((c, i) => {
        const btn = document.createElement('div');
        btn.className = 'uc-cell';
        btn.style.backgroundColor = c;
        
        btn.onclick = () => {
          if (phase !== 'input') return;
          phase = 'result';
          rounds++;
          rts.push(performance.now() - t0);

          if (i === targetIdx) {
            correct++;
            btn.style.outline = '4px solid #10b981';
            btn.style.outlineOffset = '2px';
          } else {
            btn.style.outline = '4px solid #ef4444';
            btn.style.outlineOffset = '2px';
            
            // highlight the correct one
            (grid.children[targetIdx] as HTMLElement).style.outline = '4px solid #10b981';
            (grid.children[targetIdx] as HTMLElement).style.outlineOffset = '2px';
          }

          setTimeout(startRound, 600);
        };
        grid.appendChild(btn);
      });

      t0 = performance.now();
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => { isGameOver = true; };
  }
};

export default uniqueColorModule;
