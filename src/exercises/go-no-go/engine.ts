export class GoNoGoEngine {
  private trials: number;
  private noGoRatio: number;
  private currentTrial = 0;
  private results: {isGo: boolean, reacted: boolean, rt: number}[] = [];

  constructor(trials: number, noGoRatio: number) {
    this.trials = trials;
    this.noGoRatio = noGoRatio;
  }

  isFinished() {
    return this.currentTrial >= this.trials;
  }

  nextTrial(): boolean {
    if (this.isFinished()) return false;
    this.currentTrial++;
    return Math.random() > this.noGoRatio;
  }

  recordAction(isGo: boolean, reacted: boolean, rt: number) {
    this.results.push({isGo, reacted, rt});
  }

  getScore() {
    if (this.results.length === 0) return { accuracy: 0, avgRtMs: 0, rounds: 0 };
    const correct = this.results.filter(r => r.isGo === r.reacted).length;
    const goRts = this.results.filter(r => r.isGo && r.reacted).map(r => r.rt);
    const avgRtMs = goRts.length > 0 ? goRts.reduce((a,b) => a+b, 0) / goRts.length : 1000;
    
    return {
      accuracy: correct / this.results.length,
      avgRtMs,
      rounds: this.results.length
    };
  }
}
