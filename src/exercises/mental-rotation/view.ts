import { MentalRotationEngine } from './engine';
import { mentalRotationManifest } from './manifest';

export function renderMentalRotation(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const cfg = (level <= 3 && mentalRotationManifest.levels) ? mentalRotationManifest.levels[level as keyof typeof mentalRotationManifest.levels] : { trials: 20, maxAngle: 270 };
  const engine = new MentalRotationEngine(cfg.trials, cfg.maxAngle);
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
      <div style="display: flex; gap: 32px; margin-bottom: 60px;">
        <svg id="svg-left" width="100" height="100" viewBox="0 0 100 100" style="background: var(--surface); border-radius: 8px;">
          <path id="path-left" fill="var(--accent)" />
        </svg>
        <svg id="svg-right" width="100" height="100" viewBox="0 0 100 100" style="background: var(--surface); border-radius: 8px;">
          <g id="group-right" transform-origin="50 50">
            <path id="path-right" fill="var(--accent)" />
          </g>
        </svg>
      </div>
      
      <div style="display: flex; gap: 16px; width: 100%; max-width: 300px;">
        <button id="btn-no" class="btn-secondary" style="flex: 1; height: 64px; font-size: 20px;">НЕТ</button>
        <button id="btn-yes" class="btn-primary" style="flex: 1; height: 64px; font-size: 20px;">ДА</button>
      </div>
    </div>
  `;

  const pathLeft = container.querySelector('#path-left') as SVGPathElement;
  const pathRight = container.querySelector('#path-right') as SVGPathElement;
  const groupRight = container.querySelector('#group-right') as SVGGElement;
  
  const btnYes = container.querySelector('#btn-yes') as HTMLButtonElement;
  const btnNo = container.querySelector('#btn-no') as HTMLButtonElement;
  
  let currentMatch = false;
  let showTime = 0;
  let timeoutId: any;

  const showNext = () => {
    if (engine.isFinished() || isTimeUp()) {
      onBlockEnd(engine.getScore());
      return;
    }
    
    const trial = engine.nextTrial()!;
    currentMatch = trial.isMatch;
    
    pathLeft.setAttribute('d', trial.pattern);
    pathRight.setAttribute('d', trial.pattern);
    
    let transform = `rotate(${trial.rotateAngle})`;
    if (!trial.isMatch) {
      transform += ` scale(-1, 1)`;
    }
    groupRight.setAttribute('transform', transform);
    
    showTime = performance.now();
  };

  const handleReaction = (userMatch: boolean) => {
    const rt = performance.now() - showTime;
    engine.recordAction(currentMatch, userMatch, rt);
    
    btnYes.disabled = true;
    btnNo.disabled = true;
    
    // Quick flash
    const isCorrect = currentMatch === userMatch;
    container.style.background = isCorrect ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
    
    timeoutId = setTimeout(() => {
      container.style.background = 'transparent';
      btnYes.disabled = false;
      btnNo.disabled = false;
      showNext();
    }, 300);
  };

  btnYes.addEventListener('click', () => handleReaction(true));
  btnNo.addEventListener('click', () => handleReaction(false));

  showNext();
  
  return () => {
    clearTimeout(timeoutId);
  };
}
