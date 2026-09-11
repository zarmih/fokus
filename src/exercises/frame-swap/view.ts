import { FrameSwapEngine } from './engine';
import { manifest, getParams } from './manifest';
import { mountStage } from '../stage';

export function render(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new FrameSwapEngine();
  const stage = mountStage(container, 'flexibility');
  let rounds = 0, correctCount = 0, totalRt = 0;
  let currentState: any = null;
  let roundStart = 0;

  stage.board.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:40px;">
      <div id="fs-frame" style="width:120px; height:120px; border:6px solid var(--text); display:flex; align-items:center; justify-content:center;">
        <div id="fs-target" style="width:60px; height:60px;"></div>
      </div>
      <div id="fs-options" style="display:flex; gap:20px;"></div>
    </div>
  `;

  const frameEl = stage.board.querySelector('#fs-frame') as HTMLElement;
  const targetEl = stage.board.querySelector('#fs-target') as HTMLElement;
  const optionsEl = stage.board.querySelector('#fs-options') as HTMLElement;

  const drawShape = (el: HTMLElement, color: string, shape: string) => {
    el.style.backgroundColor = 'transparent';
    el.style.borderRadius = '0';
    el.style.borderBottom = 'none';
    if (shape === 'circle') {
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
    } else if (shape === 'square') {
      el.style.backgroundColor = color;
    } else if (shape === 'triangle') {
      el.style.width = '0';
      el.style.height = '0';
      el.style.borderLeft = '30px solid transparent';
      el.style.borderRight = '30px solid transparent';
      el.style.borderBottom = `60px solid ${color}`;
    }
  };

  const nextRound = () => {
    if (isTimeUp()) return finish();
    const params = getParams(level);
    currentState = engine.startRound(params);
    
    frameEl.style.borderRadius = currentState.rule === 'color' ? '50%' : '12px';
    
    targetEl.style.width = '60px'; targetEl.style.height = '60px'; targetEl.style.borderLeft = 'none'; targetEl.style.borderRight = 'none';
    drawShape(targetEl, currentState.target.color, currentState.target.shape);

    optionsEl.innerHTML = '';
    currentState.options.forEach((opt: any, i: number) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.width = '100px';
      btn.style.height = '100px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      
      const icon = document.createElement('div');
      icon.style.width = '50px'; icon.style.height = '50px';
      drawShape(icon, opt.color, opt.shape);
      btn.appendChild(icon);
      
      btn.onclick = () => handleAction(i);
      optionsEl.appendChild(btn);
    });

    roundStart = Date.now();
  };

  const handleAction = (idx: number) => {
    if (!currentState) return;
    const rt = Date.now() - roundStart;
    const { correct } = engine.submit(idx, currentState.correctIndex);
    
    rounds++;
    if (correct) correctCount++;
    totalRt += rt;

    stage.pulse(correct);
    currentState = null;
    setTimeout(nextRound, 300);
  };

  const finish = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: totalRt / Math.max(1, rounds),
      rounds
    });
  };

  nextRound();
  return () => {
    stage.cleanup();
  };
}
