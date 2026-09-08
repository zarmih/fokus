import { NBackEngine, VisualSymbol } from './engine';
import { getNBackParams } from './manifest';
import { mountStage } from '../stage';

const SVGS: Record<VisualSymbol, string> = {
  square: '<rect x="18" y="18" width="64" height="64" rx="10" fill="currentColor"/>',
  circle: '<circle cx="50" cy="50" r="32" fill="currentColor"/>',
  triangle: '<polygon points="50,16 84,82 16,82" fill="currentColor"/>',
  star: '<polygon points="50,12 61,38 88,42 68,60 74,86 50,72 26,86 32,60 12,42 39,38" fill="currentColor"/>',
  cross: '<polygon points="38,16 62,16 62,38 84,38 84,62 62,62 62,84 38,84 38,62 16,62 16,38 38,38" fill="currentColor"/>',
  hexagon: '<polygon points="50,12 84,31 84,69 50,88 16,69 16,31" fill="currentColor"/>'
};

export function renderNBack(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const params = getNBackParams(level);
  const engine = new NBackEngine(params.n);
  const stage = mountStage(container, 'memory');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  let currentTimer: number;
  let hasAnswered = false;
  let userVisual = false;
  let userAudio = false;
  let onKey: ((e: KeyboardEvent) => void) | null = null;

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ru-RU';
      u.rate = 1.2;
      window.speechSynthesis.speak(u);
    }
  };

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const trial = engine.nextTrial(params.matchChance);
    const roundStartTime = Date.now();
    hasAnswered = false;
    userVisual = false;
    userAudio = false;
    speak(trial.audio);
    stage.setStatus(`N = ${params.n} · фигура или звук`);
    stage.board.innerHTML = `
      <div class="glyph-3d nback-symbol" style="color:#f8fafc">
        <svg viewBox="0 0 100 100">${SVGS[trial.visual]}</svg>
      </div>
      <div class="play-choice" style="margin-top:28px">
        <button id="btn-visual" class="btn-secondary nback-btn">Фигура ←</button>
        <button id="btn-audio" class="btn-secondary nback-btn">Звук →</button>
      </div>
    `;
    const btnVisual = stage.board.querySelector('#btn-visual') as HTMLButtonElement;
    const btnAudio = stage.board.querySelector('#btn-audio') as HTMLButtonElement;

    const evaluateRound = () => {
      hasAnswered = true;
      clearTimeout(currentTimer);
      if (onKey) document.removeEventListener('keydown', onKey);
      const correct = engine.submit(trial.isVisualMatch, trial.isAudioMatch, userVisual, userAudio);
      if (correct) { correctCount++; totalRt += Date.now() - roundStartTime; }
      else totalRt += params.delayMs;
      rounds++;
      stage.pulse(correct);
      const symbolEl = stage.board.querySelector('.nback-symbol') as HTMLElement;
      if (symbolEl) symbolEl.style.color = correct ? '#10b981' : '#ef4444';
      btnVisual.disabled = true;
      btnAudio.disabled = true;
      setTimeout(startRound, 420);
    };

    currentTimer = window.setTimeout(() => { if (!hasAnswered) evaluateRound(); }, params.delayMs);
    onKey = (e: KeyboardEvent) => {
      if (hasAnswered) return;
      if (e.key === 'ArrowLeft') { userVisual = !userVisual; btnVisual.classList.toggle('btn-primary', userVisual); }
      else if (e.key === 'ArrowRight') { userAudio = !userAudio; btnAudio.classList.toggle('btn-primary', userAudio); }
    };
    document.addEventListener('keydown', onKey);
    btnVisual.addEventListener('click', () => {
      if (hasAnswered) return;
      userVisual = !userVisual;
      btnVisual.classList.toggle('btn-primary', userVisual);
      btnVisual.classList.toggle('btn-secondary', !userVisual);
    });
    btnAudio.addEventListener('click', () => {
      if (hasAnswered) return;
      userAudio = !userAudio;
      btnAudio.classList.toggle('btn-primary', userAudio);
      btnAudio.classList.toggle('btn-secondary', !userAudio);
    });
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
