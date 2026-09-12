import { ExerciseManifest, ExerciseModule, BlockResult } from './contract';

export const manifest: ExerciseManifest = {
  id: 'symbol-recall',
  name: 'Символьная память',
  domain: 'memory',
  skills: ['working_memory', 'recall'],
  metricModel: 'memory-span',
  instruction: 'Запомните набор символов. Затем укажите, был ли показанный символ в изначальном наборе.'
};

const SYMBOLS = ['⌘', '⌥', '⇧', '⌃', '', '⎋', '⏏', '⌫', '⊕', '⊗', '⊘', '⊙', '⊚', '⊛', '⊜', '∇', '∆', '✧', '★', '❈'];

export const symbolRecallModule: ExerciseModule = {
  manifest,
  render(el, level, onEnd, isTimeUp) {
    let rounds = 0;
    let correct = 0;
    let totalRtMs = 0;
    let isActive = true;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:sans-serif;">
        <div id="sr-content" style="font-size:4rem;text-align:center;min-height:100px;display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;"></div>
        <div id="sr-controls" style="display:none;gap:2rem;margin-top:2rem;">
          <button id="sr-btn-yes" style="padding:1rem 2rem;font-size:1.5rem;background:#2ecc71;color:white;border:none;border-radius:8px;cursor:pointer;">Было</button>
          <button id="sr-btn-no" style="padding:1rem 2rem;font-size:1.5rem;background:#e74c3c;color:white;border:none;border-radius:8px;cursor:pointer;">Не было</button>
        </div>
      </div>
    `;

    const contentEl = el.querySelector('#sr-content') as HTMLElement;
    const controlsEl = el.querySelector('#sr-controls') as HTMLElement;
    const btnYes = el.querySelector('#sr-btn-yes') as HTMLButtonElement;
    const btnNo = el.querySelector('#sr-btn-no') as HTMLButtonElement;

    let targetSymbols: string[] = [];
    let currentTestSymbol = '';
    let isTestPhase = false;
    let startRt = 0;
    let timer1: any, timer2: any;

    const startRound = () => {
      if (!isActive || isTimeUp()) {
        finish();
        return;
      }
      isTestPhase = false;
      controlsEl.style.display = 'none';
      
      const span = Math.min(3 + Math.floor(level / 2), 8);
      const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
      targetSymbols = shuffled.slice(0, span);
      
      contentEl.innerHTML = targetSymbols.map(s => `<span>${s}</span>`).join('');
      
      timer1 = setTimeout(() => {
        if (!isActive) return;
        contentEl.innerHTML = '';
        timer2 = setTimeout(showTest, 500);
      }, 3000 + span * 200);
    };

    const showTest = () => {
      if (!isActive || isTimeUp()) {
        finish();
        return;
      }
      isTestPhase = true;
      const isTarget = Math.random() > 0.5;
      if (isTarget) {
        currentTestSymbol = targetSymbols[Math.floor(Math.random() * targetSymbols.length)];
      } else {
        const distractors = SYMBOLS.filter(s => !targetSymbols.includes(s));
        currentTestSymbol = distractors[Math.floor(Math.random() * distractors.length)];
      }
      
      contentEl.innerHTML = `<span>${currentTestSymbol}</span>`;
      controlsEl.style.display = 'flex';
      startRt = Date.now();
    };

    const handleAnswer = (answeredYes: boolean) => {
      if (!isActive || !isTestPhase) return;
      isTestPhase = false;
      const wasPresent = targetSymbols.includes(currentTestSymbol);
      const isCorrect = answeredYes === wasPresent;
      
      rounds++;
      totalRtMs += (Date.now() - startRt);
      if (isCorrect) correct++;
      
      contentEl.innerHTML = isCorrect ? '<span style="color:#2ecc71">✓</span>' : '<span style="color:#e74c3c">✗</span>';
      controlsEl.style.display = 'none';
      
      timer1 = setTimeout(startRound, 500);
    };

    btnYes.onclick = () => handleAnswer(true);
    btnNo.onclick = () => handleAnswer(false);

    startRound();

    function finish() {
      isActive = false;
      onEnd({
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rounds > 0 ? totalRtMs / rounds : 0,
        rounds
      });
    }

    return () => { 
      isActive = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }
};

export default symbolRecallModule;
