import { ExerciseManifest, ExerciseModule, BlockResult } from './contract';

export const manifest: ExerciseManifest = {
  id: 'dual-match',
  name: 'Двойной анализ',
  domain: 'attention',
  skills: ['divided_attention', 'processing_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Следите за двумя панелями. Если слева КРУГ, а справа КРАСНЫЙ цвет — нажимайте МАТЧ. Иначе — НЕТ.'
};

export const dualMatchModule: ExerciseModule = {
  manifest,
  render(el, level, onEnd, isTimeUp) {
    let rounds = 0;
    let correct = 0;
    let totalRtMs = 0;
    let isActive = true;

    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;font-family:sans-serif;">
        <div style="display:flex;gap:2rem;margin-bottom:2rem;">
          <div id="dm-left" style="width:120px;height:120px;border:4px solid #333;display:flex;align-items:center;justify-content:center;"></div>
          <div id="dm-right" style="width:120px;height:120px;border:4px solid #333;display:flex;align-items:center;justify-content:center;"></div>
        </div>
        <div id="dm-controls" style="display:flex;gap:2rem;">
          <button id="dm-btn-match" style="padding:1rem 2rem;font-size:1.5rem;background:#2ecc71;color:white;border:none;border-radius:8px;cursor:pointer;">МАТЧ</button>
          <button id="dm-btn-no" style="padding:1rem 2rem;font-size:1.5rem;background:#e74c3c;color:white;border:none;border-radius:8px;cursor:pointer;">НЕТ</button>
        </div>
      </div>
    `;

    const leftEl = el.querySelector('#dm-left') as HTMLElement;
    const rightEl = el.querySelector('#dm-right') as HTMLElement;
    const btnMatch = el.querySelector('#dm-btn-match') as HTMLButtonElement;
    const btnNo = el.querySelector('#dm-btn-no') as HTMLButtonElement;

    let startRt = 0;
    let isTarget = false;
    let timer1: any;

    const shapes = ['circle', 'square', 'triangle'];
    const colors = ['#e74c3c', '#3498db', '#f1c40f']; // Red, Blue, Yellow

    const drawShape = (container: HTMLElement, shape: string, color: string) => {
      container.innerHTML = '';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', '80');
      svg.setAttribute('height', '80');
      svg.setAttribute('viewBox', '0 0 100 100');
      
      let child;
      if (shape === 'circle') {
        child = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        child.setAttribute('cx', '50');
        child.setAttribute('cy', '50');
        child.setAttribute('r', '40');
      } else if (shape === 'square') {
        child = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        child.setAttribute('x', '10');
        child.setAttribute('y', '10');
        child.setAttribute('width', '80');
        child.setAttribute('height', '80');
      } else {
        child = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        child.setAttribute('points', '50,10 90,90 10,90');
      }
      child.setAttribute('fill', color);
      svg.appendChild(child);
      container.appendChild(svg);
    };

    const nextRound = () => {
      if (!isActive || isTimeUp()) {
        finish();
        return;
      }
      
      leftEl.innerHTML = '';
      rightEl.innerHTML = '';
      
      timer1 = setTimeout(() => {
        if (!isActive) return;
        
        isTarget = Math.random() < 0.4;
        
        let leftShape, rightColor;
        if (isTarget) {
          leftShape = 'circle';
          rightColor = '#e74c3c';
        } else {
          leftShape = shapes[Math.floor(Math.random() * shapes.length)];
          rightColor = colors[Math.floor(Math.random() * colors.length)];
          if (leftShape === 'circle' && rightColor === '#e74c3c') {
             leftShape = 'square'; 
          }
        }
        
        drawShape(leftEl, leftShape, '#95a5a6');
        drawShape(rightEl, 'square', rightColor);
        
        startRt = Date.now();
      }, 300);
    };

    const handleAnswer = (answeredMatch: boolean) => {
      if (!isActive || !startRt) return;
      const isCorrect = answeredMatch === isTarget;
      
      rounds++;
      totalRtMs += (Date.now() - startRt);
      if (isCorrect) correct++;
      
      startRt = 0;
      nextRound();
    };

    btnMatch.onclick = () => handleAnswer(true);
    btnNo.onclick = () => handleAnswer(false);

    nextRound();

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
    };
  }
};

export default dualMatchModule;
