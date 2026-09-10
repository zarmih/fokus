import { ExerciseModule, BlockResult } from './contract';

const rapidSortingModule: ExerciseModule = {
  manifest: {
    id: 'rapid-sorting',
    name: 'Живое-Неживое',
    domain: 'speed',
    skills: ['reaction_speed', 'cognitive_flexibility'],
    metricModel: 'speed-accuracy',
    instruction: 'Распределите объекты по категориям ЖИВОЕ (слева) или НЕЖИВОЕ (справа) как можно быстрее.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;

    el.innerHTML = `
      <style>
        .rsort-arena {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 60px;
        }
        .rsort-card {
          font-size: 100px;
          width: 160px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border-radius: 32px;
          border: 4px solid var(--line);
          transition: transform 0.1s;
        }
        .rsort-controls {
          display: flex;
          gap: 60px;
          width: 100%;
          justify-content: center;
        }
        .rsort-btn {
          width: 160px;
          height: 80px;
          font-size: 20px;
          font-weight: bold;
          border-radius: 16px;
          background: var(--surface);
          border: 2px solid var(--line);
          cursor: pointer;
        }
        .rsort-btn:active { transform: scale(0.95); }
      </style>
      <div class="rsort-arena">
        <div class="rsort-card" id="rsort-card"></div>
        <div class="rsort-controls">
          <button class="rsort-btn" id="rsort-left">Живое (←)</button>
          <button class="rsort-btn" id="rsort-right">Неживое (→)</button>
        </div>
      </div>
    `;

    const card = el.querySelector('#rsort-card') as HTMLElement;
    const btnLeft = el.querySelector('#rsort-left') as HTMLElement;
    const btnRight = el.querySelector('#rsort-right') as HTMLElement;

    let t0 = performance.now();
    let isAliveAns = true;
    let phase = 'input';

    const alive = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿','🦔'];
    const notAlive = ['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🚚','🚛','🚜','🛴','🚲','🛵','🏍','🛺','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈','🛫','🛬','🛩','💺','🛰','🚀','🛸','🚁','🛶','⛵','🚤','🛥','🛳','⛴','🚢','⚓','⛽','🚧','🚦','🚥','🚏','🗺','🗿','🗽','🗼','🏰','🏯','🏟','🎡','🎢','🎠','⛲','⛱','🏖','🏝','🏜','🌋','⛰','🏔','🗻','🏕','⛺','🏠','🏡','🏘','🏚','🏗','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛','⛪','🕌','🕍','🛕','🕋','⛩','🛤','🛣','🗾','🎑','🏞','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙','🌃','🌌','🌉','🌁'];

    const startRound = () => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }

      phase = 'input';
      
      isAliveAns = Math.random() > 0.5;
      const targetArr = isAliveAns ? alive : notAlive;
      const symbol = targetArr[Math.floor(Math.random() * targetArr.length)];

      card.textContent = symbol;
      card.style.borderColor = 'var(--line)';

      t0 = performance.now();
    };

    const handleAns = (ansIsAlive: boolean) => {
      if (phase !== 'input' || isGameOver) return;
      phase = 'anim';
      rounds++;
      rts.push(performance.now() - t0);

      if (ansIsAlive === isAliveAns) {
        correct++;
        card.style.borderColor = 'var(--ok)';
        card.style.transform = ansIsAlive ? 'translateX(-30px)' : 'translateX(30px)';
      } else {
        card.style.borderColor = 'var(--danger)';
        card.style.transform = 'translateY(20px)';
      }

      setTimeout(() => {
        card.style.transform = 'none';
        startRound();
      }, 150);
    };

    btnLeft.onclick = () => handleAns(true);
    btnRight.onclick = () => handleAns(false);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleAns(true);
      if (e.key === 'ArrowRight') handleAns(false);
    };
    window.addEventListener('keydown', onKey);

    startRound();

    const endBlock = () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? correct / rounds : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 800;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default rapidSortingModule;
