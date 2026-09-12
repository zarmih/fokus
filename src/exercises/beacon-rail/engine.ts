export class BeaconRailEngine {
  targetColor: string = '';
  private colors = ['red', 'blue', 'green', 'yellow', 'purple'];
  
  start() {
    this.targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    return { targetColor: this.targetColor };
  }

  generateItem(prob: number): { color: string, isTarget: boolean } {
    if (Math.random() < prob) {
      return { color: this.targetColor, isTarget: true };
    } else {
      let other = this.colors[Math.floor(Math.random() * this.colors.length)];
      while(other === this.targetColor) {
        other = this.colors[Math.floor(Math.random() * this.colors.length)];
      }
      return { color: other, isTarget: false };
    }
  }

  submit(itemWasTarget: boolean, pressed: boolean) {
    if (itemWasTarget && pressed) return { correct: true, type: 'hit' };
    if (!itemWasTarget && !pressed) return { correct: true, type: 'correct_rejection' };
    if (itemWasTarget && !pressed) return { correct: false, type: 'miss' };
    return { correct: false, type: 'false_alarm' };
  }
}
