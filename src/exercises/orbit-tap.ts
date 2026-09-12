import { ExerciseModule, BlockResult } from './contract';

const orbitTapModule: ExerciseModule = {
  manifest: {
    id: 'orbit-tap',
    name: 'Орбита',
    domain: 'attention',
    skills: ['selective_attention', 'divided_attention'],
    metricModel: 'timing-precision',
    instruction: 'Нажмите ТАП (или пробел), когда ЗЕЛЁНАЯ цель проходит через жёлтые ворота. Ложные тапы штрафуются.'
  },

  render(el: HTMLElement, level: number, onEnd: (r: BlockResult) => void, isTimeUp: () => boolean) {
    let rounds = 0;
    let correct = 0;
    let rts: number[] = [];
    let isGameOver = false;
    let animationFrameId = 0;

    el.innerHTML = `
      <style>
        .ot-arena {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          height: 100%; gap: 30px; user-select: none;
        }
        .ot-svg-container {
          position: relative; width: 300px; height: 300px;
        }
        .ot-sector {
          fill: var(--warning); opacity: 0.3; transition: fill 0.2s;
        }
        .ot-orbit {
          fill: none; stroke: var(--line); stroke-width: 2;
        }
        .ot-target {
          fill: var(--ok);
        }
        .ot-distractor {
          fill: var(--danger);
        }
        .ot-btn {
          width: 120px; height: 60px; font-size: 24px; border-radius: 12px;
          background: var(--surface); border: 2px solid var(--line); cursor: pointer; color: var(--text);
        }
        .ot-btn:active { transform: scale(0.95); }
      </style>
      <div class="ot-arena">
        <svg class="ot-svg-container" viewBox="-150 -150 300 300">
          <circle class="ot-orbit" cx="0" cy="0" r="100" />
          <path class="ot-sector" id="ot-sector-path" d="" />
          <g id="ot-entities"></g>
        </svg>
        <button class="ot-btn" id="ot-tap">ТАП</button>
      </div>
    `;

    const entitiesGroup = el.querySelector('#ot-entities') as SVGGElement;
    const sectorPath = el.querySelector('#ot-sector-path') as SVGPathElement;
    const btnTap = el.querySelector('#ot-tap') as HTMLElement;

    const sectorAngleRange = Math.PI / 4; // 45 degrees
    let sectorCenterAngle = Math.random() * Math.PI * 2;
    
    // Draw sector
    const drawSector = () => {
      const startAngle = sectorCenterAngle - sectorAngleRange / 2;
      const endAngle = sectorCenterAngle + sectorAngleRange / 2;
      const rOuter = 130;
      const rInner = 70;
      
      const x1o = Math.cos(startAngle) * rOuter, y1o = Math.sin(startAngle) * rOuter;
      const x2o = Math.cos(endAngle) * rOuter, y2o = Math.sin(endAngle) * rOuter;
      const x1i = Math.cos(startAngle) * rInner, y1i = Math.sin(startAngle) * rInner;
      const x2i = Math.cos(endAngle) * rInner, y2i = Math.sin(endAngle) * rInner;
      
      sectorPath.setAttribute('d', `M ${x1i} ${y1i} L ${x1o} ${y1o} A ${rOuter} ${rOuter} 0 0 1 ${x2o} ${y2o} L ${x2i} ${y2i} A ${rInner} ${rInner} 0 0 0 ${x1i} ${y1i}`);
    };
    drawSector();

    const distractorCount = Math.min(5, 1 + Math.floor(level / 3));
    const baseSpeed = 0.02 + level * 0.005;
    
    interface Entity { type: 'target'|'distractor'; angle: number; speed: number; el: SVGCircleElement; hit: boolean }
    const entities: Entity[] = [];
    
    const targetEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    targetEl.setAttribute('r', '12');
    targetEl.setAttribute('class', 'ot-target');
    entitiesGroup.appendChild(targetEl);
    entities.push({ type: 'target', angle: 0, speed: baseSpeed, el: targetEl, hit: false });
    
    for (let i = 0; i < distractorCount; i++) {
      const dEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dEl.setAttribute('r', '10');
      dEl.setAttribute('class', 'ot-distractor');
      entitiesGroup.appendChild(dEl);
      entities.push({ 
        type: 'distractor', 
        angle: (Math.PI * 2 / (distractorCount + 1)) * (i + 1), 
        speed: baseSpeed * (Math.random() > 0.5 ? 1.2 : 0.8) * (Math.random() > 0.5 ? 1 : -1), 
        el: dEl, 
        hit: false 
      });
    }

    let lastTime = performance.now();
    let currentRoundT0 = performance.now();

    const loop = (time: number) => {
      if (isGameOver) return;
      if (isTimeUp()) {
        endBlock();
        return;
      }
      
      const dt = (time - lastTime) / 16; // approx frames
      lastTime = time;
      
      entities.forEach(ent => {
        ent.angle += ent.speed * dt;
        ent.angle = (ent.angle + Math.PI * 2) % (Math.PI * 2);
        
        const x = Math.cos(ent.angle) * 100;
        const y = Math.sin(ent.angle) * 100;
        ent.el.setAttribute('cx', String(x));
        ent.el.setAttribute('cy', String(y));
        
        // Reset hit status when exiting sector
        let angleDiff = Math.abs(ent.angle - sectorCenterAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        if (angleDiff > sectorAngleRange / 2 + 0.5) {
          ent.hit = false;
        }
      });
      
      animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);

    const checkTap = () => {
      if (isGameOver) return;
      
      let hitTarget = false;
      let hitDistractor = false;
      
      entities.forEach(ent => {
        let angleDiff = Math.abs(ent.angle - sectorCenterAngle);
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
        if (angleDiff <= sectorAngleRange / 2) {
          if (ent.type === 'target' && !ent.hit) { hitTarget = true; ent.hit = true; }
          else if (ent.type === 'distractor' && !ent.hit) { hitDistractor = true; ent.hit = true; }
        }
      });
      
      rounds++;
      const rt = performance.now() - currentRoundT0;
      rts.push(Math.min(rt, 3000));
      currentRoundT0 = performance.now();
      
      if (hitTarget && !hitDistractor) {
        correct++;
        sectorPath.style.fill = 'var(--ok)';
      } else {
        sectorPath.style.fill = 'var(--danger)';
      }
      
      setTimeout(() => {
        sectorPath.style.fill = '';
      }, 200);
      
      // Move sector slightly after tap to prevent button mashing
      sectorCenterAngle = (sectorCenterAngle + Math.PI / 2 + Math.random() * Math.PI) % (Math.PI * 2);
      drawSector();
    };

    btnTap.onclick = checkTap;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        checkTap();
      }
    };
    window.addEventListener('keydown', onKey);

    const endBlock = () => {
      isGameOver = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', onKey);
      const accuracy = rounds > 0 ? Math.max(0, correct / rounds) : 0;
      const avgRtMs = rts.length > 0 ? rts.reduce((a,b)=>a+b,0)/rts.length : 1000;
      onEnd({ accuracy, avgRtMs, rounds });
    };

    return () => {
      isGameOver = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', onKey);
    };
  }
};

export default orbitTapModule;
