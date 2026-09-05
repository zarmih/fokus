import { SequenceEngine } from './engine';
import { getSequenceParams } from './manifest';

export function renderSequence(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new SequenceEngine();
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
    const params = getSequenceParams(level);
    const { sequence } = engine.start(params);
    const totalCells = params.grid * params.grid;

    const gridDiv = document.createElement('div');
    gridDiv.className = 'grid-memory-board';
    gridDiv.style.gridTemplateColumns = `repeat(${params.grid}, 1fr)`;
    
    const cells: HTMLButtonElement[] = [];
    for (let i=0; i<totalCells; i++) {
      const btn = document.createElement('button');
      btn.className = 'grid-cell';
      btn.disabled = true;
      cells.push(btn);
      gridDiv.appendChild(btn);
    }
    container.appendChild(gridDiv);

    let step = 0;
    const playNext = () => {
      if (step >= sequence.length) {
        let selected: number[] = [];
        const roundStartTime = Date.now();
        
        cells.forEach((btn, idx) => {
          btn.disabled = false;
          btn.addEventListener('click', () => {
            btn.classList.add('selected');
            setTimeout(() => btn.classList.remove('selected'), 150);
            
            selected.push(idx);
            
            if (selected[selected.length - 1] !== sequence[selected.length - 1]) {
              finishRound(selected, roundStartTime);
            } else if (selected.length === sequence.length) {
              finishRound(selected, roundStartTime);
            }
          });
        });
        return;
      }

      const idx = sequence[step];
      cells[idx].classList.add('highlight');
      setTimeout(() => {
        cells[idx].classList.remove('highlight');
        setTimeout(() => {
          step++;
          playNext();
        }, params.gapMs);
      }, params.flashMs);
    };

    const finishRound = (selected: number[], roundStartTime: number) => {
      cells.forEach(c => c.disabled = true);
      const rt = Date.now() - roundStartTime;
      const { accuracy } = engine.submit(selected);
      totalAccuracy += accuracy;
      totalRt += rt;
      rounds++;

      cells.forEach((c, i) => {
        if (selected[i] !== undefined) {
          if (selected[i] === sequence[i]) {
            cells[selected[i]].classList.add('correct');
          } else {
            cells[selected[i]].classList.add('wrong');
          }
        }
      });
      for(let i=selected.length; i<sequence.length; i++) {
        cells[sequence[i]].classList.add('highlight');
      }

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
    };

    setTimeout(playNext, 500); 
  };
  startRound();
}
