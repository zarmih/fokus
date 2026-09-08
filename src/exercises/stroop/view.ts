import { StroopEngine, COLORS } from './engine';
import { getStroopParams } from './manifest';
import { mountStage } from '../stage';

export function renderStroop(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new StroopEngine();
  const stage = mountStage(container, 'attention');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 8;
  let currentTimer: number;
  let onKey: ((e: KeyboardEvent) => void) | null = null;

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const params = getStroopParams(level);
    const trial = engine.nextTrial(params);
    const roundStartTime = Date.now();
    const ink = COLORS.find(c => c.id === trial.ink)!;
    const word = COLORS.find(c => c.id === trial.word)!;
    stage.setStatus('Цвет чернил, не слово');
    stage.board.innerHTML = `
      <div class="stroop-board">
        <div class="stroop-word" style="color:${ink.hex}">${word.word}</div>
        <div class="stroop-options" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%;max-width:360px;">
          ${trial.options.map(opt => {
            const c = COLORS.find(x => x.id === opt)!;
            return `<button class="stroop-btn" data-color="${opt}" style="background:${c.hex}">${c.word}</button>`;
          }).join('')}
        </div>
      </div>
    `;

    const finishRound = (choice: any, rt: number) => {
      clearTimeout(currentTimer);
      if (onKey) document.removeEventListener('keydown', onKey);
      const correct = engine.submit(choice, trial.ink);
      if (correct) correctCount++;
      totalRt += rt;
      rounds++;
      stage.pulse(correct);
      const wordEl = stage.board.querySelector('.stroop-word') as HTMLElement;
      if (wordEl) {
        wordEl.style.color = correct ? '#10b981' : '#ef4444';
        wordEl.textContent = correct ? 'Верно' : 'Мимо';
      }
      stage.board.querySelectorAll('.stroop-btn').forEach(b => (b as HTMLButtonElement).disabled = true);
      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) finishBlock();
        else startRound();
      }, 420);
    };

    currentTimer = window.setTimeout(() => finishRound(null, params.deadlineMs), params.deadlineMs);
    const btns = stage.board.querySelectorAll('.stroop-btn');
    const click = (btn: HTMLElement) => {
      if ((btn as HTMLButtonElement).disabled) return;
      finishRound(btn.dataset.color, Date.now() - roundStartTime);
    };
    btns.forEach(btn => btn.addEventListener('click', () => click(btn as HTMLElement)));
    onKey = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (idx < btns.length) click(btns[idx] as HTMLElement);
      }
    };
    document.addEventListener('keydown', onKey);
  };

  const finishBlock = () => {
    if (onKey) document.removeEventListener('keydown', onKey);
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => {
    clearTimeout(currentTimer);
    if (onKey) document.removeEventListener('keydown', onKey);
    stage.cleanup();
  };
}
