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
      <div class="switch-rule-board" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; width: 100%;">
        <div class="rule-label" style="font-size: 24px; font-weight: 700; color: var(--accent); margin-bottom: 40px; text-align: center; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${ruleLabel}</div>
        
        <div class="cards-container" style="display: flex; gap: 24px; margin-bottom: 48px; width: 100%; max-width: 360px;">
          <div class="card-left" style="flex: 1; display: flex; flex-direction: column; align-items: center; background: var(--surface-2); padding: 32px 16px; border-radius: 20px; box-shadow: var(--shadow-sm); border: 1px solid rgba(255,255,255,0.05);">
            <div style="font-size: 64px; font-weight: 900; color: var(--text);">${trial.left}</div>
            <div style="font-size: 14px; font-weight: 600; color: var(--muted); margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;">Левое</div>
          </div>
          <div class="card-right" style="flex: 1; display: flex; flex-direction: column; align-items: center; background: var(--surface-2); padding: 32px 16px; border-radius: 20px; box-shadow: var(--shadow-sm); border: 1px solid rgba(255,255,255,0.05); ${trial.rule === 'EVEN' ? 'opacity: 0.25; filter: grayscale(100%);' : ''}">
            <div style="font-size: 64px; font-weight: 900; color: var(--text);">${trial.right}</div>
            <div style="font-size: 14px; font-weight: 600; color: var(--muted); margin-top: 12px; text-transform: uppercase; letter-spacing: 1px;">Правое</div>
          </div>
        </div>

        <div class="options" style="display: flex; gap: 24px; width: 100%; max-width: 360px;">
          <button class="sr-btn" data-choice="true" style="flex: 1; background: linear-gradient(135deg, var(--ok) 0%, #059669 100%); font-size: 24px; font-weight: 800; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">Да</button>
          <button class="sr-btn" data-choice="false" style="flex: 1; background: linear-gradient(135deg, var(--danger) 0%, #dc2626 100%); font-size: 24px; font-weight: 800; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">Нет</button>
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
