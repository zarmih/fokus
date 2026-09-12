export type Color = 'Красный' | 'Синий' | 'Зеленый' | 'Желтый';

export class VaultSpanEngine {
  generatePuzzle(level: number): { solution: Color[], clues: string[] } {
    const isHard = level > 4;
    const colors: Color[] = isHard ? ['Красный', 'Синий', 'Зеленый', 'Желтый'] : ['Красный', 'Синий', 'Зеленый'];
    const solution = [...colors].sort(() => Math.random() - 0.5);
    let clues: string[] = [];
    
    if (!isHard) {
      const [a, b, c] = solution;
      const r = Math.floor(Math.random() * 3);
      if (r === 0) clues = [`${a} левее ${b}`, `${b} левее ${c}`];
      else if (r === 1) clues = [`${b} по центру`, `${a} левее ${c}`];
      else clues = [`${c} правее ${b}`, `${b} правее ${a}`];
    } else {
      const [a, b, c, d] = solution;
      const r = Math.floor(Math.random() * 2);
      if (r === 0) clues = [`${a} первый слева`, `${d} крайний справа`, `${b} левее ${c}`];
      else clues = [`${a} и ${d} по краям`, `${b} левее ${c}`, `${a} левее ${b}`]; // "по краям" means at 0 and 3. Since a left of b, a is at 0, d is at 3. b left of c means b is 1, c is 2.
    }
    
    return { solution, clues: clues.sort(() => Math.random() - 0.5) };
  }
}
