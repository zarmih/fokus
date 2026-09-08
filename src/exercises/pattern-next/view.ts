import { PatternNextEngine } from './engine';
import { getPatternNextParams } from './manifest';
import { mountStage } from '../stage';

export function renderPatternNext(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new PatternNextEngine();
  const stage = mountStage(container, 'logic');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 5;
  let currentTimer: number;

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const params = getPatternNextParams(level);
    const trial = engine.nextTrial(params);
    const roundStartTime = Date.now();
    stage.setStatus('Какое число дальше?');
    stage.board.innerHTML = `
      <div class="pn-seq" style="display:flex;gap:10px;margin-bottom:36px;flex-wrap:wrap;justify-content:center">
        ${trial.sequence.map(n => `<div class="num-chip pn-item">${n}</div>`).join('')}
        <div class="num-chip missing pn-item">?</div>
      </div>
      <div class="pn-options" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:280px">
        ${trial.options.map((opt, i) => `<button class="pn-btn stroop-btn" data-val="${opt}" data-idx="${i}" style="background:linear-gradient(180deg,var(--surface),var(--surface-2));color:var(--text)">${opt}</button>`).join('')}
      </div>
    `;

    const finishRound = (choice: number | null, rt: number) => {
      clearTimeout(currentTimer);
      const correct = engine.submit(choice, trial.answer);
      if (correct) correctCount++;
      totalRt += rt;
      rounds++;
      stage.pulse(correct);
      const missing = stage.board.querySelector('.pn-item.missing') as HTMLElement;
      if (missing) {
        missing.textContent = choice !== null ? String(choice) : '?';
        missing.classList.remove('missing');
        missing.style.background = correct ? 'linear-gradient(180deg,#34d399,var(--ok))' : 'linear-gradient(180deg,#f87171,var(--danger))';
        missing.style.color = '#fff';
      }
      stage.board.querySelectorAll('.pn-btn').forEach(b => (b as HTMLButtonElement).disabled = true);
      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) finishBlock();
        else startRound();
      }, 480);
    };

    currentTimer = window.setTimeout(() => finishRound(null, params.deadlineMs), params.deadlineMs);
    stage.board.querySelectorAll('.pn-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        finishRound(parseInt((btn as HTMLElement).dataset.val!), Date.now() - roundStartTime);
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
