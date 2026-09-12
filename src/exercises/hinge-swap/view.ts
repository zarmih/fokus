import { BlockResult } from '../contract';
import { HingeSwapEngine, HingeRule, HingeColor } from './engine';
import { hingeSwapManifest } from './manifest';

export function renderHingeSwap(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
  const engine = new HingeSwapEngine();
  const lvl = Math.max(1, Math.min(5, Math.floor(level)));
  const params = hingeSwapManifest.levels![lvl as keyof typeof hingeSwapManifest.levels];
  
  let rounds = 0;
  let correct = 0;
  let rts: number[] = [];
  let t0 = performance.now();
  let isGameOver = false;
  let currentRule: HingeRule = 'even';

  el.innerHTML = `
    <style>
      .hinge-arena {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 40px;
        transition: background 0.2s;
        border-radius: 16px;
      }
      .hinge-grid {
        display: flex;
        gap: 20px;
      }
      .hinge-btn {
        width: 100px;
        height: 100px;
        font-size: 40px;
        font-weight: bold;
        background: var(--surface);
        border: 2px solid var(--line);
        border-radius: 16px;
        cursor: pointer;
        transition: transform 0.1s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .hinge-btn:active { transform: scale(0.95); }
      .hinge-indicator {
        font-size: 24px;
        font-weight: bold;
        color: #fff;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      }
    </style>
    <div class="hinge-arena" id="hinge-arena">
      <div class="hinge-indicator" id="hinge-indicator"></div>
      <div class="hinge-grid">
        <div class="hinge-btn" id="hinge-left"></div>
        <div class="hinge-btn" id="hinge-right"></div>
      </div>
    </div>
  `;

  const arena = el.querySelector('#hinge-arena') as HTMLElement;
  const indicator = el.querySelector('#hinge-indicator') as HTMLElement;
  const btnLeft = el.querySelector('#hinge-left') as HTMLElement;
  const btnRight = el.querySelector('#hinge-right') as HTMLElement;

  let currentTargetNum = 0;

  const startRound = () => {
    if (isGameOver) return;
    if (isTimeUp()) {
      endBlock();
      return;
    }

    const next = engine.generateTask(params.numbers, params.swapChance, currentRule);
    currentRule = next.rule;
    
    const nums = engine.generateTwoNumbers(params.numbers);
    
    arena.style.background = next.color === 'blue' ? '#3b82f6' : '#10b981';
    indicator.textContent = next.color === 'blue' ? 'ЧЁТНЫЕ' : 'НЕЧЁТНЫЕ';
    
    btnLeft.textContent = nums.n1.toString();
    btnRight.textContent = nums.n2.toString();

    // The target num is the one that matches the rule
    currentTargetNum = next.color === 'blue' ? 
      (nums.n1 % 2 === 0 ? nums.n1 : nums.n2) :
      (nums.n1 % 2 !== 0 ? nums.n1 : nums.n2);

    btnLeft.style.borderColor = 'var(--line)';
    btnRight.style.borderColor = 'var(--line)';

    t0 = performance.now();
  };

  const endBlock = () => {
    isGameOver = true;
    const accuracy = rounds > 0 ? correct / rounds : 0;
    const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1200;
    onEnd({ accuracy, avgRtMs, rounds });
  };

  const handleAns = (btn: HTMLElement) => {
    if (isGameOver) return;
    
    const num = parseInt(btn.textContent!);
    const isCorrect = num === currentTargetNum;
    
    rounds++;
    rts.push(performance.now() - t0);
    
    if (isCorrect) {
      correct++;
      btn.style.borderColor = 'var(--ok)';
    } else {
      btn.style.borderColor = 'var(--danger)';
    }
    
    setTimeout(startRound, 300);
  };

  btnLeft.onclick = () => handleAns(btnLeft);
  btnRight.onclick = () => handleAns(btnRight);

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') handleAns(btnLeft);
    if (e.code === 'ArrowRight') handleAns(btnRight);
  };
  window.addEventListener('keydown', onKey);

  startRound();

  return () => {
    isGameOver = true;
    window.removeEventListener('keydown', onKey);
  };
}
