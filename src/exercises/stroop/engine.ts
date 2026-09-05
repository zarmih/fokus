export type ColorId = 'red' | 'blue' | 'green' | 'yellow';

export const COLORS: {id: ColorId, word: string, hex: string}[] = [
  {id: 'red', word: 'Красный', hex: '#ef7a7a'},
  {id: 'blue', word: 'Синий', hex: '#5b9dff'},
  {id: 'green', word: 'Зелёный', hex: '#7dcc8a'},
  {id: 'yellow', word: 'Жёлтый', hex: '#f5d067'}
];

export class StroopEngine {
  nextTrial(params: {colors: number, incongruentPct: number}): {word: ColorId, ink: ColorId, options: ColorId[], congruent: boolean} {
    const available = COLORS.slice(0, params.colors).map(c => c.id);
    const word = available[Math.floor(Math.random() * available.length)];
    let ink = word;
    const congruent = Math.random() > params.incongruentPct;
    
    if (!congruent && available.length > 1) {
      let other = available.filter(c => c !== word);
      ink = other[Math.floor(Math.random() * other.length)];
    }
    
    return { word, ink, options: available, congruent };
  }

  submit(inkChoice: ColorId | null, actualInk: ColorId): boolean {
    return inkChoice === actualInk;
  }
}
