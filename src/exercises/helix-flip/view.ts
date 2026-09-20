import { HelixFlipEngine, HelixTrial, Shape, Color } from './engine';
import { getHelixFlipParams } from './manifest';
import { mountStage } from '../stage';

const COLOR_MAP: Record<Color, string> = {
  'Красный': '#ef4444',
  'Синий': '#3b82f6',
  'Зеленый': '#10b981'
};

const SHAPE_SVG: Record<Shape, string> = {
  'Квадрат': '<rect x="15" y="15" width="70" height="70" rx="12" fill="currentColor"/>',
  'Круг': '<circle cx="50" cy="50" r="40" fill="currentColor"/>',
  'Треугольник': '<polygon points="50,10 90,85 10,85" fill="currentColor"/>'
};

export function renderHelixFlip(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const params = getHelixFlipParams(level);
  const engine = new HelixFlipEngine();
  const stage = mountStage(container, 'flexibility');
  
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  
  let currentRule: 'Форма' | 'Цвет' = 'Форма';
  let currentTrial: HelixTrial;
  let roundStartTime = 0;
  let onKey: ((e: KeyboardEvent) => void) | null = null;
  let hasAnswered = false;
  let currentTimer: number = 0;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }
    
    currentTrial = engine.generateTrial(params.switchChance, currentRule);
    currentRule = currentTrial.rule;
    hasAnswered = false;
    
    stage.setStatus(`Совпадают по правилу: ${currentRule.toUpperCase()}`);
    
    stage.board.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; gap: 40px; margin-bottom: 40px; margin-top: 20px;">
        <div class="glyph-3d" style="color: ${COLOR_MAP[currentTrial.leftColor]}; width: 100px; height: 100px;">
          <svg viewBox="0 0 100 100">${SHAPE_SVG[currentTrial.leftShape]}</svg>
        </div>
        <div class="glyph-3d" style="color: ${COLOR_MAP[currentTrial.rightColor]}; width: 100px; height: 100px;">
          <svg viewBox="0 0 100 100">${SHAPE_SVG[currentTrial.rightShape]}</svg>
        </div>
      </div>
      <div class="play-choice">
        <button id="btn-no" class="btn-secondary">Нет ←</button>
        <button id="btn-yes" class="btn-secondary">Да →</button>
      </div>
    `;

    const btnNo = stage.board.querySelector('#btn-no') as HTMLButtonElement;
    const btnYes = stage.board.querySelector('#btn-yes') as HTMLButtonElement;

    const submit = (userSaysYes: boolean) => {
      if (hasAnswered) return;
      hasAnswered = true;
      if (onKey) document.removeEventListener('keydown', onKey);
      clearTimeout(currentTimer);
      
      const correct = userSaysYes === currentTrial.isMatch;
      if (correct) {
        correctCount++;
        totalRt += (Date.now() - roundStartTime);
      } else {
        totalRt += 3000;
      }
      rounds++;
      stage.pulse(correct);
      
      (userSaysYes ? btnYes : btnNo).classList.add(correct ? 'btn-primary' : 'btn-secondary');
      if (!correct) (userSaysYes ? btnYes : btnNo).style.background = '#ef4444';
      
      btnYes.disabled = true;
      btnNo.disabled = true;
      setTimeout(startRound, 400);
    };

    btnNo.addEventListener('click', () => submit(false));
    btnYes.addEventListener('click', () => submit(true));

    onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') submit(false);
      else if (e.key === 'ArrowRight') submit(true);
    };
    document.addEventListener('keydown', onKey);

    roundStartTime = Date.now();
  };

  const finishBlock = () => {
    if (onKey) document.removeEventListener('keydown', onKey);
    clearTimeout(currentTimer);
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  
  return () => {
    if (onKey) document.removeEventListener('keydown', onKey);
    clearTimeout(currentTimer);
    stage.cleanup();
  };
}
