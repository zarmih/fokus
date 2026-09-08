export class CorsiEngine {
  private sequence: number[] = [];
  private userIndex: number = 0;
  
  constructor(span: number, blocksCount: number) {
    let last = -1;
    for (let i = 0; i < span; i++) {
      let next;
      do {
        next = Math.floor(Math.random() * blocksCount);
      } while (next === last);
      this.sequence.push(next);
      last = next;
    }
  }

  getSequence() { return this.sequence; }

  submit(blockIndex: number): { correct: boolean, isDone: boolean } {
    if (this.sequence[this.userIndex] === blockIndex) {
      this.userIndex++;
      return { correct: true, isDone: this.userIndex >= this.sequence.length };
    }
    return { correct: false, isDone: true };
  }
}
