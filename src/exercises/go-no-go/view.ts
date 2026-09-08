import { GoNoGoEngine } from './engine';
import { goNoGoManifest } from './manifest';
import { mountStage } from '../stage';

export function renderGoNoGo(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const cfg = (level <= 3 && goNoGoManifest.levels) ? goNoGoManifest.levels[level as keyof typeof goNoGoManifest.levels] : { trials: 30, noGoRatio: 0.4 };
  const engine = new GoNoGoEngine(cfg.trials, cfg.noGoRatio);
  const stage = mountStage(container, 'attention');
  stage.setStatus('Зелёный — жми, красный — стой');
  stage.board.innerHTML = `
    <div class="go-orb" id="stimulus"></div>
    <button id="btn-react" class="btn-primary" style="width:220px;height:64px;font-size:20px;margin:0">ЖМИ</button>
  `;
  const stimulus = stage.board.querySelector('#stimulus') as HTMLElement;
  const btnReact = stage.board.querySelector('#btn-react') as HTMLButtonElement;
  let currentIsGo = false;
  let showTime = 0;
  let timeoutId: number;
  let isWaiting = true;

  const showNext = () => {
    if (engine.isFinished() || isTimeUp()) {
      stage.cleanup();
      onBlockEnd(engine.getScore());
      return;
    }
    isWaiting = true;
    stimulus.className = 'go-orb';
    btnReact.disabled = true;
    timeoutId = window.setTimeout(() => {
      currentIsGo = engine.nextTrial();
      stimulus.className = `go-orb ${currentIsGo ? 'go' : 'nogo'}`;
      showTime = performance.now();
      btnReact.disabled = false;
      isWaiting = false;
      timeoutId = window.setTimeout(() => handleReaction(false), 1000);
    }, 420 + Math.random() * 900);
  };

  const handleReaction = (reacted: boolean) => {
    if (isWaiting) return;
    clearTimeout(timeoutId);
    isWaiting = true;
    const rt = performance.now() - showTime;
    const ok = currentIsGo ? reacted : !reacted;
    engine.recordAction(currentIsGo, reacted, rt);
    stage.pulse(ok);
    showNext();
  };

  btnReact.addEventListener('click', () => handleReaction(true));
  showNext();
  return () => { clearTimeout(timeoutId); stage.cleanup(); };
}
