import { PulseRailEngine } from './engine';
import { manifest, getParams } from './manifest';
import { mountStage } from '../stage';

export function render(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new PulseRailEngine();
  const stage = mountStage(container, 'attention');
  let rounds = 0, correctCount = 0, totalRt = 0;
  let currentState: any = null;
  let timer: number;
  let roundStart = 0;

  stage.board.innerHTML = `
    <div style="display:flex; justify-content:space-between; width:100%; max-width:400px; margin:0 auto; position:relative;">
      <div id="pr-left" style="width:80px; height:200px; border:2px dashed var(--line); border-radius:12px; display:flex; align-items:center; justify-content:center;"></div>
      <div id="pr-center" style="width:60px; height:60px; border-radius:50%; border:4px solid var(--text); position:absolute; top:70px; left:50%; transform:translateX(-50%);"></div>
      <div id="pr-right" style="width:80px; height:200px; border:2px dashed var(--line); border-radius:12px; display:flex; align-items:center; justify-content:center;"></div>
    </div>
    <div style="margin-top:40px; display:flex; gap:20px; justify-content:center;">
      <button id="pr-btn-left" class="btn">ВЛЕВО (⬅️)</button>
      <button id="pr-btn-right" class="btn">ВПРАВО (➡️)</button>
    </div>
  `;

  const leftRail = stage.board.querySelector('#pr-left') as HTMLElement;
  const rightRail = stage.board.querySelector('#pr-right') as HTMLElement;
  const centerTarget = stage.board.querySelector('#pr-center') as HTMLElement;
  const btnLeft = stage.board.querySelector('#pr-btn-left') as HTMLButtonElement;
  const btnRight = stage.board.querySelector('#pr-btn-right') as HTMLButtonElement;

  const nextRound = () => {
    if (isTimeUp()) return finish();
    const params = getParams(level);
    currentState = engine.startRound(params);
    
    centerTarget.style.backgroundColor = currentState.targetColor;
    leftRail.innerHTML = '';
    rightRail.innerHTML = '';
    
    const obj = document.createElement('div');
    obj.style.width = '40px';
    obj.style.height = '40px';
    obj.style.borderRadius = '50%';
    obj.style.backgroundColor = currentState.stimulusColor;
    
    if (currentState.side === 'left') leftRail.appendChild(obj);
    else rightRail.appendChild(obj);

    roundStart = Date.now();
    timer = window.setTimeout(() => handleAction('none'), params.speedMs);
  };

  const handleAction = (action: 'left'|'right'|'none') => {
    if (!currentState) return;
    clearTimeout(timer);
    const rt = Date.now() - roundStart;
    const { correct } = engine.submit(action, currentState);
    
    rounds++;
    if (correct) correctCount++;
    if (action !== 'none') totalRt += rt;

    stage.pulse(correct);
    currentState = null;
    
    leftRail.innerHTML = '';
    rightRail.innerHTML = '';
    setTimeout(nextRound, 300);
  };

  btnLeft.onclick = () => handleAction('left');
  btnRight.onclick = () => handleAction('right');

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') handleAction('left');
    if (e.code === 'ArrowRight') handleAction('right');
  };
  window.addEventListener('keydown', onKey);

  const finish = () => {
    window.removeEventListener('keydown', onKey);
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: totalRt / Math.max(1, rounds),
      rounds
    });
  };

  nextRound();
  return () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    stage.cleanup();
  };
}
