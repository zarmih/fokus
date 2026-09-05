export class GridMemoryEngine {
  cellsToRemember: number[] = [];
  
  start(params: {grid: number, cells: number}): {cellsToRemember: number[]} {
    const totalCells = params.grid * params.grid;
    const indices: number[] = [];
    while(indices.length < params.cells) {
      const idx = Math.floor(Math.random() * totalCells);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }
    this.cellsToRemember = indices;
    return {cellsToRemember: indices};
  }

  submit(selected: number[]): {correct: number, total: number, accuracy: number} {
    let correctCount = 0;
    for (const sel of selected) {
      if (this.cellsToRemember.includes(sel)) {
        correctCount++;
      }
    }
    // Any click beyond required cells lowers accuracy or counts as miss
    const misses = Math.max(0, selected.length - correctCount);
    const totalRequired = this.cellsToRemember.length;
    
    let accuracy = (correctCount - misses) / totalRequired;
    if (accuracy < 0) accuracy = 0;
    
    return {
      correct: correctCount,
      total: totalRequired,
      accuracy: accuracy
    };
  }
}
