import { SwitchRuleEngine } from './engine';
import { getSwitchRuleParams, switchRuleManifest } from './manifest';
import { elapsedProgress, paramsAlongCurve } from '../diff-curves';
import { mountStage } from '../stage';

export function renderSwitchRule(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new SwitchRuleEngine();
  const stage = mountStage(container, 'flexibility');
  let rounds = 0;
  let correctCount = 0;
  let totalRt = 0;
  const blockStartTime = Date.now();
  const maxBlockMs = 70000;
  const minRounds = 8;
  let currentTimer: number;
  let onKey: ((e: KeyboardEvent) => void) | null = null;

  const startRound = () => {
    if (isTimeUp()) { finishBlock(); return; }
    const { params } = paramsAlongCurve(getSwitchRuleParams, {
      target: level,
      t: elapsedProgress(Date.now() - blockStartTime, maxBlockMs),
      kind: switchRuleManifest.diffCurve
    });
    const trial = engine.nextTrial(params);
    const roundStartTime = Date.now();
    const ruleLabel = trial.rule === 'EVEN' ? 'Левое чётное?' : 'Левое больше?';
    stage.setStatus(ruleLabel);
    stage.board.innerHTML = `
      <div style="display:flex;gap:16px;margin-bottom:32px;width:100%;max-width:360px;perspective:700px">
        <div class="num-chip" style="flex:1;height:120px;font-size:48px;animation-delay:0s">${trial.left}</div>
        <div class="num-chip" style="flex:1;height:120px;font-size:48px;background:linear-gradient(180deg,#67e8f9,var(--dom-flexibility));box-shadow:0 10px 0 #0e7490,0 16px 24px rgba(0,0,0,.3);opacity:${trial.rule === 'EVEN' ? 0.28 : 1}">${trial.right}</div>
      </div>
      <div class="play-choice">
        <button class="sr-btn btn-primary" data-choice="true" style="background:linear-gradient(180deg,#34d399,var(--ok));margin:0">Да</button>
        <button class="sr-btn btn-primary" data-choice="false" style="background:linear-gradient(180deg,#f87171,var(--danger));margin:0">Нет</button>
      </div>
    `;

    const finishRound = (choice: boolean | null, rt: number) => {
      clearTimeout(currentTimer);
      if (onKey) document.removeEventListener('keydown', onKey);
      const correct = engine.submit(choice, trial.correctYes);
      if (correct) correctCount++;
      totalRt += rt;
      rounds++;
      stage.pulse(correct);
      stage.board.querySelectorAll('.sr-btn').forEach(b => (b as HTMLButtonElement).disabled = true);
      setTimeout(() => {
        const elapsed = Date.now() - blockStartTime;
        if (elapsed >= maxBlockMs && rounds >= minRounds) finishBlock();
        else startRound();
      }, 420);
    };

    currentTimer = window.setTimeout(() => finishRound(null, params.deadlineMs), params.deadlineMs);
    const click = (btn: HTMLElement) => {
      if ((btn as HTMLButtonElement).disabled) return;
      finishRound(btn.dataset.choice === 'true', Date.now() - roundStartTime);
    };
    stage.board.querySelectorAll('.sr-btn').forEach(btn => btn.addEventListener('click', () => click(btn as HTMLElement)));
    onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'y' || key === 'д' || key === 'arrowleft') click(stage.board.querySelector('[data-choice="true"]') as HTMLElement);
      else if (key === 'n' || key === 'н' || key === 'arrowright') click(stage.board.querySelector('[data-choice="false"]') as HTMLElement);
    };
    document.addEventListener('keydown', onKey);
  };

  const finishBlock = () => {
    if (onKey) document.removeEventListener('keydown', onKey);
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: rounds > 0 ? totalRt / rounds : 0,
      rounds
    });
  };

  startRound();
  return () => {
    clearTimeout(currentTimer);
    if (onKey) document.removeEventListener('keydown', onKey);
    stage.cleanup();
  };
}
