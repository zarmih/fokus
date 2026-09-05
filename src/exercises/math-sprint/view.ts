import { MathState, initGame, submitAnswer, getStats } from './engine';
import type { BlockResult } from '../contract';

export function renderMathSprint(
  container: HTMLElement,
  level: number,
  onEnd: (r: BlockResult) => void,
  isTimeUp: () => boolean
) {
  let state = initGame(level);
  let ended = false;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;';
  
  const eqDisplay = document.createElement('div');
  eqDisplay.style.cssText = 'font-size: 48px; font-weight: bold; color: var(--text); margin-bottom: 40px; text-align: center;';
  
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 20px;';
  
  const btnTrue = document.createElement('button');
  btnTrue.className = 'btn-primary';
  btnTrue.style.cssText = 'background: var(--success); border-color: var(--success); width: 120px; font-size: 18px;';
  btnTrue.textContent = 'Верно (→)';
  
  const btnFalse = document.createElement('button');
  btnFalse.className = 'btn-primary';
  btnFalse.style.cssText = 'background: var(--danger); border-color: var(--danger); width: 120px; font-size: 18px;';
  btnFalse.textContent = 'Неверно (←)';

  btnRow.appendChild(btnFalse);
  btnRow.appendChild(btnTrue);
  
  wrapper.appendChild(eqDisplay);
  wrapper.appendChild(btnRow);
  container.appendChild(wrapper);

  function update() {
    eqDisplay.textContent = state.equation;
  }

  function handleAnswer(answer: boolean) {
    if (ended || state.status !== 'playing') return;
    state = submitAnswer(state, answer);
    
    if (state.status === 'done' || isTimeUp()) {
      ended = true;
      const stats = getStats(state);
      onEnd({
        accuracy: stats.accuracy,
        avgRtMs: stats.avgRtMs,
        rounds: state.round
      });
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
  };
}
