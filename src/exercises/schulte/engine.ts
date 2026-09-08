export class SchulteEngine {
  private current: number = 1;
  private max: number;
  private grid: number[];

  constructor(size: number) {
    this.max = size * size;
    this.grid = Array.from({length: this.max}, (_, i) => i + 1);
    this.shuffle(this.grid);
  }

  getGrid() { return this.grid; }
  getExpected() { return this.current; }
  isDone() { return this.current > this.max; }

  submit(val: number): boolean {
    if (val === this.current) {
      this.current++;
      return true;
    }
    return false;
  }

  private shuffle(array: number[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
  }
}
