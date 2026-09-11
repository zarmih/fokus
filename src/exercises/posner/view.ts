import { PosnerEngine, Side } from './engine';
import { getPosnerParams, posnerManifest } from './manifest';
import { BLOCK_SHAPE_MS, elapsedProgress, paramsAlongCurve } from '../diff-curves';
import { mountStage } from '../stage';

export function renderPosner(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new PosnerEngine();
  const stage = mountStage(container, 'attention');
  const blockStartTime = Date.now();
  let params = getPosnerParams(level);
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let hasEnded = false;
  let currentTimer: number;
  let trialActive = false;
  let roundStartTime = 0;
  let actualTargetSide: Side | null = null;

  stage.setStatus('Следите за целью');
  stage.board.innerHTML = `
    <div class="posner-lane">
      <div class="posner-box" id="box-left"></div>
      <div id="cue-center" style="font-size:2.4rem;font-weight:800;color:var(--muted);min-width:48px;text-align:center">+</div>
      <div class="posner-box" id="box-right"></div>
    </div>
    <div class="play-choice" style="margin-top:28px">
      <button class="posner-btn btn-secondary" data-side="left">← Влево</button>
      <button class="posner-btn btn-secondary" data-side="right">Вправо →</button>
    </div>
  `;
  const boxLeft = stage.board.querySelector('#box-left') as HTMLElement;
  const boxRight = stage.board.querySelector('#box-right') as HTMLElement;
  const cueCenter = stage.board.querySelector('#cue-center') as HTMLElement;

  const startRound = () => {
    if (isTimeUp() || hasEnded) { finishBlock(); return; }
    trialActive = false;
    actualTargetSide = null;
    boxLeft.innerHTML = '';
    boxRight.innerHTML = '';
    cueCenter.textContent = '+';
    cueCenter.style.color = '';
    params = paramsAlongCurve(getPosnerParams, {
      target: level,
      t: elapsedProgress(Date.now() - blockStartTime, BLOCK_SHAPE_MS),
      kind: posnerManifest.diffCurve
    }).params;
    const trial = engine.nextTrial(params.invalidPct);
    currentTimer = window.setTimeout(() => {
      if (hasEnded) return;
      cueCenter.textContent = trial.cueSide === 'left' ? '←' : trial.cueSide === 'right' ? '→' : '↔';
      cueCenter.style.color = '#fff';
      currentTimer = window.setTimeout(() => {
        if (hasEnded) return;
        cueCenter.textContent = '+';
        cueCenter.style.color = '';
        const targetBox = trial.targetSide === 'left' ? boxLeft : boxRight;
        targetBox.innerHTML = '<div class="posner-dot"></div>';
        trialActive = true;
        actualTargetSide = trial.targetSide;
        roundStartTime = Date.now();
        currentTimer = window.setTimeout(() => {
          if (hasEnded || !trialActive) return;
          finishRound(null, params.targetDuration);
        }, params.targetDuration);
      }, 200);
    }, 520 + Math.random() * 700);
  };

  const finishRound = (userSide: Side | null, rt: number) => {
    if (!trialActive) return;
    trialActive = false;
    clearTimeout(currentTimer);
    let correct = false;
    if (userSide !== null && actualTargetSide !== null) {
      correct = engine.submit(userSide, actualTargetSide);
    }
    if (correct) { correctCount++; totalRt += rt; }
    else totalRt += params.targetDuration;
    rounds++;
    stage.pulse(correct);
    cueCenter.textContent = correct ? '✓' : '✗';
    cueCenter.style.color = correct ? '#10b981' : '#ef4444';
    setTimeout(startRound, 360);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!trialActive) return;
    if (e.key === 'ArrowLeft') finishRound('left', Date.now() - roundStartTime);
    else if (e.key === 'ArrowRight') finishRound('right', Date.now() - roundStartTime);
  };
  document.addEventListener('keydown', onKey);
  stage.board.querySelectorAll('.posner-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!trialActive) return;
      finishRound((btn as HTMLElement).dataset.side as Side, Date.now() - roundStartTime);
    });
  });

  const finishBlock = () => {
    hasEnded = true;
    clearTimeout(currentTimer);
    document.removeEventListener('keydown', onKey);
    stage.cleanup();
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
    stage.cleanup();
  };
}
