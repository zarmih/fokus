export class SequenceEngine {
  sequence: number[] = [];
  
  start(params: {grid: number, length: number}): {sequence: number[]} {
    const totalCells = params.grid * params.grid;
    const seq: number[] = [];
    for(let i=0; i<params.length; i++) {
      seq.push(Math.floor(Math.random() * totalCells));
    }
    this.sequence = seq;
    return {sequence: seq};
  }

  submit(selected: number[]): {correct: number, total: number, accuracy: number} {
    let correctCount = 0;
    for (let i=0; i<selected.length; i++) {
      if (selected[i] === this.sequence[i]) {
        correctCount++;
      } else {
        break; // Stop counting at first mistake
      }
    }
    const totalRequired = this.sequence.length;
    let accuracy = correctCount / totalRequired;
    return {
      correct: correctCount,
      total: totalRequired,
      accuracy: accuracy
    };
  }
}
