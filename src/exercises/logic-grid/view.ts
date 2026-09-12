import { LogicGridEngine } from './engine';
import { BlockResult } from '../contract';

export function renderLogicGrid(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean): () => void {
  const engine = new LogicGridEngine();
  let rounds = 0, correct = 0;
  let rts: number[] = [], t0 = 0;
  let isGameOver = false, currentTarget = false;

  el.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;justify-content:center;gap:20px;'><div id='lg-word' style='font-size:48px;font-weight:bold;'></div><div style='display:flex;gap:20px;'><button id='lg-btn-y'>Да</button><button id='lg-btn-n'>Нет</button></div></div>";
  
  const wordEl = el.querySelector('#lg-word') as HTMLElement;
  const btnY = el.querySelector('#lg-btn-y') as HTMLButtonElement;
  const btnN = el.querySelector('#lg-btn-n') as HTMLButtonElement;

  const startRound = () => {
    if (isGameOver) return;
    if (isTimeUp()) { endBlock(); return; }
    
    const config = engine.start(level);
    currentTarget = config.isTarget;
    wordEl.textContent = currentTarget ? "Цель" : "Шум";
    t0 = performance.now();
  };

  const onAnswer = (ans: boolean) => {
    if (isGameOver) return;
    const res = engine.submit(currentTarget, ans);
    rounds++; correct += res.accuracy;
    rts.push(performance.now() - t0);
    startRound();
  };

  btnY.onclick = () => onAnswer(true);
  btnN.onclick = () => onAnswer(false);

  const endBlock = () => {
    isGameOver = true;
    onEnd({ accuracy: rounds > 0 ? correct/rounds : 0, avgRtMs: rounds > 0 ? rts.reduce((a,b)=>a+b,0)/rounds : 1000, rounds });
  };

  startRound();
  return () => { isGameOver = true; };
}
