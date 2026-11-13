import { L } from '../../core/i18n';
import { HelixFlipEngine, HelixTrial, Shape, Color } from './engine';
import { getHelixFlipParams } from './manifest';
import { mountStage } from '../stage';
import { getExerciseMode, HELIX_FILL, type FillStyle } from '../lib/exercise-mode';

/** Shape drawn with a fill style instead of a colour (accessible mode). */
function shapeWithFill(shape: Shape, fill: FillStyle, uid: string): string {
  const base = SHAPE_SVG[shape];
  if (fill === 'solid') return base;
  if (fill === 'outline') return base.replace('fill="currentColor"', 'fill="none" stroke="currentColor" stroke-width="8"');
  return `<defs><pattern id="hx-stripe-${uid}" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="12" fill="currentColor"/></pattern></defs>` +
    base.replace('fill="currentColor"', `fill="url(#hx-stripe-${uid})" stroke="currentColor" stroke-width="4"`);
}

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
    
    const accessible = getExerciseMode() === 'accessible';
    stage.board.dataset.mode = accessible ? 'accessible' : 'standard';
    const ruleRu = currentRule === 'Форма' ? 'ФОРМА' : accessible ? 'ЗАЛИВКА' : 'ЦВЕТ';
    const ruleEn = currentRule === 'Форма' ? 'SHAPE' : accessible ? 'FILL' : 'COLOUR';
    stage.setStatus(L(`Совпадают по правилу: ${ruleRu}`, `Match by rule: ${ruleEn}`));
    const glyph = (shape: Shape, color: Color, side: string) => accessible
      ? `<div class="glyph-3d" data-shape="${shape}" data-fill="${HELIX_FILL[color]}" style="color: var(--text); width: 100px; height: 100px;"><svg viewBox="0 0 100 100" aria-hidden="true">${shapeWithFill(shape, HELIX_FILL[color], side + rounds)}</svg></div>`
      : `<div class="glyph-3d" style="color: ${COLOR_MAP[color]}; width: 100px; height: 100px;"><svg viewBox="0 0 100 100">${SHAPE_SVG[shape]}</svg></div>`;

    stage.board.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; gap: 40px; margin-bottom: 40px; margin-top: 20px;">
        ${glyph(currentTrial.leftShape, currentTrial.leftColor, 'l')}
        ${glyph(currentTrial.rightShape, currentTrial.rightColor, 'r')}
      </div>
      <div class="play-choice">
        <button id="btn-no" class="btn-secondary">${L('Нет', 'No')} ←</button>
        <button id="btn-yes" class="btn-secondary">${L('Да', 'Yes')} →</button>
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
