import { GridMemoryEngine } from './engine';
import { getGridMemoryParams } from './manifest';

export function renderGridMemory(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean = () => false
) {
  const engine = new GridMemoryEngine();
  let rounds = 0;
  let totalAccuracy = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 3;

  const startRound = () => {
    if (isTimeUp()) {
      onBlockEnd({
        accuracy: rounds > 0 ? totalAccuracy / rounds : 0,
        avgRtMs: rounds > 0 ? totalRt / rounds : 0,
        rounds
      });
      return;
    }
    container.innerHTML = '';
    const params = getGridMemoryParams(level);
    const { cellsToRemember } = engine.start(params);
    const totalCells = params.grid * params.grid;

    const gridDiv = document.createElement('div');
    gridDiv.className = 'grid-memory-board';
    gridDiv.style.gridTemplateColumns = `repeat(${params.grid}, 1fr)`;
    
    const cells: HTMLButtonElement[] = [];
    for (let i=0; i<totalCells; i++) {
      const btn = document.createElement('button');
      btn.className = 'grid-cell';
      if (cellsToRemember.includes(i)) {
        btn.classList.add('highlight');
      }
      btn.disabled = true;
      cells.push(btn);
      gridDiv.appendChild(btn);
    }
    container.appendChild(gridDiv);

    setTimeout(() => {
      cells.forEach(btn => {
        btn.classList.remove('highlight');
        btn.disabled = false;
      });
      let selected: number[] = [];
      const roundStartTime = Date.now();
      
      cells.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
          if (btn.classList.contains('selected')) {
            btn.classList.remove('selected');
            selected = selected.filter(s => s !== idx);
          } else {
            btn.classList.add('selected');
            selected.push(idx);
            
            if (selected.length === params.cells) {
              const rt = Date.now() - roundStartTime;
              const { accuracy } = engine.submit(selected);
              totalAccuracy += accuracy;
              totalRt += rt;
              rounds++;
              
              cells.forEach((c, i) => {
                c.disabled = true;
                if (cellsToRemember.includes(i)) c.classList.add('correct');
                else if (selected.includes(i)) c.classList.add('wrong');
              });

              setTimeout(() => {
                const elapsed = Date.now() - blockStartTime;
                if (elapsed >= maxBlockMs && rounds >= minRounds) {
                  onBlockEnd({
                    accuracy: totalAccuracy / rounds,
                    avgRtMs: totalRt / rounds,
                    rounds
                  });
                } else {
                  startRound();
                }
              }, 1000);
            }
          }
        });
      });
    }, params.showMs);
  };
  startRound();
}
