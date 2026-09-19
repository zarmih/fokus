import { ExerciseModule, BlockResult } from './contract';

const COLORS = [
  { name: 'КРАСНЫЙ', hex: '#E53935' },
  { name: 'СИНИЙ', hex: '#1E88E5' },
  { name: 'ЗЕЛЁНЫЙ', hex: '#43A047' },
  { name: 'ЖЁЛТЫЙ', hex: '#FDD835' },
  { name: 'ФИОЛЕТОВЫЙ', hex: '#8E24AA' }
];

const POSITIONS = ['ВЕРХ', 'СРЕДИНА', 'НИЗ'];

const colorBandModule: ExerciseModule = {
  manifest: {
    id: 'color-band',
    name: 'Цветовые полосы',
    domain: 'flexibility',
    skills: ['selective_attention', 'inhibition', 'task_switching'],
    metricModel: 'speed-accuracy',
    instruction: 'Прочитайте слово и укажите цвет соответствующей полосы (ВЕРХ, СРЕДИНА или НИЗ), игнорируя цвет самого текста. Используйте цифры 1-4 или мышь.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cb-arena { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 40px; }
        .cb-bands { display: flex; flex-direction: column; width: 80%; max-width: 400px; height: 240px; border: 4px solid var(--line); border-radius: 12px; overflow: hidden; position: relative; }
        .cb-band { flex: 1; width: 100%; }
        .cb-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 48px; font-weight: 900; text-shadow: 2px 2px 4px rgba(0,0,0,0.8), -2px -2px 4px rgba(0,0,0,0.8); z-index: 2; pointer-events: none; margin: 0; }
        .cb-options { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; width: 100%; max-width: 600px; }
        .cb-btn { width: 100px; height: 80px; border-radius: 12px; border: 4px solid var(--line); cursor: pointer; user-select: none; transition: transform 0.1s; }
        .cb-btn:active { transform: scale(0.9); }
      </style>
      <div class="cb-arena">
        <div class="cb-bands">
          <div class="cb-band" id="cb-band-0"></div>
          <div class="cb-band" id="cb-band-1"></div>
          <div class="cb-band" id="cb-band-2"></div>
          <div class="cb-text" id="cb-text"></div>
        </div>
        <div class="cb-options" id="cb-options"></div>
      </div>
    `;

    const bands = [
      el.querySelector('#cb-band-0') as HTMLElement,
      el.querySelector('#cb-band-1') as HTMLElement,
      el.querySelector('#cb-band-2') as HTMLElement
    ];
    const textEl = el.querySelector('#cb-text') as HTMLElement;
    const optionsEl = el.querySelector('#cb-options') as HTMLElement;

    let t0 = 0;
    let currentAnswerHex = '';

    const generateTask = () => {
      if (isGameOver) return;
      if (isTimeUp()) { endBlock(); return; }

      const availableColors = [...COLORS].sort(() => Math.random() - 0.5);
      const bandColors = availableColors.slice(0, 3);
      
      bands[0].style.backgroundColor = bandColors[0].hex;
      bands[1].style.backgroundColor = bandColors[1].hex;
      bands[2].style.backgroundColor = bandColors[2].hex;

      const targetPosIndex = Math.floor(Math.random() * 3);
      const targetWord = POSITIONS[targetPosIndex];
      currentAnswerHex = bandColors[targetPosIndex].hex;

      const textColorIndex = Math.floor(Math.random() * COLORS.length);
      
      textEl.textContent = targetWord;
      textEl.style.color = COLORS[textColorIndex].hex;
      
      const optionsArr = availableColors.slice(0, 4);
      if (!optionsArr.find(c => c.hex === currentAnswerHex)) {
        optionsArr[3] = COLORS.find(c => c.hex === currentAnswerHex)!;
      }
      optionsArr.sort(() => Math.random() - 0.5);

      optionsEl.innerHTML = '';
      optionsArr.forEach((opt, idx) => {
        const btn = document.createElement('div');
        btn.className = 'cb-btn';
        btn.style.backgroundColor = opt.hex;
        btn.onclick = () => handleHit(opt.hex);
        optionsEl.appendChild(btn);
      });

      t0 = performance.now();
    };

    const handleHit = (hex: string) => {
      if (isGameOver) return;
      rounds++;
      rts.push(performance.now() - t0);
      if (hex === currentAnswerHex) correct++;
      generateTask();
    };

    const onKey = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < optionsEl.children.length) {
        const btn = optionsEl.children[idx] as HTMLElement;
        btn.click();
      }
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

export default colorBandModule;
