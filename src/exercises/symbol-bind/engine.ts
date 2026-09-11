export interface SymbolPair {
  symbol: string;
  number: number;
}

export interface SymbolBindState {
  pairs: SymbolPair[];
  targetSymbol: string;
  options: number[];
  correctAnswer: number;
}

export class SymbolBindEngine {
  private symbols = ['★', '♠', '♣', '♥', '♦', '♪', '☀', '☁', '☂', '☃', '☄', '☾'];
  
  start(level: number): SymbolBindState {
    const pairCount = Math.min(3 + Math.floor(level / 3), 8);
    const shuffledSymbols = [...this.symbols].sort(() => Math.random() - 0.5).slice(0, pairCount);
    
    const pairs: SymbolPair[] = [];
    const usedNumbers = new Set<number>();
    
    for (let i = 0; i < pairCount; i++) {
      let num = Math.floor(Math.random() * 90) + 10;
      while (usedNumbers.has(num)) {
        num = Math.floor(Math.random() * 90) + 10;
      }
      usedNumbers.add(num);
      pairs.push({ symbol: shuffledSymbols[i], number: num });
    }
    
    const targetIdx = Math.floor(Math.random() * pairCount);
    const targetPair = pairs[targetIdx];
    
    // Generate options including correct one
    const options = [targetPair.number];
    while (options.length < 4) {
      let num = Math.floor(Math.random() * 90) + 10;
      if (!options.includes(num)) {
        options.push(num);
      }
    }
    options.sort(() => Math.random() - 0.5);
    
    return {
      pairs,
      targetSymbol: targetPair.symbol,
      options,
      correctAnswer: targetPair.number
    };
  }
  
  submit(state: SymbolBindState, answer: number): { accuracy: number } {
    return {
      accuracy: answer === state.correctAnswer ? 1 : 0
    };
  }
}
