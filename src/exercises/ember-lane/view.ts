import { EmberLaneEngine } from './engine';
import { getEmberLaneParams } from './manifest';
import { mountStage, tile3d } from '../stage';

export function renderEmberLane(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const params = getEmberLaneParams(level);
  const GRID_SIZE = 12;
  const engine = new EmberLaneEngine(params.span, GRID_SIZE);
  const stage = mountStage(container, 'memory');
  
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  
  let sequence: number[] = [];
  let userIndex = 0;
  let roundStartTime = 0;
  let isShowingSequence = false;
  let currentTimer: number = 0;
  let inputEnabled = false;

  const renderGrid = () => {
    stage.board.innerHTML = `
      <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; max-width: 340px; margin: 0 auto; width: 100%;">
        ${Array.from({length: GRID_SIZE}).map((_, i) => `
          <button id="ember-${i}" class="btn-secondary" style="height: 70px; padding: 0; position: relative; border-radius: 12px; overflow: hidden; background: #1e293b; border: 2px solid #334155;">
            ${tile3d('', `<div class="ember-core" style="width:100%;height:100%;border-radius:10px;transition:background 0.2s, box-shadow 0.2s"></div>`)}
          </button>
        `).join('')}
      </div>
    `;

    for (let i = 0; i < GRID_SIZE; i++) {
      const btn = stage.board.querySelector(`#ember-${i}`) as HTMLButtonElement;
      btn.addEventListener('click', () => handleCellClick(i));
    }
  };

  const showSequence = async () => {
    isShowingSequence = true;
    inputEnabled = false;
    stage.setStatus(`Запоминай! (${params.span})`);
    sequence = engine.generateSequence();
    userIndex = 0;
    
    await new Promise(r => { currentTimer = window.setTimeout(r, 600); });
    
    for (let i = 0; i < sequence.length; i++) {
      if (!isShowingSequence) return;
      const cellId = sequence[i];
      const cell = stage.board.querySelector(`#ember-${cellId} .ember-core`) as HTMLElement;
      if (cell) {
        cell.style.background = '#f59e0b'; // ember color
        cell.style.boxShadow = '0 0 20px #f59e0b';
      }
      await new Promise(r => { currentTimer = window.setTimeout(r, Math.max(200, params.delayMs - 150)); });
      
      if (cell) {
        cell.style.background = 'transparent';
        cell.style.boxShadow = 'none';
      }
      await new Promise(r => { currentTimer = window.setTimeout(r, 150); });
    }
    
    if (!isShowingSequence) return;
    isShowingSequence = false;
    inputEnabled = true;
    stage.setStatus(`Повтори!`);
    roundStartTime = Date.now();
  };

  const handleCellClick = (cellIndex: number) => {
    if (!inputEnabled) return;
    
    const isCorrect = sequence[userIndex] === cellIndex;
    const cell = stage.board.querySelector(`#ember-${cellIndex} .ember-core`) as HTMLElement;
    
    if (isCorrect) {
      if (cell) {
        cell.style.background = '#10b981';
        cell.style.boxShadow = '0 0 15px #10b981';
        setTimeout(() => {
          if (cell) {
            cell.style.background = 'transparent';
            cell.style.boxShadow = 'none';
          }
        }, 300);
      }
      userIndex++;
      
      if (userIndex === sequence.length) {
        inputEnabled = false;
        correctCount++;
        totalRt += (Date.now() - roundStartTime);
        rounds++;
        stage.pulse(true);
        setTimeout(startRound, 600);
      }
    } else {
      if (cell) {
        cell.style.background = '#ef4444';
        cell.style.boxShadow = '0 0 15px #ef4444';
      }
      inputEnabled = false;
      totalRt += params.delayMs * sequence.length; // penalty
      rounds++;
      stage.pulse(false);
      setTimeout(startRound, 800);
    }
  };

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }
    renderGrid();
    showSequence();
  };

  const finishBlock = () => {
    isShowingSequence = false;
    inputEnabled = false;
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
    isShowingSequence = false;
    inputEnabled = false;
    clearTimeout(currentTimer);
    stage.cleanup();
  };
}
