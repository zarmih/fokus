export class LatticeSpanEngine {
  sequence: number[] = [];
  
  start(params: {grid: number, sequenceLength: number}): {sequence: number[]} {
    const totalCells = params.grid * params.grid;
    this.sequence = [];
    let last = -1;
    for (let i = 0; i < params.sequenceLength; i++) {
      let next = Math.floor(Math.random() * totalCells);
      // avoid immediate repeat
      if (next === last && totalCells > 1) {
        next = (next + 1) % totalCells;
      }
      this.sequence.push(next);
      last = next;
    }
    return { sequence: this.sequence };
  }

  submit(userSequence: number[]): {accuracy: number} {
    if (userSequence.length === 0 && this.sequence.length > 0) {
      return { accuracy: 0 };
    }
    let correct = 0;
    const len = Math.max(this.sequence.length, userSequence.length);
    for (let i = 0; i < len; i++) {
      if (this.sequence[i] === userSequence[i]) {
        correct++;
      }
    }
    return { accuracy: correct / this.sequence.length };
  }
}
