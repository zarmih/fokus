import { ExerciseModule, BlockResult } from './contract';
import { mountStage } from './stage';

export class WordUnscrambleEngine {
  words = ['КОТ', 'ЛЕС', 'ДОМ', 'РЕКА', 'НЕБО', 'МОРЕ', 'ВОДА', 'ЗИМА', 'ЛЕТО', 'ГОРА', 'ПТИЦА', 'ВЕСНА', 'ДЕРЕВО', 'СОЛНЦЕ', 'СОБАКА'];
  currentWord = '';
  scrambled = '';
  
  generate(level: number) {
    const maxLength = Math.min(3 + Math.floor(level / 3), 6);
    let pool = this.words.filter(w => w.length <= maxLength);
    if (pool.length === 0) pool = this.words;
    this.currentWord = pool[Math.floor(Math.random() * pool.length)];
    
    let arr = this.currentWord.split('');
    do {
      arr.sort(() => Math.random() - 0.5);
    } while(arr.join('') === this.currentWord && this.currentWord.length > 1);
    this.scrambled = arr.join('');
    return { word: this.currentWord, scrambled: this.scrambled };
  }
  
  submit(answer: string) {
    return answer === this.currentWord;
  }
}

const wordUnscrambleModule: ExerciseModule = {
  manifest: {
    id: 'word-unscramble',
    name: 'Анаграммы',
    domain: 'logic',
    skills: ['logical_reasoning', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Составьте правильное слово из предложенных букв, нажимая на них в правильном порядке.'
  },
  render(el, level, onEnd, isTimeUp) {
    const engine = new WordUnscrambleEngine();
    const stage = mountStage(el, 'logic');
    let rounds = 0;
    let correct = 0;
    const rts: number[] = [];
    
    stage.board.innerHTML = `
      <style>
        .wu-container { display: flex; flex-direction: column; align-items: center; gap: 30px; height: 100%; justify-content: center; }
        .wu-answer { min-height: 60px; font-size: 40px; font-weight: bold; letter-spacing: 4px; display: flex; gap: 8px; color: var(--text); }
        .wu-letters { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; max-width: 400px; }
        .wu-btn { width: 60px; height: 60px; font-size: 28px; font-weight: bold; border-radius: 12px; border: 2px solid var(--line); background: var(--surface); color: var(--text); cursor: pointer; transition: transform 0.1s, opacity 0.2s; }
        .wu-btn:active { transform: scale(0.95); }
        .wu-btn.used { opacity: 0; pointer-events: none; }
      </style>
      <div class="wu-container">
        <div class="wu-answer" id="wu-answer"></div>
        <div class="wu-letters" id="wu-letters"></div>
      </div>
    `;
    
    const ansEl = stage.board.querySelector('#wu-answer') as HTMLElement;
    const lettersEl = stage.board.querySelector('#wu-letters') as HTMLElement;
    
    let currentInput = '';
    let expectedLength = 0;
    let t0 = performance.now();
    let timer: number;
    let roundActive = false;
    
    const startRound = () => {
      if (isTimeUp()) {
        endBlock();
        return;
      }
      currentInput = '';
      const state = engine.generate(level);
      expectedLength = state.word.length;
      ansEl.textContent = '';
      ansEl.style.color = '';
      lettersEl.innerHTML = '';
      
      state.scrambled.split('').forEach((char, idx) => {
        const btn = document.createElement('button');
        btn.className = 'wu-btn';
        btn.textContent = char;
        btn.onclick = () => {
          if (!roundActive) return;
          btn.classList.add('used');
          currentInput += char;
          ansEl.textContent = currentInput;
          if (currentInput.length === expectedLength) {
            handleComplete();
          }
        };
        lettersEl.appendChild(btn);
      });
      roundActive = true;
      t0 = performance.now();
    };
    
    const handleComplete = () => {
      roundActive = false;
      const rt = performance.now() - t0;
      rts.push(rt);
      rounds++;
      
      const isCorrect = engine.submit(currentInput);
      stage.pulse(isCorrect);
      if (isCorrect) {
        correct++;
        ansEl.style.color = 'var(--success)';
      } else {
        ansEl.style.color = 'var(--danger)';
      }
      
      timer = window.setTimeout(() => {
        startRound();
      }, isCorrect ? 400 : 800);
    };
    
    startRound();
    
    const endBlock = () => {
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 2000;
      stage.cleanup();
      onEnd({ accuracy, avgRtMs, rounds });
    };
    
    return () => {
      clearTimeout(timer);
      stage.cleanup();
    };
  }
};
export default wordUnscrambleModule;
