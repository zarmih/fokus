import { GoNoGoEngine } from './engine';
import { goNoGoManifest } from './manifest';

export function renderGoNoGo(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const cfg = (level <= 3 && goNoGoManifest.levels) ? goNoGoManifest.levels[level as keyof typeof goNoGoManifest.levels] : { trials: 30, noGoRatio: 0.4 };
  const engine = new GoNoGoEngine(cfg.trials, cfg.noGoRatio);
  
  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
      <div id="stimulus" style="width: 120px; height: 120px; border-radius: 50%; background: transparent; transition: background 0.1s; margin-bottom: 60px;"></div>
      <button id="btn-react" class="btn-primary" style="width: 200px; height: 64px; font-size: 20px;">НАЖАТЬ</button>
    </div>
  `;

  const stimulus = container.querySelector('#stimulus') as HTMLElement;
  const btnReact = container.querySelector('#btn-react') as HTMLButtonElement;
  
  let currentIsGo = false;
  let showTime = 0;
  let timeoutId: any;
  let isWaiting = true;

  const showNext = () => {
    if (engine.isFinished() || isTimeUp()) {
      onBlockEnd(engine.getScore());
      return;
    }
    
    isWaiting = true;
    stimulus.style.background = 'transparent';
    btnReact.disabled = true;

    // ITI
    timeoutId = setTimeout(() => {
      currentIsGo = engine.nextTrial();
      stimulus.style.background = currentIsGo ? '#4caf50' : '#f44336';
      showTime = performance.now();
      btnReact.disabled = false;
      isWaiting = false;

      // Max time to react
      timeoutId = setTimeout(() => {
        handleReaction(false);
      }, 1000);
    }, 500 + Math.random() * 1000);
  };

  const handleReaction = (reacted: boolean) => {
    if (isWaiting) return;
    clearTimeout(timeoutId);
    isWaiting = true;
    const rt = performance.now() - showTime;
    engine.recordAction(currentIsGo, reacted, rt);
    showNext();
  };

  btnReact.addEventListener('click', () => {
    handleReaction(true);
  });

  showNext();
  
  return () => {
    clearTimeout(timeoutId);
  };
}
