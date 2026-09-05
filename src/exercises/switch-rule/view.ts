import { SwitchRuleEngine } from './engine';
import { getSwitchRuleParams } from './manifest';

export function renderSwitchRule(
  container: HTMLElement, 
  level: number, 
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new SwitchRuleEngine();
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 8;
  
  let currentTimer: any;

  const startRound = () => {
    if (isTimeUp()) {
      finishBlock();
      return;
    }
    
    const params = getSwitchRuleParams(level);
    const trial = engine.nextTrial(params);
    const roundStartTime = Date.now();
    
    const ruleLabel = trial.rule === 'EVEN' ? 'Первое чётное?' : 'Первое больше?';
    
    container.innerHTML = `
      <div class="switch-rule-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div class="rule-label" style="font-size: 24px; color: #e8b86d; margin-bottom: 20px;">${ruleLabel}</div>
        <div class="numbers" style="font-size: 56px; font-weight: bold; margin-bottom: 40px; letter-spacing: 20px;">
          ${trial.n1} ${trial.n2}
        </div>
        <div class="options" style="display: flex; gap: 20px;">
          <button class="btn-primary sr-btn" data-choice="true" style="padding: 16px 40px; font-size: 24px;">Да</button>
          <button class="btn-secondary sr-btn" data-choice="false" style="padding: 16px 40px; font-size: 24px;">Нет</button>
        </div>
      </div>
    `;

    const finishRound = (choice: boolean | null, rt: number) => {
      clearTimeout(currentTimer);
      const correct = engine.submit(choice, trial.answer);
      if (correct) correctCount++;
      totalRt += rt;
      rounds++;

      const numsEl = container.querySelector('.numbers') as HTMLElement;
      if (numsEl) {
        numsEl.style.color = correct ? '#4caf50' : '#f44336';
      }
      
      const btns = container.querySelectorAll('.sr-btn');
      btns.forEach(b => (b as HTMLButtonElement).disabled = true);

      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) {
          finishBlock();
        } else {
          startRound();
        }
      }, 500);
    };

    currentTimer = setTimeout(() => {
      finishRound(null, params.deadlineMs);
    }, params.deadlineMs);

    const btns = container.querySelectorAll('.sr-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const choice = (btn as HTMLElement).dataset.choice === 'true';
        finishRound(choice, Date.now() - roundStartTime);
      });
    });
  };

  const finishBlock = () => {
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
}
