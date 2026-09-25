import { ExerciseModule, BlockResult } from '../contract';
import { TripleMatchEngine } from './engine';

export default {
  manifest: {
    id: 'triple-match',
    name: 'Тройное совпадение',
    domain: 'logic',
    skills: ['pattern_recognition', 'logical_reasoning'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите, составляют ли 3 фигуры СЕТ. Их цвета и формы должны либо полностью совпадать, либо полностью различаться.',
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let errors = 0;
    let totalRt = 0;
    let isDestroyed = false;
    let currentTimeout: number;

    const engine = new TripleMatchEngine();

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = '100%';
    container.style.gap = '30px';
    container.style.padding = '20px';
    el.appendChild(container);

    const cardsDiv = document.createElement('div');
    cardsDiv.style.display = 'flex';
    cardsDiv.style.gap = '20px';
    container.appendChild(cardsDiv);

    const btnsDiv = document.createElement('div');
    btnsDiv.style.display = 'flex';
    btnsDiv.style.gap = '15px';
    container.appendChild(btnsDiv);

    const btnYes = document.createElement('button');
    btnYes.textContent = 'Да (Сет)';
    btnYes.style.padding = '10px 20px';
    btnYes.style.fontSize = '1.2rem';
    
    const btnNo = document.createElement('button');
    btnNo.textContent = 'Нет';
    btnNo.style.padding = '10px 20px';
    btnNo.style.fontSize = '1.2rem';

    btnsDiv.appendChild(btnYes);
    btnsDiv.appendChild(btnNo);

    const runRound = () => {
      if (isDestroyed) return;
      if (isTimeUp()) {
        const acc = rounds === 0 ? 0 : Math.max(0, 1 - errors / rounds);
        onEnd({ accuracy: acc, avgRtMs: rounds > 0 ? totalRt / rounds : 0, rounds });
        return;
      }

      const { cards, isMatch } = engine.generateCards();
      cardsDiv.innerHTML = '';
      
      cards.forEach(c => {
        const shapeEl = document.createElement('div');
        shapeEl.style.width = '80px';
        shapeEl.style.height = '80px';
        if (c.shape === 'square') {
          shapeEl.style.backgroundColor = c.color;
        } else if (c.shape === 'circle') {
          shapeEl.style.backgroundColor = c.color;
          shapeEl.style.borderRadius = '50%';
        } else if (c.shape === 'triangle') {
          shapeEl.style.width = '0';
          shapeEl.style.height = '0';
          shapeEl.style.borderLeft = '40px solid transparent';
          shapeEl.style.borderRight = '40px solid transparent';
          shapeEl.style.borderBottom = `80px solid ${c.color}`;
        }
        cardsDiv.appendChild(shapeEl);
      });

      const startTime = Date.now();

      const handle = (guessed: boolean) => {
        if (isDestroyed) return;
        totalRt += Date.now() - startTime;
        rounds++;
        if (guessed !== isMatch) errors++;
        
        cardsDiv.innerHTML = '';
        currentTimeout = window.setTimeout(runRound, 300);
      };

      btnYes.onclick = () => handle(true);
      btnNo.onclick = () => handle(false);
    };

    runRound();

    // Keyboard support
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isDestroyed || !cardsDiv.innerHTML) return;
      if (e.key === 'ArrowLeft') btnYes.click();
      if (e.key === 'ArrowRight') btnNo.click();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isDestroyed = true;
      clearTimeout(currentTimeout);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }
} as ExerciseModule;
