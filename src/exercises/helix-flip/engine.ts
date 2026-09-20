export type Shape = 'Квадрат' | 'Круг' | 'Треугольник';
export type Color = 'Красный' | 'Синий' | 'Зеленый';

export interface HelixTrial {
  leftShape: Shape;
  leftColor: Color;
  rightShape: Shape;
  rightColor: Color;
  rule: 'Форма' | 'Цвет';
  isMatch: boolean;
}

export class HelixFlipEngine {
  private shapes: Shape[] = ['Квадрат', 'Круг', 'Треугольник'];
  private colors: Color[] = ['Красный', 'Синий', 'Зеленый'];

  generateTrial(switchChance: number, currentRule: 'Форма' | 'Цвет'): HelixTrial {
    const rule = Math.random() < switchChance ? (currentRule === 'Форма' ? 'Цвет' : 'Форма') : currentRule;
    const isMatch = Math.random() < 0.5;

    let leftShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    let leftColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    let rightShape: Shape;
    let rightColor: Color;

    if (rule === 'Форма') {
      rightShape = isMatch ? leftShape : this.shapes.find(s => s !== leftShape)!;
      rightColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    } else {
      rightColor = isMatch ? leftColor : this.colors.find(c => c !== leftColor)!;
      rightShape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
    }

    return {
      leftShape, leftColor, rightShape, rightColor, rule, isMatch
    };
  }
}
