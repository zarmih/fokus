import { WordSortEngine } from './engine';
import { BlockResult } from '../contract';

export function renderWordSort(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean): () => void {
  const engine = new WordSortEngine();
  let rounds = 0, correct = 0;
  let rts: number[] = [], t0 = 0;
  let isGameOver = false, currentIsVowel = false;

  el.innerHTML = "<div style='display:flex;flex-direction:column;align-items:center;height:100%;justify-content:center;gap:20px;'><div id='ws-word' style='font-size:48px;font-weight:bold;'></div><div style='display:flex;gap:20px;'><button id='ws-btn-v'>Гласная</button><button id='ws-btn-c'>Согласная</button></div></div>";
  
  const wordEl = el.querySelector('#ws-word') as HTMLElement;
  const btnV = el.querySelector('#ws-btn-v') as HTMLButtonElement;
  const btnC = el.querySelector('#ws-btn-c') as HTMLButtonElement;

  const startRound = () => {
    if (isGameOver) return;
    if (isTimeUp()) { endBlock(); return; }
    
    const config = engine.start(level);
    currentIsVowel = config.isVowel;
    wordEl.textContent = currentIsVowel ? "А" : "Б";
    t0 = performance.now();
  };

  const onAnswer = (isVowel: boolean) => {
    if (isGameOver) return;
    const res = engine.submit(currentIsVowel, isVowel);
    rounds++; correct += res.accuracy;
    rts.push(performance.now() - t0);
    startRound();
  };

  btnV.onclick = () => onAnswer(true);
  btnC.onclick = () => onAnswer(false);

  const endBlock = () => {
    isGameOver = true;
    onEnd({ accuracy: rounds > 0 ? correct/rounds : 0, avgRtMs: rounds > 0 ? rts.reduce((a,b)=>a+b,0)/rounds : 1000, rounds });
  };

  startRound();
  return () => { isGameOver = true; };
}
