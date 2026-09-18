import { ExerciseModule, BlockResult } from './contract';

const awColorDriftModule: ExerciseModule = {
  manifest: {
    id: 'aw-color-drift',
    name: 'Цветовой дрейф',
    domain: 'attention',
    skills: ['sustained_attention', 'reaction_speed'] as any,
    metricModel: 'speed-accuracy',
    instruction: 'Нажимайте на круг, когда он меняет цвет. Игнорируйте плавные изменения.'
  },
  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let startTime = performance.now();

    el.innerHTML = `
      <style>
        .aw-drift-container { display:flex; justify-content:center; align-items:center; height:100%; }
        .aw-drift-circle { width:150px; height:150px; border-radius:50%; background: #3498db; cursor:pointer; transition: background 0.3s; }
      </style>
      <div class="aw-drift-container">
        <div id="aw-drift-circle" class="aw-drift-circle"></div>
      </div>
    `;

    const circle = el.querySelector('#aw-drift-circle') as HTMLElement;
    
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f'];
    let currentColorIndex = 0;

    const changeColor = () => {
      if (isGameOver) return;
      currentColorIndex = (currentColorIndex + 1) % colors.length;
      circle.style.background = colors[currentColorIndex];
      startTime = performance.now();
      
      setTimeout(changeColor, 2000 - level * 50);
    };

    setTimeout(changeColor, 1500);

    circle.onclick = () => {
      if (isGameOver) return;
      rounds++;
      correct++;
      rts.push(performance.now() - startTime);
      if (rounds >= 5 || isTimeUp()) {
        endBlock();
      }
    };

    const checkTime = setInterval(() => {
      if (isTimeUp() && !isGameOver) {
        endBlock();
      }
    }, 500);

    const endBlock = () => {
      isGameOver = true;
      clearInterval(checkTime);
      onEnd({
        rounds,
        accuracy: rounds > 0 ? correct / rounds : 0,
        avgRtMs: rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length : 500
      });
    };

    return () => {
      isGameOver = true;
      clearInterval(checkTime);
    };
  }
};

export default awColorDriftModule;
