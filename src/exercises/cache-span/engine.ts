export class CacheSpanEngine {
  itemsInSlots: string[] = [];
  targetItem: string = '';
  targetIndex: number = -1;

  private symbols = ['🚀', '🌟', '💎', '🔥', '🍀', '🍎', '🧩', '🎸', '⚽', '🚗', '🎈', '⚡'];

  start(params: { slots: number }) {
    const available = [...this.symbols].sort(() => Math.random() - 0.5);
    this.itemsInSlots = available.slice(0, params.slots);
    this.targetIndex = Math.floor(Math.random() * params.slots);
    this.targetItem = this.itemsInSlots[this.targetIndex];
    return { items: this.itemsInSlots };
  }

  getQuestion() {
    return { target: this.targetItem };
  }

  submit(selectedIndex: number) {
    return {
      correct: selectedIndex === this.targetIndex,
      correctIndex: this.targetIndex
    };
  }
}
