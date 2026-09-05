export class PairsGame {
  cards: string[];
  matched: boolean[];
  flipped: number[];
  
  constructor(public pairsCount: number) {
    const TILES = ['sun', 'moon', 'leaf', 'fish', 'bird', 'cup', 'key', 'star'];
    const selected = TILES.slice(0, pairsCount);
    this.cards = [...selected, ...selected];
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
    this.matched = new Array(this.cards.length).fill(false);
    this.flipped = [];
  }

  flip(index: number): 'match' | 'mismatch' | 'invalid' | 'pending' | 'win' {
    if (this.matched[index]) return 'invalid';
    if (this.flipped.includes(index)) return 'invalid';
    if (this.flipped.length === 2) return 'invalid';
    
    this.flipped.push(index);
    if (this.flipped.length === 1) return 'pending';
    
    const [i1, i2] = this.flipped;
    if (this.cards[i1] === this.cards[i2]) {
      this.matched[i1] = true;
      this.matched[i2] = true;
      this.flipped = [];
      if (this.matched.every(m => m)) return 'win';
      return 'match';
    }
    
    return 'mismatch';
  }

  clearFlipped() {
    this.flipped = [];
  }
}
