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
    
    const ruleLabel = trial.rule === 'EVEN' ? 'Левое число чётное?' : 'Левое больше правого?';
    
    container.innerHTML = `
      <div class="switch-rule-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
        <div class="rule-label" style="font-size: 24px; color: var(--accent); margin-bottom: 32px; text-align: center;">${ruleLabel}</div>
        
        <div class="cards-container" style="display: flex; gap: 24px; margin-bottom: 48px;">
          <div class="card-left" style="display: flex; flex-direction: column; align-items: center; background: var(--surface-2); padding: 24px; border-radius: 16px; min-width: 120px;">
            <div style="font-size: 64px; font-weight: bold; color: var(--text);">${trial.left}</div>
            <div style="font-size: 14px; color: var(--muted); margin-top: 8px; text-transform: uppercase;">Левое</div>
          </div>
          <div class="card-right" style="display: flex; flex-direction: column; align-items: center; background: var(--surface-2); padding: 24px; border-radius: 16px; min-width: 120px; ${trial.rule === 'EVEN' ? 'opacity: 0.35;' : ''}">
            <div style="font-size: 64px; font-weight: bold; color: var(--text);">${trial.right}</div>
            <div style="font-size: 14px; color: var(--muted); margin-top: 8px; text-transform: uppercase;">Правое</div>
          </div>
        </div>

        <div class="options" style="display: flex; gap: 20px;">
          <button class="btn-primary sr-btn" data-choice="true" style="padding: 16px 40px; font-size: 24px;">Да</button>
          <button class="btn-secondary sr-btn" data-choice="false" style="padding: 16px 40px; font-size: 24px;">Нет</button>
        </div>
      </div>
    `;

    const finishRound = (choice: boolean | null, rt: number) => {
      clearTimeout(currentTimer);
      const correct = engine.submit(choice, trial.correctYes);
      if (correct) correctCount++;
      totalRt += rt;
      rounds++;

      const board = container.querySelector('.switch-rule-board') as HTMLElement;
      if (board) {
        board.style.backgroundColor = correct ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)';
        board.style.borderRadius = '16px';
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
    const onClick = (btn: HTMLElement) => {
      if ((btn as HTMLButtonElement).disabled) return;
      const choice = btn.dataset.choice === 'true';
      document.removeEventListener('keydown', onKey);
      finishRound(choice, Date.now() - roundStartTime);
    };

    btns.forEach(btn => {
      btn.addEventListener('click', () => onClick(btn as HTMLElement));
    });

    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'y' || key === 'д' || key === 'arrowleft') {
        onClick(container.querySelector('[data-choice="true"]') as HTMLElement);
      } else if (key === 'n' || key === 'н' || key === 'arrowright') {
        onClick(container.querySelector('[data-choice="false"]') as HTMLElement);
      }
    };
    document.addEventListener('keydown', onKey);
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
