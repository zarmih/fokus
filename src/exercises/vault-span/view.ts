import { VaultSpanEngine, Color } from './engine';
import { getVaultSpanParams } from './manifest';
import { mountStage, tile3d } from '../stage';

const COLOR_MAP: Record<Color, string> = {
  'Красный': '#ef4444',
  'Синий': '#3b82f6',
  'Зеленый': '#10b981',
  'Желтый': '#eab308'
};

export function renderVaultSpan(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new VaultSpanEngine();
  const stage = mountStage(container, 'logic');
  
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  
  let solution: Color[] = [];
  let userAnswers: Color[] = [];
  let roundStartTime = 0;

  const renderPuzzle = (clues: string[], availableColors: Color[]) => {
    stage.setStatus('Взломай сейф');
    
    // Slots for answers
    const slotsHtml = solution.map((_, i) => {
      const color = userAnswers[i];
      const bg = color ? COLOR_MAP[color] : 'transparent';
      const border = color ? 'none' : '2px dashed #475569';
      return `<div style="width: 50px; height: 50px; border-radius: 50%; background: ${bg}; border: ${border}; display: inline-block; margin: 0 5px;"></div>`;
    }).join('');

    // Available buttons
    const buttonsHtml = availableColors.map(color => {
      const isUsed = userAnswers.includes(color);
      return `<button id="btn-${color}" class="btn-secondary" style="margin: 5px; opacity: ${isUsed ? 0.3 : 1}" ${isUsed ? 'disabled' : ''}>
        ${tile3d('', `<div style="width:20px;height:20px;border-radius:50%;background:${COLOR_MAP[color]};display:inline-block;vertical-align:middle;margin-right:8px;"></div>${color}`)}
      </button>`;
    }).join('');

    const cluesHtml = clues.map(c => `<div style="padding: 8px; margin: 4px 0; background: #1e293b; border-radius: 8px; font-size: 16px;">${c}</div>`).join('');

    stage.board.innerHTML = `
      <div style="text-align: center;">
        <div style="margin-bottom: 24px; min-height: 54px;">
          ${slotsHtml}
        </div>
        <div style="margin-bottom: 30px; text-align: left; display: inline-block;">
          ${cluesHtml}
        </div>
        <div>
          ${buttonsHtml}
        </div>
        <div style="margin-top: 16px;">
          <button id="btn-reset" class="btn-ghost" style="color: #94a3b8; font-size: 14px;">Сброс</button>
        </div>
      </div>
    `;

    availableColors.forEach(color => {
      const btn = stage.board.querySelector(`#btn-${color}`) as HTMLButtonElement;
      if (btn) {
        btn.addEventListener('click', () => {
          if (userAnswers.length < solution.length) {
            userAnswers.push(color);
            checkAnswer();
          }
        });
      }
    });

    const resetBtn = stage.board.querySelector('#btn-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        userAnswers = [];
        renderPuzzle(clues, availableColors);
      });
    }
  };

  const checkAnswer = () => {
    // Re-render to show updated slots and disabled buttons
    const { clues } = currentPuzzle;
    const availableColors = [...solution].sort((a, b) => a.localeCompare(b));
    renderPuzzle(clues, availableColors);

    if (userAnswers.length === solution.length) {
      const isCorrect = userAnswers.every((ans, i) => ans === solution[i]);
      if (isCorrect) {
        correctCount++;
        totalRt += (Date.now() - roundStartTime);
        stage.pulse(true);
      } else {
        totalRt += 5000; // penalty
        stage.pulse(false);
      }
      rounds++;
      setTimeout(startRound, 1000);
    }
  };

  let currentPuzzle: { solution: Color[], clues: string[] };

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }
    userAnswers = [];
    currentPuzzle = engine.generatePuzzle(level);
    solution = currentPuzzle.solution;
    const availableColors = [...solution].sort((a, b) => a.localeCompare(b));
    
    roundStartTime = Date.now();
    renderPuzzle(currentPuzzle.clues, availableColors);
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
  
  return () => {
    stage.cleanup();
  };
}
