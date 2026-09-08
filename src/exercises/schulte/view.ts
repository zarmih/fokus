import { SchulteEngine } from './engine';
import { getSchulteParams } from './manifest';

export function renderSchulte(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let errors = 0;
  let roundStartTime = Date.now();
  let checkInterval: any;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }

    const { size } = getSchulteParams(level);
    const engine = new SchulteEngine(size);
    roundStartTime = Date.now();

    const grid = engine.getGrid();
    
    container.innerHTML = `
      <div class="schulte-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
        <div style="margin-bottom: 16px; font-size: 1.2rem; color: #888;">Найдите: <span id="schulte-expected" style="color: #fff; font-weight: bold;">1</span></div>
        <div style="display: grid; grid-template-columns: repeat(${size}, 1fr); gap: 8px; width: 100%; max-width: 400px; aspect-ratio: 1/1;">
          ${grid.map(num => `
            <button class="schulte-btn" data-num="${num}" style="font-size: ${size > 4 ? '1.2rem' : '1.5rem'}; background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              ${num}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const expectedEl = container.querySelector('#schulte-expected') as HTMLElement;
    const btns = container.querySelectorAll('.schulte-btn');

    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        if ((btn as HTMLElement).style.visibility === 'hidden') return;
        
        const val = parseInt((btn as HTMLElement).dataset.num!);
        const isCorrect = engine.submit(val);
        
        if (isCorrect) {
          correctCount++;
          totalRt += (Date.now() - roundStartTime);
          roundStartTime = Date.now();
          (btn as HTMLButtonElement).style.visibility = 'hidden';
          
          if (engine.isDone()) {
            rounds++;
            setTimeout(startRound, 300);
          } else {
            expectedEl.textContent = engine.getExpected().toString();
          }
        } else {
          errors++;
          const b = btn as HTMLElement;
          const originalBg = b.style.background;
          b.style.background = '#f44336';
          setTimeout(() => {
             b.style.background = originalBg;
          }, 200);
        }
      });
    });
  };

  const finishBlock = () => {
    clearInterval(checkInterval);
    const totalClicks = correctCount + errors;
    onBlockEnd({
      accuracy: totalClicks > 0 ? correctCount / totalClicks : 0,
      avgRtMs: correctCount > 0 ? totalRt / correctCount : 0,
      rounds
    });
  };

  checkInterval = setInterval(() => {
    if (isTimeUp()) {
      finishBlock();
    }
  }, 1000);

  startRound();
  
  return () => {
    clearInterval(checkInterval);
  };
}
