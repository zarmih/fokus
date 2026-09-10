import { ExerciseModule, BlockResult } from './contract';

const categorySortModule: ExerciseModule = {
  manifest: {
    id: 'category-sort',
    name: 'Сортировка',
    domain: 'flexibility',
    skills: ['cognitive_flexibility', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите категорию слова и нажмите соответствующую кнопку.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cat-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .cat-word {
          font-size: 64px;
          font-weight: 800;
          color: var(--text);
          text-transform: capitalize;
        }
        .cat-controls {
          display: flex;
          gap: 40px;
          width: 100%;
          justify-content: center;
        }
        .cat-btn {
          width: 200px;
          height: 100px;
          font-size: 28px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .cat-btn:active { transform: scale(0.95); }
      </style>
      <div class="cat-arena">
        <div class="cat-word" id="cat-word"></div>
        <div class="cat-controls">
          <button class="cat-btn" id="cat-btn-left"></button>
          <button class="cat-btn" id="cat-btn-right"></button>
        </div>
      </div>
    `;

    const wordEl = el.querySelector('#cat-word') as HTMLElement;
    const btnLeft = el.querySelector('#cat-btn-left') as HTMLElement;
    const btnRight = el.querySelector('#cat-btn-right') as HTMLElement;

    const categories = {
      animals: ['Собака', 'Кошка', 'Слон', 'Тигр', 'Медведь', 'Лиса', 'Волк', 'Лев', 'Заяц', 'Олень'],
      tools: ['Молоток', 'Отвертка', 'Пила', 'Топор', 'Дрель', 'Гвоздь', 'Ключ', 'Рубанок', 'Клещи', 'Шило'],
      food: ['Яблоко', 'Хлеб', 'Молоко', 'Сыр', 'Мясо', 'Пицца', 'Рис', 'Суп', 'Груша', 'Морковь'],
      transport: ['Машина', 'Поезд', 'Самолёт', 'Корабль', 'Велосипед', 'Метро', 'Трамвай', 'Лодка', 'Автобус', 'Ракета']
    };

    let t0 = performance.now();
    let phase = 'input';
    let targetIsLeft = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      // select two distinct categories for this round
      const catKeys = Object.keys(categories) as (keyof typeof categories)[];
      
      let leftCatIdx = Math.floor(Math.random() * catKeys.length);
      let rightCatIdx = Math.floor(Math.random() * catKeys.length);
      while (rightCatIdx === leftCatIdx) {
        rightCatIdx = Math.floor(Math.random() * catKeys.length);
      }

      const leftCat = catKeys[leftCatIdx];
      const rightCat = catKeys[rightCatIdx];

      targetIsLeft = Math.random() > 0.5;

      const targetCatName = targetIsLeft ? leftCat : rightCat;
      const targetCatArray = categories[targetCatName];
      const word = targetCatArray[Math.floor(Math.random() * targetCatArray.length)];

      const catLabels: Record<string, string> = {
        animals: 'Животное',
        tools: 'Инструмент',
        food: 'Еда',
        transport: 'Транспорт'
      };

      btnLeft.textContent = catLabels[leftCat];
      btnRight.textContent = catLabels[rightCat];
      wordEl.textContent = word;

      btnLeft.style.borderColor = 'var(--line)';
      btnRight.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (choseLeft: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = choseLeft === targetIsLeft;

      if (isCorrect) {
        correct++;
        if (choseLeft) btnLeft.style.borderColor = 'var(--ok)';
        else btnRight.style.borderColor = 'var(--ok)';
      } else {
        if (choseLeft) btnLeft.style.borderColor = 'var(--danger)';
        else btnRight.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnLeft.onclick = () => handleAns(true);
    btnRight.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default categorySortModule;
