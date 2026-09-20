const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'src', 'exercises');

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content.trim() + '\n');
}

// 1. pulse-rail
const prDir = path.join(srcDir, 'pulse-rail');
write(path.join(prDir, 'manifest.ts'), `
export const manifest = {
  id: 'pulse-rail',
  name: 'Пульс-рельс',
  domain: 'attention',
  skills: ['selective_attention', 'inhibition'],
  metricModel: 'speed-accuracy',
  instruction: 'В центре указан целевой цвет. Нажимайте на рельс (Влево или Вправо), когда на нем появляется фигура целевого цвета. Игнорируйте другие цвета.'
};
export function getParams(level: number) {
  const speedMs = Math.max(500, 1200 - level * 80);
  const colors = level > 5 ? 4 : (level > 2 ? 3 : 2);
  return { speedMs, colors };
}
`);
write(path.join(prDir, 'engine.ts'), `
export class PulseRailEngine {
  startRound(params: { colors: number }): { targetColor: string, side: 'left' | 'right', stimulusColor: string, isTarget: boolean } {
    const palette = ['var(--danger)', 'var(--ok)', 'var(--primary)', 'var(--warning)'].slice(0, params.colors);
    const targetColor = palette[Math.floor(Math.random() * palette.length)];
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const isTarget = Math.random() > 0.4;
    let stimulusColor = targetColor;
    if (!isTarget) {
      const distractors = palette.filter(c => c !== targetColor);
      stimulusColor = distractors[Math.floor(Math.random() * distractors.length)];
    }
    return { targetColor, side, stimulusColor, isTarget };
  }

  submit(action: 'left' | 'right' | 'none', state: { side: 'left' | 'right', isTarget: boolean }): { correct: boolean } {
    if (state.isTarget) {
      return { correct: action === state.side };
    } else {
      return { correct: action === 'none' };
    }
  }
}
`);
write(path.join(prDir, 'view.ts'), `
import { PulseRailEngine } from './engine';
import { manifest, getParams } from './manifest';
import { mountStage } from '../stage';

export function render(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new PulseRailEngine();
  const stage = mountStage(container, 'attention');
  let rounds = 0, correctCount = 0, totalRt = 0;
  let currentState: any = null;
  let timer: number;
  let roundStart = 0;

  stage.board.innerHTML = \`
    <div style="display:flex; justify-content:space-between; width:100%; max-width:400px; margin:0 auto; position:relative;">
      <div id="pr-left" style="width:80px; height:200px; border:2px dashed var(--line); border-radius:12px; display:flex; align-items:center; justify-content:center;"></div>
      <div id="pr-center" style="width:60px; height:60px; border-radius:50%; border:4px solid var(--text); position:absolute; top:70px; left:50%; transform:translateX(-50%);"></div>
      <div id="pr-right" style="width:80px; height:200px; border:2px dashed var(--line); border-radius:12px; display:flex; align-items:center; justify-content:center;"></div>
    </div>
    <div style="margin-top:40px; display:flex; gap:20px; justify-content:center;">
      <button id="pr-btn-left" class="btn">ВЛЕВО (⬅️)</button>
      <button id="pr-btn-right" class="btn">ВПРАВО (➡️)</button>
    </div>
  \`;

  const leftRail = stage.board.querySelector('#pr-left') as HTMLElement;
  const rightRail = stage.board.querySelector('#pr-right') as HTMLElement;
  const centerTarget = stage.board.querySelector('#pr-center') as HTMLElement;
  const btnLeft = stage.board.querySelector('#pr-btn-left') as HTMLButtonElement;
  const btnRight = stage.board.querySelector('#pr-btn-right') as HTMLButtonElement;

  const nextRound = () => {
    if (isTimeUp()) return finish();
    const params = getParams(level);
    currentState = engine.startRound(params);
    
    centerTarget.style.backgroundColor = currentState.targetColor;
    leftRail.innerHTML = '';
    rightRail.innerHTML = '';
    
    const obj = document.createElement('div');
    obj.style.width = '40px';
    obj.style.height = '40px';
    obj.style.borderRadius = '50%';
    obj.style.backgroundColor = currentState.stimulusColor;
    
    if (currentState.side === 'left') leftRail.appendChild(obj);
    else rightRail.appendChild(obj);

    roundStart = Date.now();
    timer = window.setTimeout(() => handleAction('none'), params.speedMs);
  };

  const handleAction = (action: 'left'|'right'|'none') => {
    if (!currentState) return;
    clearTimeout(timer);
    const rt = Date.now() - roundStart;
    const { correct } = engine.submit(action, currentState);
    
    rounds++;
    if (correct) correctCount++;
    if (action !== 'none') totalRt += rt;

    stage.pulse(correct);
    currentState = null;
    
    leftRail.innerHTML = '';
    rightRail.innerHTML = '';
    setTimeout(nextRound, 300);
  };

  btnLeft.onclick = () => handleAction('left');
  btnRight.onclick = () => handleAction('right');

  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') handleAction('left');
    if (e.code === 'ArrowRight') handleAction('right');
  };
  window.addEventListener('keydown', onKey);

  const finish = () => {
    window.removeEventListener('keydown', onKey);
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: totalRt / Math.max(1, rounds),
      rounds
    });
  };

  nextRound();
  return () => {
    clearTimeout(timer);
    window.removeEventListener('keydown', onKey);
    stage.cleanup();
  };
}
`);
write(path.join(prDir, 'index.ts'), `
import { manifest } from './manifest';
import { render } from './view';
import { ExerciseModule } from '../contract';

const module: ExerciseModule = { manifest: manifest as any, render };
export default module;
`);


