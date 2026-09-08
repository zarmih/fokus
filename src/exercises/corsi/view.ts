import { CorsiEngine } from './engine';
import { getCorsiParams } from './manifest';

export function renderCorsi(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const params = getCorsiParams(level);
  
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let hasEnded = false;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }

    const engine = new CorsiEngine(params.span, params.blocks);
    const seq = engine.getSequence();
    
    const positions: {top: string, left: string}[] = [];
    for (let i = 0; i < params.blocks; i++) {
       const row = Math.floor(i / 3);
       const col = i % 3;
       positions.push({
         top: (row * 33 + Math.random() * 5) + '%',
         left: (col * 33 + Math.random() * 5) + '%'
       });
    }

    container.innerHTML = `
      <div style="position: relative; width: 100%; max-width: 350px; aspect-ratio: 1/1; margin: 0 auto;">
        ${positions.map((p, i) => `
          <div class="corsi-block" data-idx="${i}" style="
            position: absolute; 
            top: ${p.top}; 
            left: ${p.left}; 
            width: 28%; 
            height: 28%; 
            background: #333; 
            border-radius: 8px; 
            transition: background 0.2s, transform 0.1s;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          "></div>
        `).join('')}
      </div>
      <div id="corsi-status" style="text-align: center; margin-top: 24px; font-size: 1.2rem; color: #888;">Запоминай...</div>
    `;

    const blocks = container.querySelectorAll('.corsi-block');
    const status = container.querySelector('#corsi-status') as HTMLElement;
    
    let isShowing = true;
    let step = 0;
    let roundStartTime = 0;

    const showNext = () => {
      if (hasEnded) return;
      if (step >= seq.length) {
        isShowing = false;
        status.textContent = 'Повтори!';
        status.style.color = '#fff';
        roundStartTime = Date.now();
        return;
      }
      
      const b = blocks[seq[step]] as HTMLElement;
      b.style.background = '#4caf50';
      b.style.transform = 'scale(1.05)';
      
      setTimeout(() => {
        if (hasEnded) return;
        b.style.background = '#333';
        b.style.transform = 'scale(1)';
        step++;
        setTimeout(showNext, 250);
      }, 500);
    };

    setTimeout(showNext, 600);

    blocks.forEach(b => {
      b.addEventListener('click', () => {
        if (isShowing || hasEnded) return;
        
        const idx = parseInt((b as HTMLElement).dataset.idx!);
        const res = engine.submit(idx);
        
        if (res.correct) {
          (b as HTMLElement).style.background = '#2196f3';
          setTimeout(() => (b as HTMLElement).style.background = '#333', 200);
          
          if (res.isDone) {
            correctCount++;
            totalRt += (Date.now() - roundStartTime);
            rounds++;
            setTimeout(startRound, 500);
          }
        } else {
          (b as HTMLElement).style.background = '#f44336';
          status.textContent = 'Ошибка';
          status.style.color = '#f44336';
          setTimeout(() => {
            rounds++;
            startRound();
          }, 800);
        }
      });
    });
  };

  const finishBlock = () => {
    hasEnded = true;
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  
  return () => {
    hasEnded = true;
  };
}
