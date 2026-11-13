import { L } from '../../core/i18n';

const EN_WORD: Record<string, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow' };
/** Colour words follow the UI language (the Stroop conflict needs the reader's language). */
const colorWord = (c: { id: string; word: string }) => L(c.word, EN_WORD[c.id] || c.word);
import { StroopEngine, COLORS } from './engine';
import { getStroopParams } from './manifest';
import { mountStage } from '../stage';
import { getExerciseMode, STROOP_DIRECTION, DIRECTION_WORD, DIRECTION_ROTATION } from '../lib/exercise-mode';

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

  // Set by teardown: a pending inter-round delay must not start an orphan round after the block ends.
  let disposed = false;
  const startRound = () => {
    if (disposed) return;
    if (isTimeUp()) { finishBlock(); return; }
    const params = getStroopParams(level);
    const trial = engine.nextTrial(params);
    const roundStartTime = Date.now();
    const ink = COLORS.find(c => c.id === trial.ink)!;
    const word = COLORS.find(c => c.id === trial.word)!;
    const accessible = getExerciseMode() === 'accessible';
    stage.board.dataset.mode = accessible ? 'accessible' : 'standard';
    if (accessible) {
      const inkDir = STROOP_DIRECTION[trial.ink];
      const wordDir = STROOP_DIRECTION[trial.word];
      const dirWord = (d: keyof typeof DIRECTION_WORD) => L(DIRECTION_WORD[d][0], DIRECTION_WORD[d][1]);
      stage.setStatus(L('Куда указывает стрелка, не слово', 'Where the arrow points, not the word'));
      stage.board.innerHTML = `
      <div class="stroop-board">
        <div class="stroop-word stroop-arrow" data-dir="${inkDir}" style="display:flex;align-items:center;justify-content:center;gap:8px;font-weight:800;">
          <svg width="72" height="72" viewBox="0 0 100 100" aria-hidden="true" style="transform:rotate(${DIRECTION_ROTATION[inkDir]}deg)"><polygon points="10,35 60,35 60,15 95,50 60,85 60,65 10,65" fill="currentColor"/></svg>
          <span>${dirWord(wordDir)}</span>
        </div>
        <div class="stroop-options" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%;max-width:360px;">
          ${trial.options.map(opt => {
            const d = STROOP_DIRECTION[opt];
            return `<button class="stroop-btn btn-secondary" data-color="${opt}" data-dir="${d}" aria-label="${dirWord(d)}"><span aria-hidden="true" style="display:inline-block;transform:rotate(${DIRECTION_ROTATION[d]}deg)">➜</span> ${dirWord(d)}</button>`;
          }).join('')}
        </div>
      </div>
    `;
    } else {
    stage.setStatus(L('Цвет чернил, не слово', 'Ink colour, not the word'));
    stage.board.innerHTML = `
      <div class="stroop-board">
        <div class="stroop-word" style="color:${ink.hex}">${colorWord(word)}</div>
        <div class="stroop-options" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%;max-width:360px;">
          ${trial.options.map(opt => {
            const c = COLORS.find(x => x.id === opt)!;
            return `<button class="stroop-btn" data-color="${opt}" style="background:${c.hex}">${colorWord(c)}</button>`;
          }).join('')}
        </div>
      </div>
    `;
    }

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
        wordEl.textContent = correct ? L('Верно', 'Correct') : L('Мимо', 'Miss');
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
    if (disposed) return;
    if (onKey) document.removeEventListener('keydown', onKey);
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => { disposed = true;
    clearTimeout(currentTimer);
    if (onKey) document.removeEventListener('keydown', onKey);
    stage.cleanup();
  };
}
