import { ExerciseModule, BlockResult } from './contract';

const rubricFlipModule: ExerciseModule = {
  manifest: {
    id: 'rubric-flip',
    name: 'Рубрика',
    domain: 'flexibility',
    skills: ['task_switching', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте фигуру по указанному правилу (Цвет, Форма или Размер). Будьте внимательны: правило внезапно меняется!'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .rf-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
          background: #fafaf9;
          color: #1c1917;
          font-family: sans-serif;
        }
        .rf-rule {
          font-size: 28px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          padding: 10px 24px;
          border-radius: 12px;
          background: #e7e5e4;
          transition: background 0.3s, color 0.3s;
        }
        .rf-rule.changed {
          background: #f43f5e;
          color: white;
        }
        .rf-card {
          width: 160px;
          height: 160px;
          background: white;
          border-radius: 20px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .rf-shape {
          transition: all 0.2s;
        }
        .rf-options {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 500px;
        }
        .rf-btn {
          padding: 16px 24px;
          font-size: 18px;
          font-weight: 600;
          border: 2px solid #e7e5e4;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          min-width: 120px;
          transition: all 0.1s;
        }
        .rf-btn:active {
          transform: scale(0.95);
          background: #f5f5f4;
        }
      </style>
      <div class="rf-arena">
        <div class="rf-rule" id="rf-rule">ПРАВИЛО</div>
        <div class="rf-card">
          <svg class="rf-shape" id="rf-shape" width="100" height="100" viewBox="0 0 100 100">
            <!-- Shape will be injected here -->
          </svg>
        </div>
        <div class="rf-options" id="rf-options"></div>
      </div>
    `;

    const ruleEl = el.querySelector('#rf-rule') as HTMLElement;
    const shapeEl = el.querySelector('#rf-shape') as HTMLElement;
    const optionsEl = el.querySelector('#rf-options') as HTMLElement;

    type Rubric = 'color' | 'shape' | 'size';
    
    const colors = [
      { id: 'red', val: '#ef4444', label: 'Красный' },
      { id: 'green', val: '#10b981', label: 'Зеленый' },
      { id: 'blue', val: '#3b82f6', label: 'Синий' }
    ];
    
    const shapes = [
      { id: 'circle', render: (c: string) => `<circle cx="50" cy="50" r="45" fill="${c}" />`, label: 'Круг' },
      { id: 'square', render: (c: string) => `<rect x="10" y="10" width="80" height="80" rx="10" fill="${c}" />`, label: 'Квадрат' },
      { id: 'triangle', render: (c: string) => `<polygon points="50,10 90,90 10,90" fill="${c}" />`, label: 'Треугольник' }
    ];
    
    const sizes = [
      { id: 'small', scale: 0.5, label: 'Маленький' },
      { id: 'large', scale: 1.0, label: 'Большой' }
    ];

    const rubrics: { type: Rubric, label: string, getOptions: () => any[] }[] = [
      { type: 'color', label: 'ЦВЕТ', getOptions: () => colors },
      { type: 'shape', label: 'ФОРМА', getOptions: () => shapes },
      { type: 'size', label: 'РАЗМЕР', getOptions: () => sizes }
    ];

    let currentRubric = rubrics[0];
    let currentColor = colors[0];
    let currentShape = shapes[0];
    let currentSize = sizes[0];
    let t0 = 0;
    
    // Switch probability increases with level, max 40%
    const switchProb = Math.min(0.4, 0.15 + level * 0.05);

    const generateTask = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      // Decide if we switch rubric
      const doSwitch = Math.random() < switchProb;
      if (doSwitch) {
        const otherRubrics = rubrics.filter(r => r.type !== currentRubric.type);
        currentRubric = otherRubrics[Math.floor(Math.random() * otherRubrics.length)];
        
        ruleEl.classList.add('changed');
        setTimeout(() => ruleEl.classList.remove('changed'), 600);
      }

      ruleEl.textContent = currentRubric.label;

      currentColor = colors[Math.floor(Math.random() * colors.length)];
      currentShape = shapes[Math.floor(Math.random() * shapes.length)];
      currentSize = sizes[Math.floor(Math.random() * sizes.length)];

      shapeEl.innerHTML = currentShape.render(currentColor.val);
      shapeEl.style.transform = `scale(${currentSize.scale})`;

      renderOptions();
      t0 = performance.now();
    };

    const renderOptions = () => {
      optionsEl.innerHTML = '';
      const opts = currentRubric.getOptions();
      
      opts.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'rf-btn';
        btn.textContent = opt.label;
        btn.onclick = () => handleAnswer(opt.id);
        optionsEl.appendChild(btn);
      });
    };

    const handleAnswer = (answerId: string) => {
      let isCorrect = false;
      if (currentRubric.type === 'color') isCorrect = answerId === currentColor.id;
      if (currentRubric.type === 'shape') isCorrect = answerId === currentShape.id;
      if (currentRubric.type === 'size') isCorrect = answerId === currentSize.id;

      rounds++;
      if (isCorrect) correct++;
      
      const rt = performance.now() - t0;
      // Penalty for wrong answer is implicit in metricModel (speed-accuracy) 
      // but let's record real RT
      rts.push(rt);

      // Visual feedback on card
      const card = el.querySelector('.rf-card') as HTMLElement;
      card.style.background = isCorrect ? '#dcfce7' : '#fee2e2';
      setTimeout(() => {
        if (!isGameOver) card.style.background = 'white';
      }, 200);

      generateTask();
    };

    generateTask();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds: correct });
    };

    return () => {
      isGameOver = true;
    };
  }
};

export default rubricFlipModule;
