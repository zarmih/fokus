import { ExerciseModule, BlockResult } from './contract';

const nestSpanModule: ExerciseModule = {
  manifest: {
    id: 'nest-span',
    name: 'Гнёзда',
    domain: 'memory',
    skills: ['working_memory', 'spatial_memory'],
    metricModel: 'memory-span',
    instruction: 'Запомните, в каких гнездах лежат предметы. Затем распределите предметы по своим местам.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let correctRounds = 0;
    let totalRounds = 0;
    let isGameOver = false;
    let rts: number[] = [];
    let span = Math.max(3, Math.floor(level / 2) + 2); // 3, 4, 5... items
    let t0 = 0;
    
    el.innerHTML = `
      <style>
        .ns-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .ns-nests {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .ns-nest {
          width: 120px;
          min-height: 120px;
          border: 4px dashed rgba(255,255,255,0.2);
          border-radius: 16px;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          gap: 8px;
          padding: 12px;
          transition: border-color 0.2s;
        }
        .ns-nest.active {
          border-color: var(--accent, #2196F3);
        }
        .ns-pool {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
          min-height: 60px;
          padding: 16px;
          background: rgba(255,255,255,0.05);
          border-radius: 16px;
        }
        .ns-item {
          width: 48px;
          height: 48px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          cursor: pointer;
          user-select: none;
        }
        .ns-item.selected {
          background: var(--accent, #2196F3);
          transform: scale(1.1);
        }
        .ns-nest.correct-feedback { border-color: var(--ok, #4CAF50); }
        .ns-nest.wrong-feedback { border-color: var(--danger, #F44336); }
      </style>
      <div class="ns-layout">
        <div class="ns-nests" id="ns-nests"></div>
        <div class="ns-pool" id="ns-pool"></div>
      </div>
    `;

    const nestsContainer = el.querySelector('#ns-nests') as HTMLElement;
    const poolContainer = el.querySelector('#ns-pool') as HTMLElement;

    const itemsDb = ['🍎','🍌','🍉','🍇','🍓','🫐','🍊','🍋','🍍','🥝','🍅','🥑','🍄','🥕','🌽','🥦'];
    
    let currentPhase = 'memorize'; // memorize | recall
    let selectedPoolItemIndex = -1;
    let targetMapping = new Map<string, number>();
    let userMapping = new Map<string, number>();

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      nestsContainer.innerHTML = '';
      poolContainer.innerHTML = '';
      targetMapping.clear();
      userMapping.clear();
      selectedPoolItemIndex = -1;
      
      const numNests = Math.min(4, 2 + Math.floor(span / 4));
      
      const shuffledItems = [...itemsDb].sort(() => Math.random() - 0.5).slice(0, span);
      
      for (const item of shuffledItems) {
        const nestIdx = Math.floor(Math.random() * numNests);
        targetMapping.set(item, nestIdx);
      }
      
      for (let i = 0; i < numNests; i++) {
        const nest = document.createElement('div');
        nest.className = 'ns-nest';
        nest.onclick = () => onNestClick(i);
        nestsContainer.appendChild(nest);
      }
      
      for (const item of shuffledItems) {
        const nestIdx = targetMapping.get(item)!;
        const nest = nestsContainer.children[nestIdx] as HTMLElement;
        const itemEl = document.createElement('div');
        itemEl.className = 'ns-item';
        itemEl.innerText = item;
        nest.appendChild(itemEl);
      }
      
      currentPhase = 'memorize';
      
      setTimeout(() => {
        if (isGameOver) return;
        for (let i = 0; i < numNests; i++) {
          nestsContainer.children[i].innerHTML = '';
        }
        
        const poolItems = [...shuffledItems].sort(() => Math.random() - 0.5);
        poolItems.forEach((item, idx) => {
          const itemEl = document.createElement('div');
          itemEl.className = 'ns-item';
          itemEl.innerText = item;
          itemEl.onclick = () => onPoolItemClick(item, idx);
          poolContainer.appendChild(itemEl);
        });
        
        currentPhase = 'recall';
        t0 = performance.now();
      }, 2000 + span * 200);
    };
    
    const onPoolItemClick = (item: string, idx: number) => {
      if (currentPhase !== 'recall' || isGameOver) return;
      const allItems = poolContainer.children;
      for (let i = 0; i < allItems.length; i++) {
        allItems[i].classList.remove('selected');
      }
      allItems[idx].classList.add('selected');
      selectedPoolItemIndex = idx;
    };
    
    const onNestClick = (nestIdx: number) => {
      if (currentPhase !== 'recall' || isGameOver) return;
      if (selectedPoolItemIndex === -1) return;
      
      const itemEl = poolContainer.children[selectedPoolItemIndex] as HTMLElement;
      const item = itemEl.innerText;
      
      userMapping.set(item, nestIdx);
      const nest = nestsContainer.children[nestIdx] as HTMLElement;
      
      const nestItemEl = document.createElement('div');
      nestItemEl.className = 'ns-item';
      nestItemEl.innerText = item;
      nestItemEl.onclick = (e) => {
        e.stopPropagation();
        if (currentPhase !== 'recall') return;
        nest.removeChild(nestItemEl);
        userMapping.delete(item);
        itemEl.style.visibility = 'visible';
      };
      
      nest.appendChild(nestItemEl);
      itemEl.style.visibility = 'hidden';
      itemEl.classList.remove('selected');
      selectedPoolItemIndex = -1;
      
      checkRoundEnd();
    };

    const checkRoundEnd = () => {
      if (userMapping.size === targetMapping.size) {
        totalRounds++;
        rts.push(performance.now() - t0);
        
        let correct = true;
        for (const [item, targetNest] of targetMapping.entries()) {
          if (userMapping.get(item) !== targetNest) {
            correct = false;
            break;
          }
        }
        
        const nests = nestsContainer.children;
        if (correct) {
          correctRounds++;
          span++;
          for (let i = 0; i < nests.length; i++) nests[i].classList.add('correct-feedback');
        } else {
          span = Math.max(3, span - 1);
          for (let i = 0; i < nests.length; i++) nests[i].classList.add('wrong-feedback');
        }
        
        currentPhase = 'feedback';
        setTimeout(() => {
          if (isGameOver) return;
          for (let i = 0; i < nests.length; i++) {
            nests[i].classList.remove('correct-feedback', 'wrong-feedback');
          }
          startRound();
        }, 1000);
      }
    };

    const endBlock = () => {
      isGameOver = true;
      const accuracy = totalRounds > 0 ? correctRounds / totalRounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds: totalRounds });
    };

    startRound();

    return () => { isGameOver = true; };
  }
};

export default nestSpanModule;
