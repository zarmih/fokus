export class EmberLaneEngine {
  public sequence: number[] = [];
  constructor(private length: number, private gridCells: number) {}
  
  generateSequence(): number[] {
    this.sequence = [];
    let last = -1;
    for (let i = 0; i < this.length; i++) {
      let next;
      do {
        next = Math.floor(Math.random() * this.gridCells);
      } while (next === last);
      this.sequence.push(next);
      last = next;
    }
    return this.sequence;
  }
}
