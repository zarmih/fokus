import { ExerciseModule } from './contract';

/**
 * original Fokus speed mechanic.
 */
const cutBarModule: ExerciseModule = {
  manifest: {
    id: 'cut-bar',
    name: 'Рубеж',
    domain: 'speed',
    skills: ['reaction_speed', 'visual_scanning'],
    metricModel: 'timing-precision',
    instruction:
      'Полоса заполняется с постоянной скоростью. На треке есть отметка рубежа. Нажмите только после того, как заливка пройдет рубеж, но не раньше. Ошибки: слишком раннее нажатие или ожидание до конца трека. Чем выше уровень, тем меньше времени даётся после прохождения рубежа.'
  },
  render(el, level, onEnd, isTimeUp) {
    el.innerHTML = '';
    let rounds = 0;
    let hits = 0;
    let avgRtMs = 0;
    let raf = 0;
    let startTime = 0;
    let fillP = 0;
    let cutP = 0.5;
    let fillSpeed = 0.0004 + level * 0.00003;
    let lateWindow = Math.max(0.05, 0.25 - level * 0.008);
    let phase: 'wait' | 'run' | 'feedback' = 'wait';
    let answered = false;

    const root = document.createElement('div');
    root.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;user-select:none;';
    const stage = document.createElement('div');
    stage.style.cssText =
      'position:relative;width:min(320px,90vw);height:60px;border-radius:30px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden;';
    
    const fill = document.createElement('div');
    fill.setAttribute('aria-hidden', 'true');
    fill.style.cssText =
      'position:absolute;top:0;bottom:0;left:0;background:var(--primary);';
    
    const cut = document.createElement('div');
    cut.setAttribute('aria-hidden', 'true');
    cut.style.cssText =
      'position:absolute;top:0;bottom:0;width:4px;background:var(--surface);border-left:1px dashed var(--error);z-index:2;';
    
    const status = document.createElement('div');
    status.className = 'muted';
    status.style.cssText = 'font-size:14px;min-height:1.2em;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.textContent = 'Сейчас';
    btn.setAttribute('aria-label', 'Нажать после рубежа');
    btn.style.width = 'min(320px,90vw)';

    stage.appendChild(fill);
    stage.appendChild(cut);
    root.appendChild(stage);
    root.appendChild(status);
    root.appendChild(btn);
    el.appendChild(root);

    function renderPositions() {
      fill.style.width = `${fillP * 100}%`;
      cut.style.left = `${cutP * 100}%`;
    }

    function scoreAtTap() {
      const passed = fillP >= cutP;
      const tooLate = fillP > cutP + lateWindow;
      return { passed, tooLate, dist: Math.abs(fillP - cutP) };
    }

    function nextRound() {
      if (isTimeUp()) {
        finish();
        return;
      }
      rounds++;
      answered = false;
      phase = 'run';
      fillP = 0;
      cutP = 0.3 + Math.random() * 0.4;
      fillSpeed = 0.00035 + level * 0.000025 + Math.random() * 0.00005;
      lateWindow = Math.max(0.05, 0.25 - level * 0.008);
      renderPositions();
      status.textContent = 'Ждите прохождения рубежа…';
      startTime = performance.now();
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        if (phase !== 'run') return;
        const dt = Math.min(32, now - startTime);
        startTime = now;
        fillP += fillSpeed * dt;
        renderPositions();
        
        if (fillP >= 1) {
          phase = 'feedback';
          status.textContent = 'Пропуск (слишком долго)';
          status.style.color = 'var(--danger, #f87171)';
          setTimeout(() => {
            status.style.color = '';
            nextRound();
          }, 280);
          return;
        } else if (fillP > cutP + lateWindow && !answered) {
           phase = 'feedback';
           status.textContent = 'Поздно';
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
      const { passed, dist } = scoreAtTap();
      avgRtMs = avgRtMs === 0 ? dist * 1000 : (avgRtMs + dist * 1000) / 2;
      
      if (passed) {
        hits++;
        status.textContent = 'Успех';
        status.style.color = 'var(--ok)';
      } else {
        status.textContent = 'Рано';
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

export default cutBarModule;
