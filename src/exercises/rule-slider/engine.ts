export interface RuleCard {
  count: number;
  shape: string;
}

export interface RuleSliderState {
  rule: 'SHAPE' | 'COUNT';
  center: RuleCard;
  options: RuleCard[];
  correctIndex: number;
}

export class RuleSliderEngine {
  private shapes = ['circle', 'square', 'triangle', 'diamond'];
  
  start(level: number): RuleSliderState {
    const center: RuleCard = {
      count: Math.floor(Math.random() * 4) + 1,
      shape: this.shapes[Math.floor(Math.random() * this.shapes.length)]
    };
    
    const rule = Math.random() > 0.5 ? 'SHAPE' : 'COUNT';
    
    // Generate option 1 (Shape match)
    let shapeMatchCount = center.count;
    while (shapeMatchCount === center.count) {
      shapeMatchCount = Math.floor(Math.random() * 4) + 1;
    }
    const optionShape: RuleCard = { shape: center.shape, count: shapeMatchCount };
    
    // Generate option 2 (Count match)
    let countMatchShape = center.shape;
    while (countMatchShape === center.shape) {
      countMatchShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    }
    const optionCount: RuleCard = { shape: countMatchShape, count: center.count };
    
    // Generate 2 distractors
    const generateDistractor = (): RuleCard => {
      let s = center.shape, c = center.count;
      while (s === center.shape || c === center.count) {
        s = this.shapes[Math.floor(Math.random() * this.shapes.length)];
        c = Math.floor(Math.random() * 4) + 1;
      }
      return { shape: s, count: c };
    };
    
    const options = [optionShape, optionCount, generateDistractor(), generateDistractor()];
    
    // Shuffle options
    options.sort(() => Math.random() - 0.5);
    
    const correctIndex = options.findIndex(o => 
      rule === 'SHAPE' ? o.shape === center.shape : o.count === center.count
    );
    
    return { rule, center, options, correctIndex };
  }
  
  submit(state: RuleSliderState, index: number): { accuracy: number } {
    return { accuracy: index === state.correctIndex ? 1 : 0 };
  }
}
