import { ExerciseModule, BlockResult } from './contract';

const signFlipModule: ExerciseModule = {
  manifest: {
    id: 'sign-flip',
    name: 'Смена знака',
    domain: 'flexibility',
    skills: ['inhibition', 'task_switching'],
    metricModel: 'speed-accuracy',
    instruction: 'Решайте пример. Будьте внимательны: иногда знак операции внезапно меняется на противоположный! Отвечайте по актуальному знаку.'
  },
  render(el, level, onEnd, isTimeUp) {
    el.innerHTML = '';
    
    let rounds = 0;
    let accuracy = 0;
    let avgRtMs = 0;
    
    let currentOp = '+';
    let a = 0;
    let b = 0;
    let willFlip = false;
    let hasFlipped = false;
    let flipTimeout: any;
    let startTime = 0;
    
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.alignItems = 'center';
    container.style.justifyContent = 'center';
    container.style.height = '100%';
    container.style.gap = '40px';

    const equationEl = document.createElement('div');
    equationEl.style.fontSize = '4rem';
    equationEl.style.fontWeight = 'bold';
    equationEl.style.display = 'flex';
    equationEl.style.gap = '20px';
    equationEl.style.alignItems = 'center';

    const aEl = document.createElement('span');
    const opEl = document.createElement('span');
    opEl.style.transition = 'color 0.2s, transform 0.2s';
    const bEl = document.createElement('span');

    equationEl.appendChild(aEl);
    equationEl.appendChild(opEl);
    equationEl.appendChild(bEl);
    container.appendChild(equationEl);

    const optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'flex';
    optionsContainer.style.gap = '20px';
    container.appendChild(optionsContainer);

    el.appendChild(container);

    function generateRound() {
      if (isTimeUp()) {
        finish();
        return;
      }
      
      rounds++;
      optionsContainer.innerHTML = '';
      
      const maxNum = 5 + level * 2;
      a = Math.floor(Math.random() * maxNum) + 2;
      b = Math.floor(Math.random() * maxNum) + 2;
      
      // Ensure positive result for subtraction
      if (a < b) {
        const temp = a;
        a = b;
        b = temp;
      }
      
      currentOp = Math.random() > 0.5 ? '+' : '-';
      willFlip = Math.random() < Math.min(0.2 + level * 0.05, 0.5);
      hasFlipped = false;
      
      aEl.textContent = a.toString();
      bEl.textContent = b.toString();
      opEl.textContent = currentOp;
      opEl.style.color = 'var(--text)';
      opEl.style.transform = 'scale(1)';
      
      const ansPlus = a + b;
      const ansMinus = a - b;
      
      let options = [ansPlus, ansMinus];
      
      // Add one or two random options
      while (options.length < 3) {
        const rand = Math.floor(Math.random() * (maxNum * 2)) + 1;
        if (!options.includes(rand)) {
          options.push(rand);
        }
      }
      
      options.sort(() => Math.random() - 0.5);
      
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt.toString();
        btn.style.fontSize = '2rem';
        btn.style.padding = '15px 30px';
        btn.style.borderRadius = '12px';
        btn.style.border = '2px solid var(--primary)';
        btn.style.backgroundColor = 'var(--surface)';
        btn.style.color = 'var(--text)';
        btn.style.cursor = 'pointer';
        btn.style.transition = 'all 0.1s';
        
        btn.onmousedown = () => handleAnswer(opt);
        btn.ontouchstart = (e) => {
          e.preventDefault();
          handleAnswer(opt);
        };
        
        optionsContainer.appendChild(btn);
      });
      
      startTime = Date.now();
      
      if (willFlip) {
        const flipDelay = Math.max(300, 800 - level * 50);
        flipTimeout = setTimeout(() => {
          currentOp = currentOp === '+' ? '-' : '+';
          hasFlipped = true;
          opEl.textContent = currentOp;
          opEl.style.color = 'var(--error)';
          opEl.style.transform = 'scale(1.5)';
          
          setTimeout(() => {
            opEl.style.transform = 'scale(1)';
          }, 200);
        }, flipDelay);
      }
    }

    function handleAnswer(ans: number) {
      clearTimeout(flipTimeout);
      
      const rt = Date.now() - startTime;
      avgRtMs = avgRtMs === 0 ? rt : (avgRtMs + rt) / 2;
      
      const correctAns = currentOp === '+' ? a + b : a - b;
      
      if (ans === correctAns) {
        accuracy++;
        document.body.style.backgroundColor = 'var(--success-bg)';
      } else {
        document.body.style.backgroundColor = 'var(--error-bg)';
      }
      
      setTimeout(() => {
        document.body.style.backgroundColor = '';
      }, 150);
      
      generateRound();
    }

    generateRound();

    function finish() {
      clearTimeout(flipTimeout);
      document.body.style.backgroundColor = '';
      const acc = rounds > 0 ? accuracy / rounds : 0;
      onEnd({
        accuracy: acc,
        avgRtMs,
        rounds
      });
    }

    return finish;
  }
};

export default signFlipModule;
