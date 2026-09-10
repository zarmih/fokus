import { ExerciseModule, BlockResult } from './contract';

const emotionMatchModule: ExerciseModule = {
  manifest: {
    id: 'emotion-match',
    name: 'Эмоции',
    domain: 'attention',
    skills: ['selective_attention', 'processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Если эмоция на лице совпадает с текстом — нажмите "Да". Иначе — "Нет".'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .em-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 40px;
        }
        .em-face {
          font-size: 120px;
          line-height: 1;
        }
        .em-word {
          font-size: 48px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .em-controls {
          display: flex;
          gap: 40px;
          width: 100%;
          justify-content: center;
          margin-top: 20px;
        }
        .em-btn {
          width: 140px;
          height: 80px;
          font-size: 32px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
          transition: transform 0.1s, border-color 0.2s;
        }
        .em-btn:active { transform: scale(0.95); }
      </style>
      <div class="em-arena">
        <div class="em-face" id="em-face"></div>
        <div class="em-word" id="em-word"></div>
        <div class="em-controls">
          <button class="em-btn" id="em-btn-yes">Да</button>
          <button class="em-btn" id="em-btn-no">Нет</button>
        </div>
      </div>
    `;

    const faceEl = el.querySelector('#em-face') as HTMLElement;
    const wordEl = el.querySelector('#em-word') as HTMLElement;
    const btnYes = el.querySelector('#em-btn-yes') as HTMLElement;
    const btnNo = el.querySelector('#em-btn-no') as HTMLElement;

    const emotions = [
      { text: 'РАДОСТЬ', icon: '😄' },
      { text: 'ГРУСТЬ', icon: '😢' },
      { text: 'ГНЕВ', icon: '😠' },
      { text: 'УДИВЛЕНИЕ', icon: '😲' },
      { text: 'СТРАХ', icon: '😨' }
    ];

    let t0 = performance.now();
    let phase = 'input';
    let targetIsMatch = false;

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      targetIsMatch = Math.random() > 0.5;

      const baseIdx = Math.floor(Math.random() * emotions.length);
      const baseEmotion = emotions[baseIdx];

      let faceIcon = baseEmotion.icon;
      let wordText = baseEmotion.text;

      if (!targetIsMatch) {
        let otherIdx = Math.floor(Math.random() * emotions.length);
        while (otherIdx === baseIdx) {
          otherIdx = Math.floor(Math.random() * emotions.length);
        }
        
        if (Math.random() > 0.5) {
          faceIcon = emotions[otherIdx].icon;
        } else {
          wordText = emotions[otherIdx].text;
        }
      }

      faceEl.textContent = faceIcon;
      wordEl.textContent = wordText;

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
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default emotionMatchModule;
