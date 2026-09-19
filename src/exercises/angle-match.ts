import { ExerciseModule, BlockResult } from './contract';

const angleMatchModule: ExerciseModule = {
  manifest: {
    id: 'angle-match',
    name: 'Сравнение углов',
    domain: 'logic',
    skills: ['spatial_reasoning', 'pattern_recognition'],
    metricModel: 'speed-accuracy',
    instruction: 'Сравните углы между линиями в двух кругах. Если углы одинаковые (независимо от поворота), нажмите "Равны", иначе "Разные". Используйте стрелки Влево (Равны) и Вправо (Разные).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .am-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 40px; }
        .am-circles { display: flex; gap: 40px; justify-content: center; width: 100%; }
        .am-circle { width: 140px; height: 140px; border-radius: 50%; border: 4px solid var(--text); position: relative; background: var(--surface); }
        .am-line { position: absolute; width: 50%; height: 4px; background: var(--text); top: 50%; left: 50%; transform-origin: 0% 50%; margin-top: -2px; }
        .am-options { display: flex; gap: 20px; }
        .am-btn { padding: 16px 32px; font-size: 24px; font-weight: bold; border-radius: 12px; background: var(--surface); border: 2px solid var(--line); cursor: pointer; user-select: none; color: var(--text); }
        .am-btn:active { transform: scale(0.95); }
      </style>
      <div class="am-arena">
        <div class="am-circles">
          <div class="am-circle" id="am-left"></div>
          <div class="am-circle" id="am-right"></div>
        </div>
        <div class="am-options">
          <button class="am-btn" id="am-btn-same">Равны (←)</button>
          <button class="am-btn" id="am-btn-diff">Разные (→)</button>
        </div>
      </div>
    `;

    const leftCircle = el.querySelector('#am-left') as HTMLElement;
    const rightCircle = el.querySelector('#am-right') as HTMLElement;
    const btnSame = el.querySelector('#am-btn-same') as HTMLElement;
    const btnDiff = el.querySelector('#am-btn-diff') as HTMLElement;

    let t0 = 0;
    let currentIsSame = false;

    const drawCircle = (container: HTMLElement, angle1: number, angle2: number) => {
      container.innerHTML = `
        <div class="am-line" style="transform: rotate(${angle1}deg)"></div>
        <div class="am-line" style="transform: rotate(${angle2}deg)"></div>
      `;
    };

    const generateTask = () => {
      if (isGameOver) return;
      if (isTimeUp()) { endBlock(); return; }

      currentIsSame = Math.random() > 0.5;
      
      const angleDelta = Math.floor(Math.random() * 12 + 2) * 15;
      const rot1 = Math.floor(Math.random() * 36) * 10;
      
      drawCircle(leftCircle, rot1, rot1 + angleDelta);
      
      const rot2 = Math.floor(Math.random() * 36) * 10;
      let angleDelta2 = angleDelta;
      if (!currentIsSame) {
        let diff = (Math.floor(Math.random() * 4) + 1) * 15;
        diff *= Math.random() > 0.5 ? 1 : -1;
        angleDelta2 = angleDelta + diff;
        if (angleDelta2 <= 15) angleDelta2 = 15;
      }
      
      drawCircle(rightCircle, rot2, rot2 + angleDelta2);
      
      t0 = performance.now();
    };

    const handleHit = (isSame: boolean) => {
      if (isGameOver) return;
      rounds++;
      rts.push(performance.now() - t0);
      if (isSame === currentIsSame) correct++;
      generateTask();
    };

    btnSame.onclick = () => handleHit(true);
    btnDiff.onclick = () => handleHit(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleHit(true);
      if (e.key === 'ArrowRight') handleHit(false);
    };
    window.addEventListener('keydown', onKey);

    generateTask();

    const endBlock = () => {
      isGameOver = true;
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1500;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default angleMatchModule;
