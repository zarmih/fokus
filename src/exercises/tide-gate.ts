import { ExerciseModule } from './contract';

/**
 * Tide Gate — original Fokus attention/timing exercise.
 * A mark drifts upward; tap exactly when it enters the gate band.
 * Not a Wikium clone: continuous vertical drift + gate window, not stroop/schulte.
 */
const tideGateModule: ExerciseModule = {
  manifest: {
    id: 'tide-gate',
    name: 'Прилив у ворот',
    domain: 'attention',
    skills: ['sustained_attention', 'inhibition', 'reaction_speed'],
    metricModel: 'timing-precision',
    instruction:
      'Метка поднимается как прилив. Нажмите, когда она окажется в полосе ворот — не раньше и не позже. Пропуск или ранний тап считаются ошибкой.'
  },
  render(el, level, onEnd, isTimeUp) {
    el.innerHTML = '';
    let rounds = 0;
    let hits = 0;
    let avgRtMs = 0;
    let raf = 0;
    let startTime = 0;
    let gateTop = 0.42;
    let gateH = Math.max(0.08, 0.16 - level * 0.004);
    let speed = 0.00035 + level * 0.00004;
    let y = 1.05;
    let phase: 'wait' | 'run' | 'feedback' = 'wait';
    let answered = false;

    const root = document.createElement('div');
    root.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;user-select:none;';
    const stage = document.createElement('div');
    stage.style.cssText =
      'position:relative;width:min(280px,80vw);height:min(360px,55vh);border-radius:16px;background:var(--surface-2);border:1px solid var(--border);overflow:hidden;';
    const gate = document.createElement('div');
    gate.setAttribute('aria-hidden', 'true');
    gate.style.cssText =
      'position:absolute;left:8%;right:8%;border-radius:8px;background:rgba(16,185,129,0.18);border:1px dashed var(--ok);pointer-events:none;';
    const mark = document.createElement('div');
    mark.setAttribute('aria-hidden', 'true');
    mark.style.cssText =
      'position:absolute;left:50%;width:28px;height:28px;margin-left:-14px;border-radius:50%;background:var(--primary);box-shadow:0 0 12px rgba(56,189,248,0.45);';
    const status = document.createElement('div');
    status.className = 'muted';
    status.style.cssText = 'font-size:14px;min-height:1.2em;';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-primary';
    btn.textContent = 'Сейчас';
    btn.setAttribute('aria-label', 'Нажать, когда метка в воротах');
    btn.style.width = 'min(280px,80vw)';

    stage.appendChild(gate);
    stage.appendChild(mark);
    root.appendChild(stage);
    root.appendChild(status);
    root.appendChild(btn);
    el.appendChild(root);

    function layoutGate() {
      gate.style.top = `${gateTop * 100}%`;
      gate.style.height = `${gateH * 100}%`;
    }

    function placeMark() {
      mark.style.top = `${y * 100}%`;
      mark.style.transform = 'translateY(-50%)';
    }

    function scoreAtTap() {
      const inGate = y >= gateTop && y <= gateTop + gateH;
      const dist = inGate
        ? 0
        : y < gateTop
          ? gateTop - y
          : y - (gateTop + gateH);
      return { inGate, dist };
    }

    function nextRound() {
      if (isTimeUp()) {
        finish();
        return;
      }
      rounds++;
      answered = false;
      phase = 'run';
      y = 1.05;
      gateTop = 0.28 + Math.random() * 0.3;
      gateH = Math.max(0.07, 0.15 - level * 0.004);
      speed = 0.00032 + level * 0.000045 + Math.random() * 0.00008;
      layoutGate();
      placeMark();
      status.textContent = 'Ждите полосу ворот…';
      startTime = performance.now();
      cancelAnimationFrame(raf);
      const tick = (now: number) => {
        if (phase !== 'run') return;
        const dt = Math.min(32, now - startTime);
        startTime = now;
        y -= speed * dt;
        placeMark();
        if (y < -0.05) {
          // missed
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
      const rt = 0; // continuous task — use distance as quality proxy via accuracy
      const { inGate, dist } = scoreAtTap();
      avgRtMs = avgRtMs === 0 ? dist * 1000 : (avgRtMs + dist * 1000) / 2;
      if (inGate) {
        hits++;
        status.textContent = 'В воротах';
        status.style.color = 'var(--ok)';
      } else {
        status.textContent = dist > 0 && y < gateTop ? 'Рано' : 'Поздно';
        status.style.color = 'var(--danger, #f87171)';
      }
      setTimeout(() => {
        status.style.color = '';
        nextRound();
      }, 280);
      void rt;
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

export default tideGateModule;
