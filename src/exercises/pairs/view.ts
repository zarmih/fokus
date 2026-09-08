import { PairsGame } from './engine';
import { getPairsParams } from './manifest';
import { mountStage } from '../stage';

export function renderPairs(container: HTMLElement, level: number, finishBlock: (res: {accuracy: number, avgRtMs: number}) => void, isTimeUp: () => boolean) {
  const params = getPairsParams(level);
  const stage = mountStage(container, 'memory');
  let totalAcc = 0;
  let totalRt = 0;
  let rounds = 0;
  let gameTimeout: number;

  const nextRound = () => {
    if (isTimeUp()) {
      stage.cleanup();
      finishBlock({
        accuracy: rounds > 0 ? totalAcc / rounds : 0,
        avgRtMs: rounds > 0 ? totalRt / rounds : 0
      });
      return;
    }

    const game = new PairsGame(params.pairsCount);
    let roundStart = Date.now();
    let errors = 0;
    const cols = game.cards.length <= 6 ? 3 : 4;
    stage.setStatus(params.previewMs > 0 ? 'Запомните пары' : 'Найдите пары');
    stage.board.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:12px;width:100%;max-width:400px;">
        ${game.cards.map((c, i) => `
          <div class="card-3d pairs-card" data-idx="${i}">
            <div class="card-3d-inner pairs-card-inner" style="${params.previewMs > 0 ? 'transform:rotateY(180deg)' : ''}">
              <div class="card-face card-front pairs-card-front"></div>
              <div class="card-face card-back pairs-card-back">
                <img src="${import.meta.env.BASE_URL}art/tiles/${c}.svg" width="58%" alt="" style="pointer-events:none;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))">
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    let interactionBlocked = true;
    gameTimeout = window.setTimeout(() => {
      if (isTimeUp()) { nextRound(); return; }
      stage.board.querySelectorAll('.pairs-card-inner').forEach(el => {
        (el as HTMLElement).style.transform = 'rotateY(0deg)';
      });
      stage.setStatus('Найдите пары');
      interactionBlocked = false;
      roundStart = Date.now();
    }, params.previewMs);

    stage.board.querySelectorAll('.pairs-card').forEach(card => {
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
          stage.pulse(false);
          setTimeout(() => {
            if (isTimeUp()) { nextRound(); return; }
            game.flipped.forEach(i => {
              const c = stage.board.querySelector(`.pairs-card[data-idx="${i}"] .pairs-card-inner`) as HTMLElement;
              if (c) c.style.transform = 'rotateY(0deg)';
            });
            game.clearFlipped();
            interactionBlocked = false;
          }, 720);
        } else if (res === 'win') {
          interactionBlocked = true;
          stage.pulse(true);
          const acc = Math.max(0, 1 - errors / game.pairsCount);
          totalAcc += acc;
          totalRt += Date.now() - roundStart;
          rounds++;
          setTimeout(nextRound, 520);
        }
      });
    });
  };

  nextRound();
  return () => { clearTimeout(gameTimeout); stage.cleanup(); };
}
