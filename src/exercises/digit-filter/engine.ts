export class DigitFilterEngine {
  generateStream(level: number): { char: string, isTarget: boolean } {
    const chars = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ'.split('');
    const digits = '123456789'.split('');
    
    // ~30% targets
    const isTarget = Math.random() < 0.3;
    
    if (isTarget) {
      const evens = ['2', '4', '6', '8'];
      return {
        char: evens[Math.floor(Math.random() * evens.length)],
        isTarget: true
      };
    } else {
      const isOdd = Math.random() < 0.5;
      if (isOdd) {
        const odds = ['1', '3', '5', '7', '9'];
        return {
          char: odds[Math.floor(Math.random() * odds.length)],
          isTarget: false
        };
      } else {
        return {
          char: chars[Math.floor(Math.random() * chars.length)],
          isTarget: false
        };
      }
    }
  }
}
