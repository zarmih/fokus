export type SymbolId = 'square' | 'circle' | 'triangle' | 'star' | 'cross' | 'hexagon';

export const SYMBOLS: SymbolId[] = ['square', 'circle', 'triangle', 'star', 'cross', 'hexagon'];

export class NBackEngine {
  private n: number;
  private history: SymbolId[] = [];
  
  constructor(n: number) {
    this.n = n;
  }

  nextTrial(matchChance: number): { symbol: SymbolId, isMatch: boolean } {
    let symbol: SymbolId;
    let isMatch = false;

    if (this.history.length >= this.n && Math.random() < matchChance) {
      symbol = this.history[this.history.length - this.n];
      isMatch = true;
    } else {
      const available = SYMBOLS.filter(s => 
        this.history.length < this.n || s !== this.history[this.history.length - this.n]
      );
      symbol = available[Math.floor(Math.random() * available.length)];
    }

    this.history.push(symbol);
    return { symbol, isMatch };
  }

  submit(isMatch: boolean, userSaidMatch: boolean): boolean {
    return isMatch === userSaidMatch;
  }
}
