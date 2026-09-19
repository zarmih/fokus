export class VowelCountEngine {
  word: string = '';
  vowelCount: number = 0;
  options: number[] = [];
  
  start(params: {length: number}): {word: string, vowelCount: number, options: number[]} {
    const vowels = 'АЕЁИОУЫЭЮЯ'.split('');
    const consonants = 'БВГДЖЗЙКЛМНПРСТФХЦЧШЩ'.split('');
    
    let w = '';
    let count = 0;
    
    const targetVowels = Math.max(1, Math.floor(Math.random() * (params.length - 1)) + 1);
    
    for (let i = 0; i < params.length; i++) {
        if (i < targetVowels) {
            w += vowels[Math.floor(Math.random() * vowels.length)];
            count++;
        } else {
            w += consonants[Math.floor(Math.random() * consonants.length)];
        }
    }
    
    w = w.split('').sort(() => Math.random() - 0.5).join('');
    
    this.word = w;
    this.vowelCount = count;
    
    this.options = [count];
    while(this.options.length < 4) {
        const rnd = Math.max(0, count + (Math.floor(Math.random() * 5) - 2));
        if (!this.options.includes(rnd) && rnd >= 0 && rnd <= params.length) {
            this.options.push(rnd);
        }
    }
    this.options.sort((a,b) => a - b);
    
    return { word: this.word, vowelCount: this.vowelCount, options: this.options };
  }

  submit(count: number | null): {accuracy: number} {
    return { accuracy: count === this.vowelCount ? 1 : 0 };
  }
}
