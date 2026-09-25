export interface Card {
  color: string;
  shape: string;
}

export class TripleMatchEngine {
  colors = ['#EF476F', '#FFD166', '#06D6A0'];
  shapes = ['circle', 'square', 'triangle'];

  generateCards(): { cards: Card[], isMatch: boolean } {
    const isMatch = Math.random() > 0.5;
    
    let colorSet: string[];
    let shapeSet: string[];

    if (isMatch) {
       const sameColor = Math.random() > 0.5;
       const colorBase = this.colors[Math.floor(Math.random() * this.colors.length)];
       colorSet = sameColor ? [colorBase, colorBase, colorBase] : [...this.colors];
       
       const sameShape = Math.random() > 0.5;
       const shapeBase = this.shapes[Math.floor(Math.random() * this.shapes.length)];
       shapeSet = sameShape ? [shapeBase, shapeBase, shapeBase] : [...this.shapes];
    } else {
       // 2 same, 1 different breaks the 'set' rule
       const c1 = this.colors[0], c2 = this.colors[1];
       const s1 = this.shapes[0], s2 = this.shapes[1];
       colorSet = [c1, c1, c2];
       shapeSet = [s1, s1, s2];
    }

    colorSet.sort(() => Math.random() - 0.5);
    shapeSet.sort(() => Math.random() - 0.5);

    const cards = colorSet.map((c, i) => ({ color: c, shape: shapeSet[i] }));
    return { cards, isMatch };
  }
}
