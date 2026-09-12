export class DialFlipEngine {
  targetNumber: number = 0;
  rule: 'direct' | 'opposite' = 'direct';
  correctAnswer: number = 0;

  start(params: {rules: number}): {targetNumber: number, rule: 'direct' | 'opposite'} {
    this.targetNumber = Math.floor(Math.random() * 12) + 1;
    
    if (params.rules === 1) {
      this.rule = 'direct';
    } else {
      this.rule = Math.random() < 0.5 ? 'direct' : 'opposite';
    }

    if (this.rule === 'direct') {
      this.correctAnswer = this.targetNumber;
    } else {
      this.correctAnswer = (this.targetNumber + 6) % 12;
      if (this.correctAnswer === 0) this.correctAnswer = 12;
    }

    return {
      targetNumber: this.targetNumber,
      rule: this.rule
    };
  }

  submit(answer: number, timeMs: number): {accuracy: number, rt: number} {
    return {
      accuracy: answer === this.correctAnswer ? 1 : 0,
      rt: timeMs
    };
  }
}