// 2. vault-span
const vsDir = path.join(srcDir, 'vault-span');
write(path.join(vsDir, 'manifest.ts'), `
export const manifest = {
  id: 'vault-span',
  name: 'Хранилище',
  domain: 'memory',
  skills: ['working_memory', 'visual_memory'],
  metricModel: 'capacity',
  instruction: 'Запомните, в каких ячейках хранилища появились монеты, и повторите их в ТОМ ЖЕ порядке.'
};
export function getParams(level: number) {
  const sequenceLength = Math.min(9, 3 + Math.floor(level / 2));
  return { sequenceLength };
}
`);
write(path.join(vsDir, 'engine.ts'), `
export class VaultSpanEngine {
  startRound(params: { sequenceLength: number }): { sequence: number[] } {
    const seq: number[] = [];
    let prev = -1;
    for (let i = 0; i < params.sequenceLength; i++) {
      let next = Math.floor(Math.random() * 9);
      while (next === prev) next = Math.floor(Math.random() * 9);
      seq.push(next);
      prev = next;
    }
    return { sequence: seq };
  }
  submit(userSequence: number[], targetSequence: number[]): { accuracy: number } {
    let correct = 0;
    for (let i = 0; i < targetSequence.length; i++) {
      if (userSequence[i] === targetSequence[i]) correct++;
    }
    return { accuracy: targetSequence.length ? correct / targetSequence.length : 0 };
  }
}
`);
write(path.join(vsDir, 'view.ts'), `
import { VaultSpanEngine } from './engine';
import { manifest, getParams } from './manifest';
import { mountStage } from '../stage';

export function render(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new VaultSpanEngine();
  const stage = mountStage(container, 'memory');
  let rounds = 0, totalAccuracy = 0, totalRt = 0;
  let targetSeq: number[] = [];
  let userSeq: number[] = [];
  let isInputPhase = false;
  let roundStart = 0;

  stage.board.innerHTML = \`
    <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; max-width:300px; margin:0 auto;">
      \${Array.from({length: 9}).map((_, i) => \`<button id="vs-cell-\${i}" class="btn" style="height:80px; font-size:32px; border-radius:12px;"></button>\`).join('')}
    </div>
  \`;

  const cells = Array.from({length: 9}).map((_, i) => stage.board.querySelector(\`#vs-cell-\${i}\`) as HTMLButtonElement);

  const showSequence = async (seq: number[]) => {
    isInputPhase = false;
    stage.setStatus('Запоминайте...');
    cells.forEach(c => c.textContent = '');
    
    await new Promise(r => setTimeout(r, 500));
    for (const idx of seq) {
      cells[idx].textContent = '🪙';
      cells[idx].style.background = 'var(--surface)';
      await new Promise(r => setTimeout(r, 600));
      cells[idx].textContent = '';
      cells[idx].style.background = '';
      await new Promise(r => setTimeout(r, 200));
    }
    
    stage.setStatus('Повторите!');
    isInputPhase = true;
    userSeq = [];
    roundStart = Date.now();
  };

  const nextRound = () => {
    if (isTimeUp()) return finish();
    const params = getParams(level);
    targetSeq = engine.startRound(params).sequence;
    showSequence(targetSeq);
  };

  cells.forEach((cell, i) => {
    cell.onclick = () => {
      if (!isInputPhase) return;
      userSeq.push(i);
      cell.textContent = '🪙';
      setTimeout(() => { cell.textContent = ''; }, 300);
      
      if (userSeq.length === targetSeq.length) {
        isInputPhase = false;
        const rt = Date.now() - roundStart;
        const { accuracy } = engine.submit(userSeq, targetSeq);
        rounds++;
        totalAccuracy += accuracy;
        totalRt += rt;
        stage.pulse(accuracy === 1);
        setTimeout(nextRound, 1000);
      }
    };
  });

  const finish = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? totalAccuracy / rounds : 0,
      avgRtMs: totalRt / Math.max(1, rounds),
      rounds
    });
  };

  nextRound();
  return () => {
    stage.cleanup();
  };
}
`);
write(path.join(vsDir, 'index.ts'), `
import { manifest } from './manifest';
import { render } from './view';
import { ExerciseModule } from '../contract';

const module: ExerciseModule = { manifest: manifest as any, render };
export default module;
`);


