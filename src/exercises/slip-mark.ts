import { ExerciseModule } from './contract';

/**
 * original Fokus speed mechanic.
 */
const slipMarkModule: ExerciseModule = {
  manifest: {
    id: 'slip-mark',
    name: 'Метка на сквозняке',
    domain: 'speed',
    skills: ['processing_speed', 'reaction_speed'],
    metricModel: 'timing-precision',
    instruction:
      'Метка скользит по горизонтали без скачков. Узкие ворота движутся навстречу. Нажмите один раз, когда они совпадут. Ранее или позднее нажатие — промах. Чем выше уровень, тем уже окно совпадения.'
  },
  render(el, level, onEnd, isTimeUp) {
    el.innerHTML = '';
    let rounds = 0;
    let hits = 0;
    let avgRtMs = 0;
    let raf = 0;
    let startTime = 0;
    let markX = -0.1;
    let gateX = 1.1;
    let markSpeed = 0.0003 + level * 0.00002;
    let gateSpeed = 0.0002 + level * 0.000015;
    let gateWidth = Math.max(0.04, 0.12 - level * 0.003);
    let markWidth = 0.08;
    let phase: 'wait' | 'run' | 'feedback' = 'wait';
    let answered = false;

    const root = document.createElement('div');
    root.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;user-select:none;';
    const stage = document.createElement('div');
    stage.style.cssText =
      'position:relative;width:min(320px,90vw);height:80px;border-radius:16px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden;';
    
    const gate = document.createElement('div');
    gate.setAttribute('aria-hidden', 'true');
    gate.style.cssText =
      'position:absolute;top:0;bottom:0;background:rgba(16,185,129,0.18);border-left:1px dashed var(--ok);border-right:1px dashed var(--ok);pointer-events:none;';
    
    const mark = document.createElement('div');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText =
      'position:absolute;top:50%;height:28px;margin-top:-14px;border-radius:14px;background:var(--primary);box-shadow:0 0 12px rgba(56,189,248,0.45);';
    
    const status = document.createElement('div');
    status.className = 'muted';
    status.style.cssText = 'font-size:14px;min-height:1.2em;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.textContent = 'Сейчас';
    btn.setAttribute('aria-label', 'Нажать, когда метка в воротах');
    btn.style.width = 'min(320px,90vw)';

    stage.appendChild(gate);
    stage.appendChild(mark);
    root.appendChild(stage);
    root.appendChild(status);
    root.appendChild(btn);
    el.appendChild(root);

    function renderPositions() {
      gate.style.left = `${gateX * 100}%`;
      gate.style.width = `${gateWidth * 100}%`;
      mark.style.left = `${markX * 100}%`;
      mark.style.width = `${markWidth * 100}%`;
    }

    function scoreAtTap() {
      const markLeft = markX;
      const markRight = markX + markWidth;
      const gateLeft = gateX;
      const gateRight = gateX + gateWidth;
      
      const overlap = markRight > gateLeft && markLeft < gateRight;
      const dist = overlap ? 0 : markRight <= gateLeft ? gateLeft - markRight : markLeft - gateRight;
      return { overlap, dist };
    }

    function nextRound() {
      if (isTimeUp()) {
        finish();
        return;
      }
      rounds++;
      answered = false;
      phase = 'run';
      markX = -0.15 - Math.random() * 0.1;
      gateX = 1.05 + Math.random() * 0.1;
      gateWidth = Math.max(0.04, 0.12 - level * 0.003);
      markSpeed = 0.0003 + level * 0.00002 + Math.random() * 0.00005;
      gateSpeed = 0.0002 + level * 0.000015 + Math.random() * 0.00003;
      renderPositions();
      status.textContent = 'Ждите совпадения…';
      startTime = performance.now();
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        if (phase !== 'run') return;
        const dt = Math.min(32, now - startTime);
        startTime = now;
        markX += markSpeed * dt;
        gateX -= gateSpeed * dt;
        renderPositions();
        if (markX > 1.1 || gateX < -0.1) {
          phase = 'feedback';
          status.textContent = 'Пропуск';
          status.style.color = 'var(--danger, #f87171)';
          setTimeout(() => {
            status.style.color = '';
            nextRound();
          }, 280);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    function onTap() {
      if (phase !== 'run' || answered) return;
      answered = true;
      phase = 'feedback';
      cancelAnimationFrame(raf);
      const { overlap, dist } = scoreAtTap();
      avgRtMs = avgRtMs === 0 ? dist * 1000 : (avgRtMs + dist * 1000) / 2;
      if (overlap) {
        hits++;
        status.textContent = 'Точно';
        status.style.color = 'var(--ok)';
      } else {
        status.textContent = dist > 0 && markX + markWidth <= gateX ? 'Рано' : 'Поздно';
        status.style.color = 'var(--danger, #f87171)';
      }
      setTimeout(() => {
        status.style.color = '';
        nextRound();
      }, 280);
    }

    btn.addEventListener('click', onTap);
    btn.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        onTap();
      },
      { passive: false }
    );

    function finish() {
      cancelAnimationFrame(raf);
      const accuracy = rounds > 0 ? hits / rounds : 0;
      onEnd({ accuracy, avgRtMs: Math.max(180, avgRtMs || 400), rounds });
    }

    nextRound();
    return finish;
  }
};

export default slipMarkModule;
