export class HiveSpanEngine {
  generateSequence(length: number, maxId: number): number[] {
    const seq: number[] = [];
    let last = -1;
    for (let i = 0; i < length; i++) {
      let next;
      do {
        next = Math.floor(Math.random() * maxId);
      } while (next === last);
      seq.push(next);
      last = next;
    }
    return seq;
  }
}
