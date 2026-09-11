import { ExerciseManifest, ExerciseModule, BlockResult } from '../contract';
import { mountStage } from '../stage';

export const manifest: ExerciseManifest = {
  id: 'paradox-engine',
  name: 'Двигатель парадоксов',
  domain: 'flexibility',
  skills: ['inhibition', 'rule_switching', 'cognitive_flexibility'],
  metricModel: 'speed-accuracy',
  instruction: 'Оцени, подходит ли свойство к объекту (Верно/Неверно). Если фон красный — отвечай наоборот!'
};

const PAIRS = [
  { obj: 'Слон', prop: 'Тяжелый', match: true },
  { obj: 'Мышь', prop: 'Огромная', match: false },
  { obj: 'Огонь', prop: 'Горячий', match: true },
  { obj: 'Лед', prop: 'Теплый', match: false },
  { obj: 'Камень', prop: 'Твердый', match: true },
  { obj: 'Вода', prop: 'Сухая', match: false },
  { obj: 'Небо', prop: 'Синее', match: true },
  { obj: 'Трава', prop: 'Красная', match: false },
  { obj: 'Черепаха', prop: 'Медленная', match: true },
  { obj: 'Гепард', prop: 'Медленный', match: false },
  { obj: 'Солнце', prop: 'Яркое', match: true },
  { obj: 'Снег', prop: 'Черный', match: false }
];

export function render(
  container: HTMLElement,
  level: number,
  onEnd: (r: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const stage = mountStage(container, 'flexibility');
  let rounds = 0;
  let totalAccuracy = 0;
  let totalRt = 0;
  let timers: number[] = [];
  let isParadox = false;
  let currentPair = PAIRS[0];
  let roundStartTime = Date.now();

  const startRound = () => {
    if (isTimeUp()) {
      finish();
      return;
    }
    
    currentPair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
    
    // Probability of paradox increases with level, max 50%
    const paradoxProb = Math.min(0.1 + (level * 0.04), 0.5);
    isParadox = Math.random() < paradoxProb;

    stage.setStatus(isParadox ? 'ОТВЕЧАЙ НАОБОРОТ!' : 'ВЕРНО ЛИ?');
    
    stage.board.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%; background: ${isParadox ? '#7f1d1d' : 'transparent'}; border-radius: 12px; transition: background 0.3s;">
        <div style="font-size: 32px; margin-bottom: 20px;">${currentPair.obj} ➡️ ${currentPair.prop}</div>
        <div style="display: flex; gap: 20px;">
          <button id="btn-true" style="padding: 15px 30px; font-size: 18px; background: #10b981; border: none; border-radius: 8px; color: white; cursor: pointer;">Верно</button>
          <button id="btn-false" style="padding: 15px 30px; font-size: 18px; background: #ef4444; border: none; border-radius: 8px; color: white; cursor: pointer;">Неверно</button>
        </div>
      </div>
    `;

    roundStartTime = Date.now();

    const handleAnswer = (answerIsTrue: boolean) => {
      const rt = Date.now() - roundStartTime;
      const expected = isParadox ? !currentPair.match : currentPair.match;
      const correct = answerIsTrue === expected;
      
      const acc = correct ? 1 : 0;
      totalAccuracy += acc;
      totalRt += rt;
      rounds++;
      
      stage.pulse(correct);

      const btnTrue = stage.board.querySelector('#btn-true') as HTMLButtonElement;
      const btnFalse = stage.board.querySelector('#btn-false') as HTMLButtonElement;
      if (btnTrue) btnTrue.disabled = true;
      if (btnFalse) btnFalse.disabled = true;

      timers.push(window.setTimeout(() => startRound(), 600));
    };

    const btnTrue = stage.board.querySelector('#btn-true') as HTMLButtonElement;
    const btnFalse = stage.board.querySelector('#btn-false') as HTMLButtonElement;

    if (btnTrue) btnTrue.addEventListener('click', () => handleAnswer(true));
    if (btnFalse) btnFalse.addEventListener('click', () => handleAnswer(false));
  };

  const finish = () => {
    stage.cleanup();
    onEnd({
      accuracy: rounds > 0 ? totalAccuracy / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => {
    timers.forEach(clearTimeout);
    stage.cleanup();
  };
}

export const paradoxEngineModule: ExerciseModule = {
  manifest,
  render
};
export default paradoxEngineModule;
