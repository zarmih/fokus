import { ShapeEquationEngine } from './engine';
import { getShapeEquationParams } from './manifest';
import { mountStage } from '../stage';

export function renderShapeEquation(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new ShapeEquationEngine();
  const stage = mountStage(container, 'problem_solving');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 3;
  let currentTimer: number;

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const params = getShapeEquationParams(level);
    const { equations, targetShape, targetVal, options } = engine.start(params);
    const roundStartTime = Date.now();
    stage.setStatus('Чему равна фигура?');

    stage.board.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; width:100%;">
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 28px; font-weight: bold; color: var(--text);">
          ${equations.map(eq => `
            <div style="display: flex; justify-content: space-between; gap: 16px;">
              <span>${eq.left[0]} + ${eq.left[1]}</span>
              <span>= ${eq.right}</span>
            </div>
          `).join('')}
          <div style="display: flex; justify-content: space-between; gap: 16px; margin-top: 12px; border-top: 2px dashed var(--line); padding-top: 12px; color: var(--brand);">
            <span>${targetShape}</span>
            <span>= ?</span>
          </div>
        </div>
        <div class="se-options" style="display: flex; gap: 16px; justify-content: center; margin-top: 16px;">
          ${options.map(o => `
            <button class="se-btn" data-val="${o}" style="width: 64px; height: 64px; font-size: 24px; font-weight: bold; border-radius: 12px; background: var(--surface); color: var(--text); border: 2px solid var(--line); cursor: pointer; transition: transform 0.1s;">
              ${o}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const finishRound = (choice: number | null, rt: number) => {
      clearTimeout(currentTimer);
      const { accuracy } = engine.submit(choice);
      if (accuracy === 1) correctCount++;
      totalRt += rt;
      rounds++;
      stage.pulse(accuracy === 1);
      
      stage.board.querySelectorAll('.se-btn').forEach((b) => {
        (b as HTMLButtonElement).disabled = true;
        const val = parseInt((b as HTMLElement).dataset.val!);
        if (val === targetVal) {
           (b as HTMLElement).style.borderColor = 'var(--ok)';
           (b as HTMLElement).style.color = 'var(--ok)';
           (b as HTMLElement).style.transform = 'scale(1.1)';
        }
        else if (val === choice) {
           (b as HTMLElement).style.borderColor = 'var(--danger)';
           (b as HTMLElement).style.color = 'var(--danger)';
        }
      });
      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) finishBlock();
        else startRound();
      }, 500);
    };

    currentTimer = window.setTimeout(() => finishRound(null, params.deadlineMs), params.deadlineMs);
    stage.board.querySelectorAll('.se-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finishRound(parseInt((btn as HTMLElement).dataset.val!), Date.now() - roundStartTime);
      });
      btn.addEventListener('mousedown', () => {
        (btn as HTMLElement).style.transform = 'scale(0.95)';
      });
    });
  };

  const finishBlock = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => { clearTimeout(currentTimer); stage.cleanup(); };
}
