import { ExerciseModule, BlockResult } from './contract';

const SYMBOLS = ['★', '♠', '♥', '♣', '♦', '▲', '●', '■', '☀', '☁', '☂', '☃', '☄', '☾', '♫', '⚑'];

const orderRecallModule: ExerciseModule = {
  manifest: {
    id: 'order-recall',
    name: 'Порядок',
    domain: 'memory',
    skills: ['working_memory', 'recall'],
    metricModel: 'memory-span',
    instruction: 'Запомните последовательность символов. После их исчезновения выберите их в том же порядке.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .or-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .or-seq-container {
          display: flex;
          gap: 10px;
          min-height: 80px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }
        .or-card {
          width: 60px;
          height: 80px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: var(--text);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          transition: transform 0.2s, opacity 0.2s;
        }
        .or-options {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          justify-content: center;
          max-width: 400px;
        }
        .or-option {
          width: 60px;
          height: 80px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s, background 0.2s;
          user-select: none;
        }
        .or-option:active {
          transform: scale(0.95);
        }
        .or-option.selected {
          border-color: var(--accent);
          background: rgba(128,128,128,0.2);
          pointer-events: none;
          opacity: 0.5;
        }
        .or-option.wrong {
          border-color: var(--danger, #f44336);
          background: rgba(244, 67, 54, 0.2);
        }
        .or-status {
          font-size: 18px;
          font-weight: bold;
          min-height: 24px;
          text-align: center;
        }
      </style>
      <div class="or-arena">
        <div class="or-status" id="or-status"></div>
        <div class="or-seq-container" id="or-seq"></div>
        <div class="or-options" id="or-options"></div>
      </div>
    `;

    const seqEl = el.querySelector('#or-seq') as HTMLElement;
    const optionsEl = el.querySelector('#or-options') as HTMLElement;
    const statusEl = el.querySelector('#or-status') as HTMLElement;

    let targetSeq: string[] = [];
    let userSeq: string[] = [];
    let phase = 'show';
    let t0 = performance.now();
    let timeoutIds: ReturnType<typeof setTimeout>[] = [];
    
    const cleanup = () => {
      timeoutIds.forEach(clearTimeout);
      timeoutIds = [];
    };

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      cleanup();
      phase = 'show';
      userSeq = [];
      statusEl.textContent = 'Запоминайте порядок...';
      optionsEl.innerHTML = '';
      
      const seqLen = Math.min(3 + Math.floor(level / 2), 7);
      
      let pool = [...SYMBOLS];
      pool.sort(() => Math.random() - 0.5);
      targetSeq = pool.slice(0, seqLen);
      
      seqEl.innerHTML = targetSeq.map(s => `<div class="or-card">\${s}</div>`).join('');
      
      const displayTime = Math.max(1500, seqLen * 800 - level * 100);
      
      timeoutIds.push(setTimeout(() => {
        if (isGameOver) return;
        phase = 'input';
        statusEl.textContent = 'Восстановите последовательность';
        
        seqEl.innerHTML = targetSeq.map(() => `<div class="or-card" style="color: transparent; border-style: dashed;">?</div>`).join('');
        
        let optionsPool = [...targetSeq];
        const numDistractors = level > 3 ? 2 : 0;
        let distractorPool = pool.slice(seqLen);
        for(let i=0; i<numDistractors && i<distractorPool.length; i++) {
          optionsPool.push(distractorPool[i]);
        }
        
        optionsPool.sort(() => Math.random() - 0.5);
        
        optionsEl.innerHTML = optionsPool.map((s) => 
          `<div class="or-option" data-sym="\${s}">\${s}</div>`
        ).join('');
        
        const opts = optionsEl.querySelectorAll('.or-option');
        opts.forEach(opt => {
          (opt as HTMLElement).onclick = () => handleInput(opt.getAttribute('data-sym') || '', opt as HTMLElement);
        });
        
        t0 = performance.now();
      }, displayTime));
    };
    
    const handleInput = (sym: string, btn: HTMLElement) => {
      if (phase !== 'input' || isGameOver) return;
      
      const expected = targetSeq[userSeq.length];
      
      if (sym === expected) {
        userSeq.push(sym);
        btn.classList.add('selected');
        
        const cards = seqEl.querySelectorAll('.or-card');
        const card = cards[userSeq.length - 1] as HTMLElement;
        if (card) {
          card.style.color = 'var(--text)';
          card.style.borderStyle = 'solid';
          card.textContent = sym;
        }
        
        if (userSeq.length === targetSeq.length) {
          phase = 'anim';
          rounds++;
          correct++;
          rts.push(performance.now() - t0);
          statusEl.textContent = 'Верно!';
          seqEl.querySelectorAll('.or-card').forEach(c => (c as HTMLElement).style.borderColor = 'var(--ok, #4caf50)');
          timeoutIds.push(setTimeout(startRound, 1000));
        }
      } else {
        phase = 'anim';
        rounds++;
        rts.push(performance.now() - t0);
        btn.classList.add('wrong');
        statusEl.textContent = 'Ошибка!';
        
        seqEl.innerHTML = targetSeq.map(s => `<div class="or-card" style="border-color: var(--danger, #f44336);">\${s}</div>`).join('');
        
        timeoutIds.push(setTimeout(startRound, 1500));
      }
    };

    startRound();

    const endBlock = () => {
      isGameOver = true;
      cleanup();
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 3000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      cleanup();
    };
  }
};

export default orderRecallModule;
