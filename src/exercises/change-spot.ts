import { ExerciseModule, BlockResult } from './contract';

const changeSpotModule: ExerciseModule = {
  manifest: {
    id: 'change-spot',
    name: 'Найди отличие',
    domain: 'attention',
    skills: ['visual_scanning', 'sustained_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните объекты. Через мгновение один объект изменится, исчезнет или появится новый. Нажмите на то, что изменилось.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cs-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 20px;
        }
        .cs-grid {
          position: relative;
          width: 320px;
          height: 320px;
          background: var(--surface);
          border-radius: 12px;
          border: 2px solid var(--line);
        }
        .cs-item {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          cursor: pointer;
          user-select: none;
          transition: transform 0.1s;
        }
        .cs-item.circle { border-radius: 50%; }
        .cs-item.triangle { 
          width: 0; height: 0; 
          border-left: 20px solid transparent;
          border-right: 20px solid transparent;
          border-bottom: 34px solid;
          background: transparent !important;
          border-radius: 0;
        }
        .cs-item.hidden { display: none; }
        .cs-message {
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          height: 24px;
          color: var(--text);
        }
      </style>
      <div class="cs-arena">
        <div class="cs-message" id="cs-message">Запоминайте...</div>
        <div class="cs-grid" id="cs-grid"></div>
      </div>
    `;

    const gridEl = el.querySelector('#cs-grid') as HTMLElement;
    const msgEl = el.querySelector('#cs-message') as HTMLElement;

    let t0 = performance.now();
    let phase = 'memorize'; // memorize | recall
    let items: any[] = [];
    let changedIndex = -1;
    let changeType = ''; // color, shape, appear, disappear, move

    const shapes = ['circle', 'square', 'triangle'];
    const colors = ['#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0'];

    const generateItems = (count: number) => {
      const res = [];
      const usedPos = new Set<string>();
      
      while (res.length < count) {
        const x = Math.floor(Math.random() * 6) * 50 + 10;
        const y = Math.floor(Math.random() * 6) * 50 + 10;
        const posKey = `${x},${y}`;
        
        if (!usedPos.has(posKey)) {
          usedPos.add(posKey);
          res.push({
            id: res.length,
            x, y,
            shape: shapes[Math.floor(Math.random() * shapes.length)],
            color: colors[Math.floor(Math.random() * colors.length)],
            visible: true
          });
        }
      }
      return res;
    };

    const renderGrid = (isRecall: boolean) => {
      gridEl.innerHTML = '';
      items.forEach((item, i) => {
        if (!item.visible) return;
        
        const div = document.createElement('div');
        div.className = `cs-item ${item.shape}`;
        div.style.left = item.x + 'px';
        div.style.top = item.y + 'px';
        
        if (item.shape === 'triangle') {
          div.style.borderBottomColor = item.color;
        } else {
          div.style.backgroundColor = item.color;
        }

        if (isRecall) {
          div.onclick = () => handleAns(i, div);
        }
        
        gridEl.appendChild(div);
      });
    };

    let timer: any;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      msgEl.textContent = 'Запоминайте...';
      gridEl.style.borderColor = 'var(--line)';

      const itemCount = 4 + Math.min(6, Math.floor(level / 2));
      items = generateItems(itemCount);
      
      renderGrid(false);

      const exposureMs = Math.max(800, 2500 - level * 100);
      
      timer = setTimeout(() => {
        if (isGameOver) return;
        phase = 'blank';
        gridEl.innerHTML = '';
        msgEl.textContent = '';
        
        timer = setTimeout(() => {
          if (isGameOver) return;
          applyChange();
        }, 300);
      }, exposureMs);
    };

    const applyChange = () => {
      phase = 'recall';
      msgEl.textContent = 'Что изменилось?';
      
      // Determine change type
      const types = ['color', 'shape', 'appear', 'disappear', 'move'];
      changeType = types[Math.floor(Math.random() * types.length)];
      
      if (changeType === 'appear') {
        const extra = generateItems(items.length + 1).pop();
        if (extra) {
          extra.id = items.length;
          items.push(extra);
          changedIndex = items.length - 1;
        }
      } else {
        changedIndex = Math.floor(Math.random() * items.length);
        const item = items[changedIndex];
        
        if (changeType === 'color') {
          let c = item.color;
          while (c === item.color) c = colors[Math.floor(Math.random() * colors.length)];
          item.color = c;
        } else if (changeType === 'shape') {
          let s = item.shape;
          while (s === item.shape) s = shapes[Math.floor(Math.random() * shapes.length)];
          item.shape = s;
        } else if (changeType === 'disappear') {
          item.visible = false;
        } else if (changeType === 'move') {
          const used = items.map(i => `${i.x},${i.y}`);
          let moved = false;
          while (!moved) {
            const nx = Math.floor(Math.random() * 6) * 50 + 10;
            const ny = Math.floor(Math.random() * 6) * 50 + 10;
            if (!used.includes(`${nx},${ny}`)) {
              item.x = nx;
              item.y = ny;
              moved = true;
            }
          }
        }
      }
      
      renderGrid(true);
      
      // If disappeared, we need a special way to click.
      // Actually clicking the empty space is hard, let's just make the grid clickable for disappeared.
      if (changeType === 'disappear') {
         gridEl.onclick = (e) => {
           if (e.target === gridEl) {
             handleAns(changedIndex, gridEl);
           }
         };
      } else {
         gridEl.onclick = null;
      }
      
      t0 = performance.now();
    };

    const handleAns = (ansIdx: number, elToStyle: HTMLElement) => {
      if (phase !== 'recall' || isGameOver) return;
      phase = 'result';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = (ansIdx === changedIndex);
      
      if (isCorrect) {
        correct++;
        elToStyle.style.boxShadow = '0 0 10px var(--ok)';
      } else {
        elToStyle.style.boxShadow = '0 0 10px var(--danger)';
      }

      setTimeout(startRound, 700);
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(timer);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      clearTimeout(timer);
    };
  }
};

export default changeSpotModule;
