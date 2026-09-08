export class VerbalFluencyEngine {
  private duration: number;
  private words: string[] = [];

  constructor(duration: number) {
    this.duration = duration;
  }

  addWord(word: string): boolean {
    const w = word.trim().toLowerCase();
    if (w.length > 1 && !this.words.includes(w)) {
      this.words.push(w);
      return true;
    }
    return false;
  }

  getScore(): number {
    return this.words.length;
  }
}
