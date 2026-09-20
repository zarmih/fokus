export class VaultSpanEngine {
  startRound(params: { sequenceLength: number }): { sequence: number[] } {
    const seq: number[] = [];
    let prev = -1;
    for (let i = 0; i < params.sequenceLength; i++) {
      let next = Math.floor(Math.random() * 9);
      while (next === prev) next = Math.floor(Math.random() * 9);
      seq.push(next);
      prev = next;
    }
    return { sequence: seq };
  }
  submit(userSequence: number[], targetSequence: number[]): { accuracy: number } {
    let correct = 0;
    for (let i = 0; i < targetSequence.length; i++) {
      if (userSequence[i] === targetSequence[i]) correct++;
    }
    return { accuracy: targetSequence.length ? correct / targetSequence.length : 0 };
  }
}