// 3. frame-swap
const fsDir = path.join(srcDir, 'frame-swap');
write(path.join(fsDir, 'manifest.ts'), `
export const manifest = {
  id: 'frame-swap',
  name: 'Смена кадра',
  domain: 'flexibility',
  skills: ['task_switching', 'cognitive_flexibility'],
  metricModel: 'speed-accuracy',
  instruction: 'КРУГЛАЯ рамка: выберите фигуру ТАКОГО ЖЕ ЦВЕТА. КВАДРАТНАЯ рамка: выберите ТАКУЮ ЖЕ ФИГУРУ.'
};
export function getParams(level: number) {
  return { optionsCount: level > 3 ? 4 : 2 };
}
`);
write(path.join(fsDir, 'engine.ts'), `
export class FrameSwapEngine {
  startRound(params: { optionsCount: number }): {
    rule: 'color' | 'shape',
    target: { color: string, shape: string },
    options: { color: string, shape: string }[],
    correctIndex: number
  } {
    const rule = Math.random() > 0.5 ? 'color' : 'shape';
    const colors = ['var(--danger)', 'var(--ok)', 'var(--primary)', 'var(--warning)'];
    const shapes = ['circle', 'square', 'triangle'];
    
    const target = {
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: shapes[Math.floor(Math.random() * shapes.length)]
    };

    const options: { color: string, shape: string }[] = [];
    const correctIndex = Math.floor(Math.random() * params.optionsCount);
    
    for (let i = 0; i < params.optionsCount; i++) {
      if (i === correctIndex) {
        if (rule === 'color') {
          options.push({ color: target.color, shape: shapes.find(s => s !== target.shape) || 'square' });
        } else {
          options.push({ color: colors.find(c => c !== target.color) || 'var(--primary)', shape: target.shape });
        }
      } else {
        options.push({
          color: colors.find(c => c !== target.color) || 'var(--warning)',
          shape: shapes.find(s => s !== target.shape) || 'triangle'
        });
      }
    }
    return { rule, target, options, correctIndex };
  }
  submit(selectedIndex: number, correctIndex: number): { correct: boolean } {
    return { correct: selectedIndex === correctIndex };
  }
}
`);
write(path.join(fsDir, 'view.ts'), `
import { FrameSwapEngine } from './engine';
import { manifest, getParams } from './manifest';
import { mountStage } from '../stage';

export function render(
  container: HTMLElement,
  level: number,
  onBlockEnd: (result: {accuracy: number, avgRtMs: number, rounds: number}) => void,
  isTimeUp: () => boolean
) {
  const engine = new FrameSwapEngine();
  const stage = mountStage(container, 'flexibility');
  let rounds = 0, correctCount = 0, totalRt = 0;
  let currentState: any = null;
  let roundStart = 0;

  stage.board.innerHTML = \`
    <div style="display:flex; flex-direction:column; align-items:center; gap:40px;">
      <div id="fs-frame" style="width:120px; height:120px; border:6px solid var(--text); display:flex; align-items:center; justify-content:center;">
        <div id="fs-target" style="width:60px; height:60px;"></div>
      </div>
      <div id="fs-options" style="display:flex; gap:20px;"></div>
    </div>
  \`;

  const frameEl = stage.board.querySelector('#fs-frame') as HTMLElement;
  const targetEl = stage.board.querySelector('#fs-target') as HTMLElement;
  const optionsEl = stage.board.querySelector('#fs-options') as HTMLElement;

  const drawShape = (el: HTMLElement, color: string, shape: string) => {
    el.style.backgroundColor = 'transparent';
    el.style.borderRadius = '0';
    el.style.borderBottom = 'none';
    if (shape === 'circle') {
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
    } else if (shape === 'square') {
      el.style.backgroundColor = color;
    } else if (shape === 'triangle') {
      el.style.width = '0';
      el.style.height = '0';
      el.style.borderLeft = '30px solid transparent';
      el.style.borderRight = '30px solid transparent';
      el.style.borderBottom = \`60px solid \${color}\`;
    }
  };

  const nextRound = () => {
    if (isTimeUp()) return finish();
    const params = getParams(level);
    currentState = engine.startRound(params);
    
    frameEl.style.borderRadius = currentState.rule === 'color' ? '50%' : '12px';
    
    targetEl.style.width = '60px'; targetEl.style.height = '60px'; targetEl.style.borderLeft = 'none'; targetEl.style.borderRight = 'none';
    drawShape(targetEl, currentState.target.color, currentState.target.shape);

    optionsEl.innerHTML = '';
    currentState.options.forEach((opt: any, i: number) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.width = '100px';
      btn.style.height = '100px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      
      const icon = document.createElement('div');
      icon.style.width = '50px'; icon.style.height = '50px';
      drawShape(icon, opt.color, opt.shape);
      btn.appendChild(icon);
      
      btn.onclick = () => handleAction(i);
      optionsEl.appendChild(btn);
    });

    roundStart = Date.now();
  };

  const handleAction = (idx: number) => {
    if (!currentState) return;
    const rt = Date.now() - roundStart;
    const { correct } = engine.submit(idx, currentState.correctIndex);
    
    rounds++;
    if (correct) correctCount++;
    totalRt += rt;

    stage.pulse(correct);
    currentState = null;
    setTimeout(nextRound, 300);
  };

  const finish = () => {
    stage.cleanup();
    onBlockEnd({
      accuracy: rounds > 0 ? correctCount / rounds : 0,
      avgRtMs: totalRt / Math.max(1, rounds),
      rounds
    });
  };

  nextRound();
  return () => {
    stage.cleanup();
  };
}
`);
write(path.join(fsDir, 'index.ts'), `
import { manifest } from './manifest';
import { render } from './view';
import { ExerciseModule } from '../contract';

const module: ExerciseModule = { manifest: manifest as any, render };
export default module;
`);
