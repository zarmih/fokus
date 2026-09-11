import { BlockResult } from '../contract';
import { HiveSpanEngine } from './engine';
import { hiveSpanManifest } from './manifest';

export function renderHiveSpan(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
  const engine = new HiveSpanEngine();
  const lvl = Math.max(1, Math.min(5, Math.floor(level)));
  const params = hiveSpanManifest.levels![lvl as keyof typeof hiveSpanManifest.levels];
  
  let rounds = 0;
  let correct = 0;
  let isGameOver = false;
  let sequence: number[] = [];
  let userIndex = 0;

  el.innerHTML = `
    <style>
      .hive-arena {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 20px;
      }
      .hive-grid {
        display: grid;
        gap: 10px;
      }
      .hive-cell {
        width: 60px;
        height: 60px;
        background: var(--surface);
        border: 2px solid var(--line);
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.2s, transform 0.1s;
      }
      .hive-cell:active { transform: scale(0.95); }
      .hive-cell.active { background: var(--primary); border-color: var(--primary); }
      .hive-cell.error { background: var(--danger); border-color: var(--danger); }
      .hive-cell.disabled { pointer-events: none; }
    </style>
    <div class="hive-arena">
      <div class="hive-grid" id="hive-grid"></div>
    </div>
  `;

  const grid = el.querySelector('#hive-grid') as HTMLElement;
  const cols = Math.ceil(Math.sqrt(params.gridSize));
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  const cells: HTMLElement[] = [];
  for (let i = 0; i < params.gridSize; i++) {
    const cell = document.createElement('div');
    cell.className = 'hive-cell disabled';
    cell.dataset.id = i.toString();
    grid.appendChild(cell);
    cells.push(cell);
  }

  const endBlock = () => {
    isGameOver = true;
    onEnd({ accuracy: rounds > 0 ? correct / rounds : 0, avgRtMs: 0, rounds });
  };

  const playSequence = async () => {
    if (isGameOver) return;
    if (isTimeUp()) {
      endBlock();
      return;
    }
    
    cells.forEach(c => c.className = 'hive-cell disabled');
    sequence = engine.generateSequence(params.spanLength, params.gridSize);
    userIndex = 0;
    
    await new Promise(r => setTimeout(r, 1000));
    
    for (let i = 0; i < sequence.length; i++) {
      if (isGameOver) return;
      const c = cells[sequence[i]];
      c.classList.add('active');
      await new Promise(r => setTimeout(r, params.showMs));
      c.classList.remove('active');
      await new Promise(r => setTimeout(r, 200));
    }
    
    if (isGameOver) return;
    cells.forEach(c => c.className = 'hive-cell');
  };

  cells.forEach(c => {
    c.onclick = () => {
      if (c.classList.contains('disabled')) return;
      const id = parseInt(c.dataset.id!);
      
      if (id === sequence[userIndex]) {
        c.classList.add('active');
        setTimeout(() => c.classList.remove('active'), 200);
        userIndex++;
        if (userIndex === sequence.length) {
          correct++;
          rounds++;
          setTimeout(playSequence, 500);
        }
      } else {
        c.classList.add('error');
        setTimeout(() => c.classList.remove('error'), 400);
        rounds++;
        setTimeout(playSequence, 1000);
      }
    };
  });

  playSequence();

  return () => {
    isGameOver = true;
  };
}
