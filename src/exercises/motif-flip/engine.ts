export type Feature = 'color' | 'shape';
export interface Motif { color: string; shape: string; }

export class MotifFlipEngine {
  currentRule: Feature = 'color';
  private colors = ['red', 'blue', 'green', 'yellow'];
  private shapes = ['circle', 'square', 'triangle', 'star'];

  start() {
    this.currentRule = 'color'; // initial
  }

  generateRound(switchProb: number) {
    if (Math.random() < switchProb) {
      this.currentRule = this.currentRule === 'color' ? 'shape' : 'color';
    }

    const targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    const targetShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    const target: Motif = { color: targetColor, shape: targetShape };

    let diffColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    while (diffColor === targetColor) diffColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    let diffShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    while (diffShape === targetShape) diffShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];

    const opt1: Motif = { color: targetColor, shape: diffShape };
    const opt2: Motif = { color: diffColor, shape: targetShape };

    const opts = Math.random() > 0.5 ? [opt1, opt2] : [opt2, opt1];
    
    let correctIndex = -1;
    if (this.currentRule === 'color') correctIndex = opts.findIndex(o => o.color === target.color);
    else correctIndex = opts.findIndex(o => o.shape === target.shape);

    return { rule: this.currentRule, target, options: opts, correctIndex };
  }
}
