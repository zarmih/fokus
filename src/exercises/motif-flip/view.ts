import { MotifFlipEngine, Motif } from './engine';
import { getMotifFlipParams } from './manifest';
import { mountStage } from '../stage';
import { BlockResult } from '../contract';

export function renderMotifFlip(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: BlockResult) => void,
  isTimeUp: () => boolean = () => false
) {
  const engine = new MotifFlipEngine();
  const stage = mountStage(container, 'flexibility');
  let rounds = 0;
  let correctRounds = 0;
  let totalRt = 0;
  let roundStartTime = 0;
  
  engine.start();

  stage.board.innerHTML = `
    <style>
      .mf-rule {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 24px;
        text-align: center;
        text-transform: uppercase;
        color: var(--accent);
      }
      .mf-target {
        display: flex;
        justify-content: center;
        margin-bottom: 40px;
      }
      .mf-options {
        display: flex;
        justify-content: center;
        gap: 32px;
      }
      .mf-card {
        width: 100px;
        height: 100px;
        background: var(--surface);
        border: 2px solid var(--border);
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
      }
      .mf-card:hover {
        border-color: var(--accent);
        transform: scale(1.05);
      }
      .mf-card.target {
        cursor: default;
        border-color: var(--primary);
      }
      .mf-card.target:hover {
        transform: none;
      }
      .mf-shape {
        width: 60px;
        height: 60px;
      }
      /* Simple CSS shapes */
      .mf-shape.circle { border-radius: 50%; }
      .mf-shape.square { border-radius: 8px; }
      .mf-shape.triangle {
        width: 0; height: 0;
        border-left: 30px solid transparent;
        border-right: 30px solid transparent;
        border-bottom: 60px solid;
        background: none !important;
      }
      .mf-shape.star {
        background: currentColor;
        clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
      }
    </style>
    <div class="mf-rule" id="mf-rule"></div>
    <div class="mf-target" id="mf-target-container"></div>
    <div class="mf-options" id="mf-opts-container"></div>
  `;

  const ruleEl = stage.board.querySelector('#mf-rule') as HTMLElement;
  const targetContainer = stage.board.querySelector('#mf-target-container') as HTMLElement;
  const optsContainer = stage.board.querySelector('#mf-opts-container') as HTMLElement;

  const colorMap: Record<string, string> = {
    red: '#ff4444', blue: '#33b5e5', green: '#00C851', yellow: '#ffbb33'
  };
  
  const ruleMap: Record<string, string> = { color: 'ЦВЕТ', shape: 'ФОРМА' };

  const renderCard = (m: Motif, isTarget = false) => {
    const card = document.createElement('div');
    card.className = `mf-card ${isTarget ? 'target' : ''}`;
    
    const shape = document.createElement('div');
    shape.className = `mf-shape ${m.shape}`;
    if (m.shape === 'triangle') {
      shape.style.borderBottomColor = colorMap[m.color];
    } else {
      shape.style.backgroundColor = colorMap[m.color];
      shape.style.color = colorMap[m.color];
    }
    card.appendChild(shape);
    return card;
  };

  let currentCorrectIndex = -1;
  let isWaiting = false;

  const nextRound = () => {
    if (isTimeUp()) {
      finish();
      return;
    }
    isWaiting = false;
    const params = getMotifFlipParams(level);
    const { rule, target, options, correctIndex } = engine.generateRound(params.switchProbability);
    currentCorrectIndex = correctIndex;

    ruleEl.textContent = ruleMap[rule];
    targetContainer.innerHTML = '';
    targetContainer.appendChild(renderCard(target, true));

    optsContainer.innerHTML = '';
    options.forEach((opt, idx) => {
      const btn = renderCard(opt);
      btn.addEventListener('click', () => {
        if (isWaiting) return;
        isWaiting = true;
        
        const rt = Date.now() - roundStartTime;
        const correct = idx === currentCorrectIndex;
        
        if (correct) correctRounds++;
        totalRt += rt;
        rounds++;
        
        stage.pulse(correct);
        
        window.setTimeout(nextRound, 300);
      });
      optsContainer.appendChild(btn);
    });

    roundStartTime = Date.now();
  };

  nextRound();

  const finish = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctRounds / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  return () => {
    stage.cleanup();
  };
}
