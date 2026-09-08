import { CorsiEngine } from './engine';
import { getCorsiParams } from './manifest';
import { mountStage } from '../stage';

export function renderCorsi(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const params = getCorsiParams(level);
  const stage = mountStage(container, 'memory');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let hasEnded = false;

  const startRound = () => {
    if (isTimeUp() || hasEnded) {
      finishBlock();
      return;
    }
    const engine = new CorsiEngine(params.span, params.blocks);
    const seq = engine.getSequence();
    const positions = Array.from({ length: params.blocks }, (_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      return { top: (row * 33 + 4) + '%', left: (col * 33 + 4) + '%' };
    });

    stage.setStatus('Запоминайте путь');
    stage.board.innerHTML = `
      <div class="corsi-arena">
        ${positions.map((p, i) => `<div class="corsi-block" data-idx="${i}" style="top:${p.top};left:${p.left};"><span class="cube-lid"></span><span class="cube-face"></span></div>`).join('')}
      </div>
    `;
    const blocks = stage.board.querySelectorAll('.corsi-block');
    let isShowing = true;
    let step = 0;
    let roundStartTime = 0;

    const showNext = () => {
      if (hasEnded) return;
      if (step >= seq.length) {
        isShowing = false;
        stage.setStatus('Повторите');
        roundStartTime = Date.now();
        return;
      }
      const b = blocks[seq[step]] as HTMLElement;
      b.classList.add('highlight');
      b.style.background = 'linear-gradient(180deg, #5eead4, var(--accent-2))';
      b.style.transform = 'translateY(-10px) rotateX(-8deg)';
      setTimeout(() => {
        if (hasEnded) return;
        b.classList.remove('highlight');
        b.style.background = '';
        b.style.transform = '';
        step++;
        setTimeout(showNext, 220);
      }, 480);
    };
    setTimeout(showNext, 500);

    blocks.forEach(b => {
      b.addEventListener('click', () => {
        if (isShowing || hasEnded) return;
        const idx = parseInt((b as HTMLElement).dataset.idx!);
        const res = engine.submit(idx);
        if (res.correct) {
          (b as HTMLElement).style.background = 'linear-gradient(180deg, #60a5fa, var(--dom-attention))';
          setTimeout(() => { (b as HTMLElement).style.background = ''; }, 180);
          if (res.isDone) {
            correctCount++;
            totalRt += Date.now() - roundStartTime;
            rounds++;
            stage.pulse(true);
            setTimeout(startRound, 500);
          }
        } else {
          (b as HTMLElement).style.background = 'linear-gradient(180deg, #f87171, var(--danger))';
          stage.setStatus('Мимо');
          stage.pulse(false);
          rounds++;
          setTimeout(startRound, 700);
        }
      });
    });
  };

  const finishBlock = () => {
    hasEnded = true;
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => { hasEnded = true; stage.cleanup(); };
}
