import { ExerciseModule, BlockResult } from './contract';

const avatarNamesModule: ExerciseModule = {
  manifest: {
    id: 'avatar-names',
    name: 'Имена',
    domain: 'memory',
    skills: ['working_memory'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните имена персонажей. Затем, когда появится один из них, выберите его правильное имя.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .an-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .an-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        .an-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.05);
          padding: 16px;
          border-radius: 16px;
        }
        .an-avatar { font-size: 48px; }
        .an-name { font-size: 20px; font-weight: bold; }
        .an-question {
          font-size: 80px;
          margin-bottom: 24px;
        }
        .an-controls {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .an-btn {
          padding: 16px 32px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 12px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .an-btn:active { transform: scale(0.95); }
      </style>
      <div class="an-arena" id="an-arena"></div>
    `;

    const arena = el.querySelector('#an-arena') as HTMLElement;

    let t0 = performance.now();
    let phase = 'memorize';
    let targetName = '';

    const avatars = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵'];
    const names = ['Рекс','Барсик','Сырок','Пушок','Зая','Алиса','Потап','Бамбук','Эвкалипт','Шерхан','Симба','Бурёнка','Хрюша','Квака','Чики'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'memorize';
      
      const count = level > 5 ? 5 : (level > 2 ? 4 : 3);
      
      // select random avatars and names
      const selectedIndices: number[] = [];
      while(selectedIndices.length < count) {
        const idx = Math.floor(Math.random() * avatars.length);
        if(!selectedIndices.includes(idx)) selectedIndices.push(idx);
      }

      const pairs = selectedIndices.map(idx => ({ avatar: avatars[idx], name: names[idx] }));

      // Render memorize phase
      arena.innerHTML = '<div class="an-grid" id="an-grid"></div>';
      const grid = arena.querySelector('#an-grid') as HTMLElement;
      
      pairs.forEach(p => {
        const div = document.createElement('div');
        div.className = 'an-item';
        div.innerHTML = `<div class="an-avatar">${p.avatar}</div><div class="an-name">${p.name}</div>`;
        grid.appendChild(div);
      });

      setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        
        // Pick one to ask
        const target = pairs[Math.floor(Math.random() * pairs.length)];
        targetName = target.name;

        arena.innerHTML = `
          <div class="an-question">${target.avatar}</div>
          <div class="an-controls" id="an-controls"></div>
        `;

        const controls = arena.querySelector('#an-controls') as HTMLElement;
        
        const options = [targetName];
        while(options.length < 4) {
          const fake = pairs[Math.floor(Math.random() * pairs.length)].name;
          if(!options.includes(fake)) options.push(fake);
        }
        // If we didn't have enough pairs to make 4 options, pad with random names
        while(options.length < 4) {
          const fake = names[Math.floor(Math.random() * names.length)];
          if(!options.includes(fake)) options.push(fake);
        }
        
        options.sort(() => Math.random() - 0.5);

        options.forEach(opt => {
          const btn = document.createElement('button');
          btn.className = 'an-btn';
          btn.textContent = opt;
          btn.onclick = () => {
            if (phase !== 'input') return;
            phase = 'result';
            rounds++;
            rts.push(performance.now() - t0);

            if (opt === targetName) {
              correct++;
              btn.style.borderColor = 'var(--ok)';
              btn.style.background = 'rgba(16, 185, 129, 0.2)';
            } else {
              btn.style.borderColor = 'var(--danger)';
              btn.style.background = 'rgba(239, 68, 68, 0.2)';
            }

            setTimeout(startRound, 1000);
          };
          controls.appendChild(btn);
        });

        t0 = performance.now();

      }, 3000 + level * 500); // More time to memorize if there are more items
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

export default avatarNamesModule;
