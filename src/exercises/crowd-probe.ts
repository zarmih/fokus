import { ExerciseModule, BlockResult } from './contract';

export default {
  manifest: {
    id: 'crowd-probe',
    name: 'Толпа',
    domain: 'attention',
    skills: ['visual_scanning', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Запомните количество целевых фигур. Они появятся на короткое время. Затем выберите правильное число.',
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let errors = 0;
    let totalRt = 0;
    let isDestroyed = false;

    const runRound = () => {
      if (isDestroyed) return;
      if (isTimeUp()) {
        const acc = rounds === 0 ? 0 : Math.max(0, 1 - errors / rounds);
        onEnd({ accuracy: acc, avgRtMs: rounds > 0 ? totalRt / rounds : 0, rounds });
        return;
      }

      el.innerHTML = '';
      
      const numTargets = Math.floor(Math.random() * 5) + 1; // 1 to 5
      const numDistractors = Math.min(25, 5 + level * 2);
      const exposureMs = Math.max(400, 1200 - level * 100);

      const targetType = {
        color: Math.random() > 0.5 ? 'var(--primary)' : 'var(--error)',
        shape: Math.random() > 0.5 ? 'circle' : 'square',
      };

      const container = document.createElement('div');
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'center';
      container.style.height = '100%';
      container.style.width = '100%';
      el.appendChild(container);

      const instructionEl = document.createElement('div');
      instructionEl.style.fontSize = '20px';
      instructionEl.style.marginBottom = '20px';
      instructionEl.style.display = 'flex';
      instructionEl.style.alignItems = 'center';
      instructionEl.style.gap = '10px';
      
      const targetExample = document.createElement('div');
      targetExample.style.width = '30px';
      targetExample.style.height = '30px';
      targetExample.style.backgroundColor = targetType.color;
      targetExample.style.borderRadius = targetType.shape === 'circle' ? '50%' : '4px';
      
      instructionEl.innerHTML = `<span>Сколько таких фигур?</span>`;
      instructionEl.appendChild(targetExample);
      container.appendChild(instructionEl);

      const field = document.createElement('div');
      field.style.position = 'relative';
      field.style.width = '300px';
      field.style.height = '300px';
      field.style.border = '1px solid var(--border)';
      field.style.borderRadius = '12px';
      field.style.backgroundColor = 'var(--surface)';
      field.style.overflow = 'hidden';
      container.appendChild(field);

      const startBtn = document.createElement('button');
      startBtn.textContent = 'Показать';
      startBtn.style.padding = '10px 20px';
      startBtn.style.fontSize = '18px';
      startBtn.style.marginTop = '20px';
      startBtn.style.cursor = 'pointer';
      
      const buttonsContainer = document.createElement('div');
      buttonsContainer.style.display = 'none';
      buttonsContainer.style.gap = '10px';
      buttonsContainer.style.marginTop = '20px';
      
      for (let i = 1; i <= 5; i++) {
        const btn = document.createElement('button');
        btn.textContent = i.toString();
        btn.style.width = '50px';
        btn.style.height = '50px';
        btn.style.fontSize = '24px';
        btn.style.cursor = 'pointer';
        
        btn.onclick = () => {
          if (isDestroyed) return;
          const rt = Date.now() - startTime;
          totalRt += rt;
          rounds++;
          
          if (i !== numTargets) {
            errors++;
            btn.style.backgroundColor = 'var(--error)';
            btn.style.color = 'white';
          } else {
            btn.style.backgroundColor = 'var(--primary)';
            btn.style.color = 'white';
          }
          
          Array.from(buttonsContainer.children).forEach(b => (b as HTMLButtonElement).disabled = true);
          setTimeout(runRound, 800);
        };
        buttonsContainer.appendChild(btn);
      }
      
      container.appendChild(startBtn);
      container.appendChild(buttonsContainer);

      let startTime = 0;

      startBtn.onclick = () => {
        startBtn.style.display = 'none';
        
        // Generate shapes
        const shapes = [];
        for (let i = 0; i < numTargets; i++) {
          shapes.push({ ...targetType });
        }
        for (let i = 0; i < numDistractors; i++) {
          let dColor = Math.random() > 0.5 ? 'var(--primary)' : 'var(--error)';
          let dShape = Math.random() > 0.5 ? 'circle' : 'square';
          // Ensure it's not a target
          if (dColor === targetType.color && dShape === targetType.shape) {
            dColor = targetType.color === 'var(--primary)' ? 'var(--error)' : 'var(--primary)';
          }
          shapes.push({ color: dColor, shape: dShape });
        }

        // Shuffle
        shapes.sort(() => Math.random() - 0.5);

        // Render shapes
        shapes.forEach(s => {
          const el = document.createElement('div');
          el.style.position = 'absolute';
          el.style.width = '24px';
          el.style.height = '24px';
          el.style.backgroundColor = s.color;
          el.style.borderRadius = s.shape === 'circle' ? '50%' : '4px';
          
          const padding = 12;
          const left = padding + Math.random() * (300 - 24 - padding * 2);
          const top = padding + Math.random() * (300 - 24 - padding * 2);
          
          el.style.left = `${left}px`;
          el.style.top = `${top}px`;
          field.appendChild(el);
        });

        // Hide after exposure
        setTimeout(() => {
          if (isDestroyed) return;
          field.innerHTML = '';
          buttonsContainer.style.display = 'flex';
          startTime = Date.now();
        }, exposureMs);
      };
    };

    runRound();

    return () => {
      isDestroyed = true;
    };
  }
} as ExerciseModule;
