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
  eqDisplay.style.cssText = 'font-size: 64px; font-weight: 900; color: var(--text); margin-bottom: 64px; text-align: center; text-shadow: 0 2px 4px rgba(0,0,0,0.1); letter-spacing: -0.02em;';
  
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 24px; width: 100%; max-width: 320px;';
  
  const btnTrue = document.createElement('button');
  btnTrue.className = 'btn-primary';
  btnTrue.style.cssText = 'background: linear-gradient(135deg, var(--ok) 0%, #059669 100%); flex: 1; font-size: 20px; font-weight: 700; margin: 0; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);';
  btnTrue.textContent = 'Верно (→)';
  
  const btnFalse = document.createElement('button');
  btnFalse.className = 'btn-primary';
  btnFalse.style.cssText = 'background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%); flex: 1; font-size: 20px; font-weight: 700; margin: 0; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);';
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
