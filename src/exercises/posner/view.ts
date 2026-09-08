import { PosnerEngine, Side } from './engine';
import { getPosnerParams } from './manifest';

export function renderPosner(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const params = getPosnerParams(level);
  const engine = new PosnerEngine();
  
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let hasEnded = false;
  let currentTimer: any;
  let trialActive = false;
  let roundStartTime = 0;
  let actualTargetSide: Side | null = null;

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; max-width: 500px; height: 200px;">
        <div id="box-left" style="position: absolute; left: 10%; width: 60px; height: 60px; border: 2px solid #555; border-radius: 8px; display: flex; align-items: center; justify-content: center;"></div>
        <div id="cue-center" style="position: absolute; font-size: 3rem; color: #888; transition: color 0.2s;">+</div>
        <div id="box-right" style="position: absolute; right: 10%; width: 60px; height: 60px; border: 2px solid #555; border-radius: 8px; display: flex; align-items: center; justify-content: center;"></div>
      </div>
      <div style="display: flex; gap: 16px; margin-top: 40px; width: 100%; max-width: 300px;">
        <button class="posner-btn" data-side="left" style="flex: 1; padding: 16px; font-size: 1.2rem; background: #333; color: #fff; border: none; border-radius: 8px; cursor: pointer;">&larr; Влево</button>
        <button class="posner-btn" data-side="right" style="flex: 1; padding: 16px; font-size: 1.2rem; background: #333; color: #fff; border: none; border-radius: 8px; cursor: pointer;">Вправо &rarr;</button>
      </div>
    </div>
  `;

  const boxLeft = container.querySelector('#box-left') as HTMLElement;
  const boxRight = container.querySelector('#box-right') as HTMLElement;
  const cueCenter = container.querySelector('#cue-center') as HTMLElement;

  const startRound = () => {
    if (isTimeUp() || hasEnded) {
      finishBlock();
      return;
    }

    trialActive = false;
    actualTargetSide = null;
    boxLeft.innerHTML = '';
    boxRight.innerHTML = '';
    cueCenter.textContent = '+';
    cueCenter.style.color = '#888';

    const trial = engine.nextTrial(params.invalidPct);

    currentTimer = setTimeout(() => {
      if (hasEnded) return;

      if (trial.cueSide === 'left') {
        cueCenter.textContent = '←';
        cueCenter.style.color = '#fff';
      } else if (trial.cueSide === 'right') {
        cueCenter.textContent = '→';
        cueCenter.style.color = '#fff';
      } else {
        cueCenter.textContent = '↔';
        cueCenter.style.color = '#fff';
      }

      currentTimer = setTimeout(() => {
        if (hasEnded) return;

        cueCenter.textContent = '+';
        cueCenter.style.color = '#555';
        
        const targetBox = trial.targetSide === 'left' ? boxLeft : boxRight;
        targetBox.innerHTML = '<div style="width: 30px; height: 30px; background: #4caf50; border-radius: 50%; box-shadow: 0 0 10px #4caf50;"></div>';
        
        trialActive = true;
        actualTargetSide = trial.targetSide;
        roundStartTime = Date.now();

        currentTimer = setTimeout(() => {
          if (hasEnded || !trialActive) return;
          finishRound(null, params.targetDuration);
        }, params.targetDuration);

      }, 200);

    }, 600 + Math.random() * 800);
  };

  const finishRound = (userSide: Side | null, rt: number) => {
    if (!trialActive) return;
    trialActive = false;
    clearTimeout(currentTimer);

    let correct = false;
    if (userSide !== null && actualTargetSide !== null) {
      correct = engine.submit(userSide, actualTargetSide);
    }

    if (correct) {
      correctCount++;
      totalRt += rt;
      cueCenter.textContent = '✓';
      cueCenter.style.color = '#4caf50';
    } else {
      cueCenter.textContent = '✗';
      cueCenter.style.color = '#f44336';
      totalRt += params.targetDuration;
    }
    rounds++;

    setTimeout(() => {
      startRound();
    }, 400);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!trialActive) return;
    if (e.key === 'ArrowLeft') finishRound('left', Date.now() - roundStartTime);
    else if (e.key === 'ArrowRight') finishRound('right', Date.now() - roundStartTime);
  };
  document.addEventListener('keydown', onKey);

  container.querySelectorAll('.posner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!trialActive) return;
      const side = (btn as HTMLElement).dataset.side as Side;
      finishRound(side, Date.now() - roundStartTime);
    });
  });

  const finishBlock = () => {
    hasEnded = true;
    clearTimeout(currentTimer);
    document.removeEventListener('keydown', onKey);
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  
  return () => {
    hasEnded = true;
    clearTimeout(currentTimer);
    document.removeEventListener('keydown', onKey);
  };
}
