import { ExerciseModule, BlockResult } from './contract';

const clockReadingModule: ExerciseModule = {
  manifest: {
    id: 'clock-reading',
    name: 'Время',
    domain: 'logic',
    skills: ['logical_reasoning', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Если время на циферблате совпадает с цифровым — нажмите "Да". Иначе — "Нет".'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .cr-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .cr-clock {
          position: relative;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          border: 6px solid var(--text);
          background: var(--surface);
        }
        .cr-hand {
          position: absolute;
          bottom: 50%;
          left: 50%;
          transform-origin: bottom center;
          background: var(--text);
          border-radius: 4px;
        }
        .cr-hour {
          width: 6px;
          height: 40px;
          margin-left: -3px;
        }
        .cr-minute {
          width: 4px;
          height: 60px;
          margin-left: -2px;
          background: var(--accent);
        }
        .cr-digital {
          font-size: 48px;
          font-weight: bold;
          font-family: monospace;
          letter-spacing: 4px;
        }
        .cr-controls {
          display: flex;
          gap: 40px;
          width: 100%;
          justify-content: center;
        }
        .cr-btn {
          width: 120px;
          height: 80px;
          font-size: 28px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .cr-btn:active { transform: scale(0.95); }
      </style>
      <div class="cr-arena">
        <div class="cr-clock">
          <div class="cr-hand cr-hour" id="cr-hour"></div>
          <div class="cr-hand cr-minute" id="cr-minute"></div>
        </div>
        <div class="cr-digital" id="cr-digital"></div>
        <div class="cr-controls">
          <button class="cr-btn" id="cr-yes">Да</button>
          <button class="cr-btn" id="cr-no">Нет</button>
        </div>
      </div>
    `;

    const hourHand = el.querySelector('#cr-hour') as HTMLElement;
    const minHand = el.querySelector('#cr-minute') as HTMLElement;
    const digitalEl = el.querySelector('#cr-digital') as HTMLElement;
    const btnYes = el.querySelector('#cr-yes') as HTMLElement;
    const btnNo = el.querySelector('#cr-no') as HTMLElement;

    let t0 = performance.now();
    let phase = 'input';
    let targetIsMatch = false;

    const pad = (n: number) => n.toString().padStart(2, '0');

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      targetIsMatch = Math.random() > 0.5;

      const trueHour = Math.floor(Math.random() * 12);
      // easy: multiples of 15, hard: multiples of 5
      const minStep = level > 4 ? 5 : 15;
      const trueMin = Math.floor(Math.random() * (60 / minStep)) * minStep;

      let dispHour = trueHour;
      let dispMin = trueMin;

      if (!targetIsMatch) {
        if (Math.random() > 0.5) {
          dispHour = (dispHour + Math.floor(Math.random() * 4) + 1) % 12;
        } else {
          dispMin = (dispMin + 15) % 60;
        }
      }

      // Display digital
      const hDisplay = dispHour === 0 ? 12 : dispHour;
      digitalEl.textContent = `${pad(hDisplay)}:${pad(dispMin)}`;

      // Draw hands for true time
      const minAngle = trueMin * 6; // 360 / 60
      const hourAngle = (trueHour * 30) + (trueMin * 0.5); // 360/12 + 30*(m/60)

      hourHand.style.transform = `rotate(${hourAngle}deg)`;
      minHand.style.transform = `rotate(${minAngle}deg)`;

      btnYes.style.borderColor = 'var(--line)';
      btnNo.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (ansIsMatch: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      const isCorrect = ansIsMatch === targetIsMatch;

      if (isCorrect) {
        correct++;
        if (ansIsMatch) btnYes.style.borderColor = 'var(--ok)';
        else btnNo.style.borderColor = 'var(--ok)';
      } else {
        if (ansIsMatch) btnYes.style.borderColor = 'var(--danger)';
        else btnNo.style.borderColor = 'var(--danger)';
      }

      setTimeout(startRound, 400);
    };

    btnYes.onclick = () => handleAns(true);
    btnNo.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') handleAns(true);
      if (e.code === 'ArrowRight') handleAns(false);
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

export default clockReadingModule;
