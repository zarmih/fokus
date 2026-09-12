import { ColorPathEngine } from './engine';
import { BlockResult } from '../contract';

export function renderColorPath(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean): () => void {
  const engine = new ColorPathEngine();
  let rounds = 0;
  let correct = 0;
  let rts: number[] = [];
  let isGameOver = false;

  el.innerHTML = "<div class='cp-arena' id='cp-arena' style='display:flex;justify-content:center;align-items:center;height:100%;'></div>";
  const arena = el.querySelector('#cp-arena') as HTMLElement;
  let t0 = 0;
  let currentTarget = false;
  
  const startRound = () => {
    if (isGameOver) return;
    if (isTimeUp()) { endBlock(); return; }
    
    const config = engine.start(level);
    currentTarget = config.isTarget;
    
    const btn = document.createElement('button');
    btn.style.width = '100px';
    btn.style.height = '100px';
    btn.style.background = currentTarget ? 'var(--ok)' : 'var(--danger)';
    btn.onclick = () => onAnswer(true);
    
    arena.innerHTML = '';
    arena.appendChild(btn);
    t0 = performance.now();
    
    if (!currentTarget) {
      setTimeout(() => {
        if (!isGameOver && btn.parentElement) onAnswer(false);
      }, Math.max(500, 2000 - level * 100));
    }
  };

  const onAnswer = (clicked: boolean) => {
    if (isGameOver) return;
    const res = engine.submit(currentTarget, clicked);
    rounds++;
    correct += res.accuracy;
    rts.push(performance.now() - t0);
    arena.innerHTML = '';
    setTimeout(startRound, 200);
  };

  const endBlock = () => {
    isGameOver = true;
    const accuracy = rounds > 0 ? correct / rounds : 0;
    const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
    onEnd({ accuracy, avgRtMs, rounds });
  };

  startRound();
  return () => { isGameOver = true; };
}
