import { BeaconRailEngine } from './engine';
import { getBeaconRailParams } from './manifest';
import { mountStage } from '../stage';
import { BlockResult } from '../contract';

export function renderBeaconRail(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: BlockResult) => void,
  isTimeUp: () => boolean = () => false
) {
  const engine = new BeaconRailEngine();
  const stage = mountStage(container, 'attention');
  let rounds = 0;
  let correctRounds = 0;
  let totalRt = 0;
  let timers: number[] = [];
  
  const { targetColor } = engine.start();

  stage.board.innerHTML = `
    <style>
      .br-container {
        position: relative;
        width: 300px;
        height: 60px;
        margin: 40px auto;
        background: var(--surface);
        border-radius: 30px;
        overflow: hidden;
      }
      .br-zone {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 60px;
        height: 60px;
        border: 4px solid var(--accent);
        border-radius: 50%;
        box-sizing: border-box;
        z-index: 2;
      }
      .br-item {
        position: absolute;
        top: 10px;
        left: 100%;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        transition: left linear;
        z-index: 1;
      }
      .br-btn {
        display: block;
        width: 200px;
        margin: 0 auto;
        padding: 16px;
        font-size: 20px;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
      }
      .br-btn:active {
        opacity: 0.8;
      }
    </style>
    <div class="br-container" id="br-track">
      <div class="br-zone"></div>
    </div>
    <button class="br-btn" id="br-action">НАЖАТЬ (Пробел)</button>
  `;

  const track = stage.board.querySelector('#br-track') as HTMLElement;
  const actionBtn = stage.board.querySelector('#br-action') as HTMLButtonElement;
  
  let currentItem: { color: string, isTarget: boolean } | null = null;
  let itemEl: HTMLElement | null = null;
  let pressed = false;
  let roundStartTime = 0;

  const colorMap: Record<string, string> = {
    red: '#ff4444', blue: '#33b5e5', green: '#00C851', yellow: '#ffbb33', purple: '#aa66cc'
  };
  
  stage.setStatus(`Цель: <span style="color:${colorMap[targetColor]}">${targetColor.toUpperCase()}</span>`);

  const spawn = () => {
    if (isTimeUp()) {
      finish();
      return;
    }
    const params = getBeaconRailParams(level);
    
    currentItem = engine.generateItem(params.targetProbability);
    pressed = false;
    
    itemEl = document.createElement('div');
    itemEl.className = 'br-item';
    itemEl.style.backgroundColor = colorMap[currentItem.color] || currentItem.color;
    itemEl.style.transitionDuration = `${params.speedMs * 2}ms`;
    track.appendChild(itemEl);
    
    window.setTimeout(() => {
      if (itemEl) itemEl.style.left = '-40px';
    }, 50);

    roundStartTime = Date.now();

    const endT = window.setTimeout(() => {
      if (itemEl) itemEl.remove();
      if (!currentItem) return;
      
      const res = engine.submit(currentItem.isTarget, pressed);
      if (res.correct) correctRounds++;
      rounds++;
      
      stage.pulse(res.correct);
      
      const nextT = window.setTimeout(spawn, 500);
      timers.push(nextT);
    }, params.speedMs * 2);
    timers.push(endT);
  };

  actionBtn.addEventListener('click', () => {
    if (pressed || !currentItem) return;
    pressed = true;
    totalRt += (Date.now() - roundStartTime);
  });
  
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault();
      actionBtn.click();
    }
  };
  window.addEventListener('keydown', onKeyDown);

  const startT = window.setTimeout(spawn, 1000);
  timers.push(startT);

  const finish = () => {
    window.removeEventListener('keydown', onKeyDown);
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctRounds / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    timers.forEach(clearTimeout);
    stage.cleanup();
  };
}
