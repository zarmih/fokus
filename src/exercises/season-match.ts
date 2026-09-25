import { ExerciseModule, BlockResult } from './contract';

const MONTHS = [
  { name: 'Январь', season: 'winter' },
  { name: 'Февраль', season: 'winter' },
  { name: 'Декабрь', season: 'winter' },
  { name: 'Март', season: 'spring' },
  { name: 'Апрель', season: 'spring' },
  { name: 'Май', season: 'spring' },
  { name: 'Июнь', season: 'summer' },
  { name: 'Июль', season: 'summer' },
  { name: 'Август', season: 'summer' },
  { name: 'Сентябрь', season: 'autumn' },
  { name: 'Октябрь', season: 'autumn' },
  { name: 'Ноябрь', season: 'autumn' }
];

const seasonMatchModule: ExerciseModule = {
  manifest: {
    id: 'season-match',
    name: 'Сезоны',
    domain: 'memory',
    skills: ['recall', 'working_memory'],
    metricModel: 'speed-accuracy',
    instruction: 'Определите, к какому времени года относится месяц. (Вверх - Зима, Вправо - Весна, Вниз - Лето, Влево - Осень).'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .sm-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .sm-target {
          font-size: 64px;
          font-weight: bold;
          text-align: center;
        }
        .sm-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .sm-btn {
          padding: 20px;
          font-size: 24px;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .sm-btn:active { transform: scale(0.95); }
      </style>
      <div class="sm-arena">
        <div class="sm-target" id="sm-target"></div>
        <div class="sm-grid">
          <button class="sm-btn" id="sm-winter">Зима (Вверх)</button>
          <button class="sm-btn" id="sm-spring">Весна (Вправо)</button>
          <button class="sm-btn" id="sm-summer">Лето (Вниз)</button>
          <button class="sm-btn" id="sm-autumn">Осень (Влево)</button>
        </div>
      </div>
    `;

    const targetEl = el.querySelector('#sm-target') as HTMLElement;
    const btnWinter = el.querySelector('#sm-winter') as HTMLElement;
    const btnSpring = el.querySelector('#sm-spring') as HTMLElement;
    const btnSummer = el.querySelector('#sm-summer') as HTMLElement;
    const btnAutumn = el.querySelector('#sm-autumn') as HTMLElement;

    const btns = {
      winter: btnWinter,
      spring: btnSpring,
      summer: btnSummer,
      autumn: btnAutumn
    };

    let t0 = performance.now();
    let phase = 'input';
    let currentSeason = '';

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      const idx = Math.floor(Math.random() * MONTHS.length);
      const m = MONTHS[idx];
      currentSeason = m.season;
      targetEl.textContent = m.name;

      Object.values(btns).forEach(btn => btn.style.borderColor = 'var(--line)');
      t0 = performance.now();
    };

    const handleAns = (season: string) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = season === currentSeason;
      const btn = btns[season as keyof typeof btns];

      if (isCorrect) {
        correct++;
        btn.style.borderColor = 'var(--ok)';
      } else {
        btn.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnWinter.onclick = () => handleAns('winter');
    btnSpring.onclick = () => handleAns('spring');
    btnSummer.onclick = () => handleAns('summer');
    btnAutumn.onclick = () => handleAns('autumn');

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp') handleAns('winter');
      if (e.code === 'ArrowRight') handleAns('spring');
      if (e.code === 'ArrowDown') handleAns('summer');
      if (e.code === 'ArrowLeft') handleAns('autumn');
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default seasonMatchModule;
