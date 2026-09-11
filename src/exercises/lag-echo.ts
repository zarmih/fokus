import { ExerciseModule, BlockResult } from './contract';

const lagEchoModule: ExerciseModule = {
  manifest: {
    id: 'lag-echo',
    name: 'Эхо с задержкой',
    domain: 'memory',
    skills: ['working_memory', 'spatial_memory'],
    metricModel: 'memory-span' as any,
    instruction: 'Запомните последовательность вспышек. Подождите, пока пройдет задержка, а затем повторите последовательность.'
  },
  render(el, level, onEnd, isTimeUp) {
    el.innerHTML = '';
    
    let rounds = 0;
    let accuracy = 0;
    let avgRtMs = 0;
    let totalAttempts = 0;
    
    const gridSize = level > 5 ? 4 : 3;
    const sequenceLength = Math.min(3 + Math.floor(level / 2), 8);
    const delayMs = Math.min(1000 + level * 500, 4000);
    
    let state: 'showing' | 'delay' | 'input' = 'showing';
    let sequence: number[] = [];
    let userInput: number[] = [];
    let currentIndex = 0;
    let startTime = 0;
    let showTimeout: any;

    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = '100%';
    container.style.gap = '20px';

    const statusText = document.createElement('div');
    statusText.style.fontSize = '1.2rem';
    statusText.style.fontWeight = 'bold';
    statusText.style.minHeight = '30px';
    container.appendChild(statusText);

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    grid.style.gap = '10px';
    
    const cells: HTMLElement[] = [];
    for (let i = 0; i < gridSize * gridSize; i++) {
      const cell = document.createElement('div');
      cell.style.width = '60px';
      cell.style.height = '60px';
      cell.style.backgroundColor = 'var(--surface)';
      cell.style.borderRadius = '8px';
      cell.style.border = '2px solid var(--line)';
      cell.style.cursor = 'pointer';
      cell.style.transition = 'all 0.2s';
      
      cell.onclick = () => handleCellClick(i);
      grid.appendChild(cell);
      cells.push(cell);
    }
    
    container.appendChild(grid);
    el.appendChild(container);

    function startRound() {
      if (isTimeUp()) {
        finish();
        return;
      }
      rounds++;
      sequence = [];
      userInput = [];
      currentIndex = 0;
      
      let prev = -1;
      for (let i = 0; i < sequenceLength; i++) {
        let n = Math.floor(Math.random() * (gridSize * gridSize));
        while (n === prev) {
          n = Math.floor(Math.random() * (gridSize * gridSize));
        }
        sequence.push(n);
        prev = n;
      }
      
      state = 'showing';
      statusText.textContent = 'Запоминайте...';
      cells.forEach(c => c.style.cursor = 'default');
      
      showSequence(0);
    }

    function showSequence(index: number) {
      if (index >= sequence.length) {
        startDelay();
        return;
      }
      
      const cellId = sequence[index];
      cells[cellId].style.backgroundColor = 'var(--primary)';
      
      showTimeout = setTimeout(() => {
        cells[cellId].style.backgroundColor = 'var(--surface)';
        showTimeout = setTimeout(() => {
          showSequence(index + 1);
        }, 200);
      }, 500);
    }

    function startDelay() {
      state = 'delay';
      statusText.textContent = 'Ждите...';
      showTimeout = setTimeout(() => {
        startInput();
      }, delayMs);
    }

    function startInput() {
      state = 'input';
      statusText.textContent = 'Повторите!';
      cells.forEach(c => c.style.cursor = 'pointer');
      startTime = Date.now();
    }

    function handleCellClick(index: number) {
      if (state !== 'input') return;
      
      totalAttempts++;
      const rt = Date.now() - startTime;
      avgRtMs = avgRtMs === 0 ? rt : (avgRtMs + rt) / 2;
      startTime = Date.now();
      
      cells[index].style.backgroundColor = 'var(--primary)';
      setTimeout(() => {
        if (state === 'input') cells[index].style.backgroundColor = 'var(--surface)';
      }, 200);
      
      if (index === sequence[currentIndex]) {
        accuracy++;
        currentIndex++;
        if (currentIndex >= sequence.length) {
          statusText.textContent = 'Верно!';
          state = 'delay';
          setTimeout(startRound, 1000);
        }
      } else {
        statusText.textContent = 'Ошибка!';
        state = 'delay';
        cells[index].style.backgroundColor = 'var(--error)';
        setTimeout(() => {
          cells[index].style.backgroundColor = 'var(--surface)';
          startRound();
        }, 1000);
      }
    }

    startRound();

    function finish() {
      clearTimeout(showTimeout);
      const acc = totalAttempts > 0 ? accuracy / totalAttempts : 0;
      onEnd({
        accuracy: acc,
        avgRtMs,
        rounds
      });
    }

    return finish;
  }
};

export default lagEchoModule;
