export class MentalRotationEngine {
  private trials: number;
  private maxAngle: number;
  private currentTrial = 0;
  private results: {isMatch: boolean, correct: boolean, rt: number}[] = [];

  constructor(trials: number, maxAngle: number) {
    this.trials = trials;
    this.maxAngle = maxAngle;
  }

  isFinished() {
    return this.currentTrial >= this.trials;
  }

  nextTrial() {
    if (this.isFinished()) return null;
    this.currentTrial++;
    
    const isMatch = Math.random() > 0.5;
    const baseAngle = 0;
    // Angle in steps of 90 degrees up to maxAngle
    const angleSteps = this.maxAngle / 90;
    const rotateAngle = Math.floor(Math.random() * angleSteps + 1) * 90;
    
    // Pattern 1: F shape
    const pattern = `M 20 80 L 20 20 L 80 20 L 80 40 L 40 40 L 40 50 L 70 50 L 70 70 L 40 70 L 40 80 Z`;
    
    return {
      pattern,
      isMatch,
      rotateAngle
    };
  }

  recordAction(isMatch: boolean, userMatch: boolean, rt: number) {
    this.results.push({isMatch, correct: isMatch === userMatch, rt});
  }

  getScore() {
    if (this.results.length === 0) return { accuracy: 0, avgRtMs: 0, rounds: 0 };
    const correct = this.results.filter(r => r.correct).length;
    const avgRtMs = this.results.reduce((a,b) => a+b.rt, 0) / this.results.length;
    
    return {
      accuracy: correct / this.results.length,
      avgRtMs,
      rounds: this.results.length
    };
  }
}
