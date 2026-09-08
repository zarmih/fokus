import { MentalRotationEngine } from './engine';
import { mentalRotationManifest } from './manifest';
import { mountStage } from '../stage';

function fLetter() {
  return `<div class="f3d">
    <i class="f-bar f-top"></i>
    <i class="f-bar f-stem"></i>
    <i class="f-bar f-mid"></i>
  </div>`;
}

export function renderMentalRotation(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const cfg = (level <= 3 && mentalRotationManifest.levels) ? mentalRotationManifest.levels[level as keyof typeof mentalRotationManifest.levels] : { trials: 20, maxAngle: 270 };
  const engine = new MentalRotationEngine(cfg.trials, cfg.maxAngle);
  const stage = mountStage(container, 'flexibility');
  stage.setStatus('Это та же фигура?');
  stage.board.innerHTML = `
    <div class="rot-world">
      <div class="rot-piece" id="piece-left">${fLetter()}</div>
      <div class="rot-piece" id="piece-right">${fLetter()}</div>
    </div>
    <div class="play-choice">
      <button id="btn-no" class="btn-secondary" style="margin:0;height:64px;font-size:20px">Нет</button>
      <button id="btn-yes" class="btn-primary" style="margin:0;height:64px;font-size:20px">Да</button>
    </div>
  `;
  const faceRight = stage.board.querySelector('#piece-right') as HTMLElement;
  const btnYes = stage.board.querySelector('#btn-yes') as HTMLButtonElement;
  const btnNo = stage.board.querySelector('#btn-no') as HTMLButtonElement;
  let currentMatch = false;
  let showTime = 0;
  let timeoutId: number;

  const showNext = () => {
    if (engine.isFinished() || isTimeUp()) {
      stage.cleanup();
      onBlockEnd(engine.getScore());
      return;
    }
    const trial = engine.nextTrial()!;
    currentMatch = trial.isMatch;
    const flip = trial.isMatch ? 1 : -1;
    faceRight.style.transform = `rotateZ(${trial.rotateAngle}deg) rotateY(${trial.isMatch ? 0 : 180}deg) scaleX(${flip})`;
    faceRight.style.transition = 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)';
    showTime = performance.now();
    btnYes.disabled = false;
    btnNo.disabled = false;
  };

  const handleReaction = (userMatch: boolean) => {
    const rt = performance.now() - showTime;
    engine.recordAction(currentMatch, userMatch, rt);
    btnYes.disabled = true;
    btnNo.disabled = true;
    stage.pulse(currentMatch === userMatch);
    timeoutId = window.setTimeout(showNext, 280);
  };

  btnYes.addEventListener('click', () => handleReaction(true));
  btnNo.addEventListener('click', () => handleReaction(false));
  showNext();
  return () => { clearTimeout(timeoutId); stage.cleanup(); };
}
