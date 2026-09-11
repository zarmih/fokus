import { ExerciseModule, BlockResult } from './contract';

const sparkLaneModule: ExerciseModule = {
  manifest: {
    id: 'spark-lane',
    name: 'Искра',
    domain: 'attention',
    skills: ['sustained_attention', 'reaction_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Ждите вспышку (искру) в одной из полос и быстро нажимайте на эту полосу. Игнорируйте тусклые отвлекающие вспышки.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    const numLanes = level > 5 ? 5 : (level > 2 ? 4 : 3);
    const sparkDuration = Math.max(200, 600 - level * 50);
    const maxIsi = Math.max(500, 2000 - level * 150);

    el.innerHTML = `
      <style>
        .sl-arena {
          display: flex;
          align-items: stretch;
          justify-content: center;
          height: 100%;
          padding: 20px;
          gap: 12px;
          box-sizing: border-box;
        }
        .sl-lane {
          flex: 1;
          max-width: 100px;
          background: var(--surface);
          border: 2px solid var(--line);
          border-radius: 12px;
          position: relative;
          cursor: pointer;
          overflow: hidden;
          transition: border-color 0.1s, transform 0.1s;
        }
        .sl-lane:active {
          transform: scale(0.98);
        }
        .sl-spark {
          position: absolute;
          left: 0; right: 0; top: 0; bottom: 0;
          background: var(--accent);
          opacity: 0;
          transition: opacity 0.05s;
        }
        .sl-distractor {
          position: absolute;
          left: 0; right: 0; top: 0; bottom: 0;
          background: var(--text);
          opacity: 0;
          transition: opacity 0.05s;
        }
      </style>
      <div class="sl-arena" id="sl-arena">
        ${Array.from({length: numLanes}).map((_, i) => `
          <div class="sl-lane" data-idx="${i}">
            <div class="sl-spark"></div>
            <div class="sl-distractor"></div>
          </div>
        `).join('')}
      </div>
    `;

    const arena = el.querySelector('#sl-arena') as HTMLElement;
    const lanes = Array.from(arena.querySelectorAll('.sl-lane')) as HTMLElement[];
    
    let activeLane = -1;
    let t0 = 0;
    let sparkTimeout: any = null;
    let distractorTimeout: any = null;
    let roundTimeout: any = null;

    const scheduleNext = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      activeLane = -1;
      const isi = 300 + Math.random() * maxIsi;
      roundTimeout = setTimeout(showSpark, isi);
      
      if (level > 1 && Math.random() > 0.5) {
        const dDelay = isi * Math.random() * 0.8;
        distractorTimeout = setTimeout(showDistractor, dDelay);
      }
    };

    const showDistractor = () => {
      if (isGameOver || activeLane !== -1) return;
      const idx = Math.floor(Math.random() * numLanes);
      const distEl = lanes[idx].querySelector('.sl-distractor') as HTMLElement;
      distEl.style.opacity = '0.2';
      setTimeout(() => {
        if (!isGameOver) distEl.style.opacity = '0';
      }, sparkDuration * 0.8);
    };

    const showSpark = () => {
      if (isGameOver) return;
      activeLane = Math.floor(Math.random() * numLanes);
      const sparkEl = lanes[activeLane].querySelector('.sl-spark') as HTMLElement;
      sparkEl.style.opacity = '1';
      t0 = performance.now();

      sparkTimeout = setTimeout(() => {
        if (activeLane !== -1) {
          // Missed
          sparkEl.style.opacity = '0';
          lanes[activeLane].style.borderColor = 'var(--danger)';
          setTimeout(() => { if(!isGameOver) lanes[activeLane].style.borderColor = 'var(--line)'; }, 200);
          rounds++;
          activeLane = -1;
          scheduleNext();
        }
      }, sparkDuration);
    };

    const handleTap = (idx: number) => {
      if (isGameOver) return;
      if (activeLane === idx) {
        // Correct
        const rt = performance.now() - t0;
        rts.push(rt);
        correct++;
        rounds++;
        clearTimeout(sparkTimeout);
        const sparkEl = lanes[activeLane].querySelector('.sl-spark') as HTMLElement;
        sparkEl.style.opacity = '0';
        lanes[activeLane].style.borderColor = 'var(--ok)';
        setTimeout(() => { if(!isGameOver) lanes[activeLane].style.borderColor = 'var(--line)'; }, 200);
        activeLane = -1;
        scheduleNext();
      } else {
        // False tap
        if (activeLane !== -1) {
          clearTimeout(sparkTimeout);
          const sparkEl = lanes[activeLane].querySelector('.sl-spark') as HTMLElement;
          sparkEl.style.opacity = '0';
          activeLane = -1;
        }
        rounds++;
        lanes[idx].style.borderColor = 'var(--danger)';
        setTimeout(() => { if(!isGameOver) lanes[idx].style.borderColor = 'var(--line)'; }, 200);
        scheduleNext();
      }
    };

    lanes.forEach((lane, i) => {
      lane.onpointerdown = (e) => {
        e.preventDefault();
        handleTap(i);
      };
    });

    const onKey = (e: KeyboardEvent) => {
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < numLanes) {
        handleTap(idx);
      }
    };
    window.addEventListener('keydown', onKey);

    scheduleNext();

    const endBlock = () => {
      isGameOver = true;
      clearTimeout(sparkTimeout);
      clearTimeout(distractorTimeout);
      clearTimeout(roundTimeout);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return endBlock;
  }
};

export default sparkLaneModule;
