import { VowelCountEngine } from './engine';
import { getVowelCountParams } from './manifest';
import { mountStage } from '../stage';

export function renderVowelCount(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new VowelCountEngine();
  const stage = mountStage(container, 'flexibility');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 6;
  let currentTimer: number;

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const params = getVowelCountParams(level);
    const { word, vowelCount, options } = engine.start(params);
    const roundStartTime = Date.now();
    stage.setStatus('Сколько гласных?');

    stage.board.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 48px; width:100%; height:100%;">
        <div style="font-size: 56px; font-weight: 800; letter-spacing: 4px; color: var(--text);">${word}</div>
        <div class="vc-options" style="display: flex; gap: 16px; justify-content: center;">
          ${options.map(o => `
            <button class="vc-btn" data-val="${o}" style="width: 72px; height: 72px; font-size: 32px; font-weight: bold; border-radius: 16px; background: var(--surface); color: var(--text); border: 2px solid var(--line); cursor: pointer; transition: transform 0.1s, border-color 0.1s;">
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
      
      stage.board.querySelectorAll('.vc-btn').forEach((b) => {
        (b as HTMLButtonElement).disabled = true;
        const val = parseInt((b as HTMLElement).dataset.val!);
        if (val === vowelCount) {
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
      }, 480);
    };

    currentTimer = window.setTimeout(() => finishRound(null, params.deadlineMs), params.deadlineMs);
    stage.board.querySelectorAll('.vc-btn').forEach(btn => {
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
