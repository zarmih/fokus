export interface Trial {
  word: string;
  colorHex: string;
  colorLabel: string;
  options: { label: string, hex: string }[];
}

export class WordColorLinkEngine {
  words = ['МЕДВЕДЬ', 'ПЛАНЕТА', 'КОРАБЛЬ', 'ОКЕАН', 'ДЕРЕВО', 'КАМЕНЬ', 'ЗАМОК', 'ПТИЦА'];
  colors = [
    { label: 'Красный', hex: '#EF476F' },
    { label: 'Синий', hex: '#118AB2' },
    { label: 'Зеленый', hex: '#06D6A0' },
    { label: 'Желтый', hex: '#FFD166' },
    { label: 'Фиолетовый', hex: '#8338EC' }
  ];

  generateTrial(): Trial {
    const word = this.words[Math.floor(Math.random() * this.words.length)];
    const target = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    const others = this.colors.filter(c => c.hex !== target.hex).sort(() => Math.random() - 0.5);
    const options = [target, others[0], others[1]].sort(() => Math.random() - 0.5);

    return {
      word,
      colorHex: target.hex,
      colorLabel: target.label,
      options
    };
  }
}
