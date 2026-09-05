import { PairsGame } from './engine';
import { getPairsParams } from './manifest';

export function renderPairs(container: HTMLElement, level: number, finishBlock: (res: {accuracy: number, avgRtMs: number}) => void, isTimeUp: () => boolean) {
  const params = getPairsParams(level);
  let totalAcc = 0;
  let totalRt = 0;
  let rounds = 0;
  let gameTimeout: any;

  const nextRound = () => {
    if (isTimeUp()) {
      finishBlock({
        accuracy: rounds > 0 ? totalAcc / rounds : 0,
        avgRtMs: rounds > 0 ? totalRt / rounds : 0
      });
      return;
    }

    const game = new PairsGame(params.pairsCount);
    let roundStart = Date.now();
    let errors = 0;
    
    let gridStyle = '';
    if (game.cards.length <= 6) gridStyle = 'grid-template-columns: repeat(3, 1fr);';
    else if (game.cards.length <= 12) gridStyle = 'grid-template-columns: repeat(4, 1fr);';
    else gridStyle = 'grid-template-columns: repeat(4, 1fr);';

    container.innerHTML = `
      <div style="display: grid; ${gridStyle} gap: 16px; width: 100%; max-width: 440px; margin: 20px auto;">
        ${game.cards.map((c, i) => `
          <div class="pairs-card" data-idx="${i}" style="perspective: 1000px; aspect-ratio: 3/4; cursor: pointer;">
            <div class="pairs-card-inner" style="position: relative; width: 100%; height: 100%; transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; ${params.previewMs > 0 ? 'transform: rotateY(180deg);' : ''}">
              <div class="pairs-card-front" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: linear-gradient(135deg, var(--dom-memory) 0%, #9333ea 100%); border-radius: 16px; box-shadow: var(--shadow-sm); border: 2px solid rgba(255,255,255,0.1);"></div>
              <div class="pairs-card-back" style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; background: var(--surface-2); border-radius: 16px; transform: rotateY(180deg); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow); border: 1px solid rgba(255,255,255,0.05);">
                <img src="${import.meta.env.BASE_URL}art/tiles/${c}.svg" width="60%" style="pointer-events: none; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));">
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    let interactionBlocked = true;

    gameTimeout = setTimeout(() => {
      if (isTimeUp()) {
        nextRound();
        return;
      }
      container.querySelectorAll('.pairs-card-inner').forEach(el => {
        (el as HTMLElement).style.transform = 'rotateY(0deg)';
      });
      interactionBlocked = false;
      roundStart = Date.now(); // reset after preview
    }, params.previewMs);

    container.querySelectorAll('.pairs-card').forEach(card => {
      card.addEventListener('click', () => {
        if (interactionBlocked || isTimeUp()) return;
        const idx = parseInt((card as HTMLElement).dataset.idx || '0', 10);
        const inner = card.querySelector('.pairs-card-inner') as HTMLElement;
        
        const res = game.flip(idx);
        if (res === 'invalid') return;
        
        inner.style.transform = 'rotateY(180deg)';
        
        if (res === 'mismatch') {
          errors++;
          interactionBlocked = true;
          setTimeout(() => {
            if (isTimeUp()) {
              nextRound();
              return;
            }
            game.flipped.forEach(i => {
              const c = container.querySelector(`.pairs-card[data-idx="${i}"] .pairs-card-inner`) as HTMLElement;
              if (c) c.style.transform = 'rotateY(0deg)';
            });
            game.clearFlipped();
            interactionBlocked = false;
          }, 800);
        } else if (res === 'win') {
          interactionBlocked = true;
          const acc = Math.max(0, 1 - errors / game.pairsCount);
          const rt = Date.now() - roundStart;
          totalAcc += acc;
          totalRt += rt;
          rounds++;
          setTimeout(nextRound, 600);
        }
      });
    });
  };

  nextRound();
}
