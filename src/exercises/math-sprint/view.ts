import { MathState, initGame, submitAnswer, getStats } from './engine';
import type { BlockResult } from '../contract';
import { mountStage } from '../stage';

export function renderMathSprint(
  container: HTMLElement,
  level: number,
  onEnd: (r: BlockResult) => void,
  isTimeUp: () => boolean
) {
  let state = initGame(level);
  let ended = false;
  const stage = mountStage(container, 'logic');
  stage.setStatus('Верно или нет?');
  stage.board.innerHTML = `
    <div class="eq-3d" id="eq-display"></div>
    <div class="play-choice">
      <button id="btn-false" class="btn-primary" style="background:linear-gradient(180deg,#f87171,var(--danger));margin:0">Неверно ←</button>
      <button id="btn-true" class="btn-primary" style="background:linear-gradient(180deg,#34d399,var(--ok));margin:0">Верно →</button>
    </div>
  `;
  const eqDisplay = stage.board.querySelector('#eq-display') as HTMLElement;
  const btnTrue = stage.board.querySelector('#btn-true') as HTMLButtonElement;
  const btnFalse = stage.board.querySelector('#btn-false') as HTMLButtonElement;

  function update() {
    eqDisplay.textContent = state.equation;
    eqDisplay.style.animation = 'none';
    void eqDisplay.offsetWidth;
    eqDisplay.style.animation = 'wordSpin 0.35s cubic-bezier(0.22, 1, 0.36, 1)';
  }

  function handleAnswer(answer: boolean) {
    if (ended || state.status !== 'playing') return;
    const ok = answer === state.isCorrect;
    state = submitAnswer(state, answer);
    stage.pulse(ok);
    if (state.status === 'done' || isTimeUp()) {
      ended = true;
      const stats = getStats(state);
      stage.cleanup();
      onEnd({ accuracy: stats.accuracy, avgRtMs: stats.avgRtMs, rounds: state.round });
    } else {
      update();
    }
  }

  btnTrue.addEventListener('click', () => handleAnswer(true));
  btnFalse.addEventListener('click', () => handleAnswer(false));
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') handleAnswer(true);
    if (e.key === 'ArrowLeft') handleAnswer(false);
  };
  window.addEventListener('keydown', onKeyDown);
  update();
  state.lastStartTime = Date.now();
  return () => {
    window.removeEventListener('keydown', onKeyDown);
    stage.cleanup();
  };
}
