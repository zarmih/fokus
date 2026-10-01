import { ExerciseModule } from './contract';

const SYMBOLS = ['◆', '●', '▲', '■', '✚', '★', '◇', '○', '△', '□', '✳', '☽'];

/**
 * Anchor Pair — original working-memory bind.
 * Two side-by-side cells flash different symbols; after a blank, probe asks which side held X.
 * Fokus-owned; not a Wikium board copy.
 */
const anchorPairModule: ExerciseModule = {
  manifest: {
    id: 'anchor-pair',
    name: 'Якоря пары',
    domain: 'memory',
    skills: ['working_memory', 'visual_memory', 'recall'],
    metricModel: 'memory-span',
    instruction:
      'На миг слева и справа вспыхивают разные знаки. Запомните оба. Затем укажите, на какой стороне был показанный знак.'
  },
  render(el, level, onEnd, isTimeUp) {
    el.innerHTML = '';
    let rounds = 0;
    let hits = 0;
    let avgRtMs = 0;
    let left = '';
    let right = '';
    let probe = '';
    let correctSide: 'L' | 'R' = 'L';
    let showMs = Math.max(450, 1100 - level * 40);
    let blankMs = Math.min(900, 400 + level * 25);
    let startRt = 0;
    let timers: number[] = [];

    const root = document.createElement('div');
    root.style.cssText =
      'display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:20px;';
    const prompt = document.createElement('div');
    prompt.style.cssText = 'font-size:15px;color:var(--muted);min-height:1.4em;text-align:center;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:16px;align-items:center;justify-content:center;';
    const mkCell = () => {
      const c = document.createElement('button');
      c.type = 'button';
      c.style.cssText =
        'width:min(120px,28vw);height:min(120px,28vw);border-radius:16px;border:2px solid var(--border);background:var(--surface-2);font-size:2.4rem;color:var(--text);cursor:pointer;';
      return c;
    };
    const leftBtn = mkCell();
    const rightBtn = mkCell();
    leftBtn.setAttribute('aria-label', 'Левая сторона');
    rightBtn.setAttribute('aria-label', 'Правая сторона');
    row.appendChild(leftBtn);
    row.appendChild(rightBtn);
    const probeEl = document.createElement('div');
    probeEl.style.cssText = 'font-size:2.6rem;font-weight:700;min-height:1.2em;';
    root.appendChild(prompt);
    root.appendChild(probeEl);
    root.appendChild(row);
    el.appendChild(root);

    function clearTimers() {
      timers.forEach((t) => clearTimeout(t));
      timers = [];
    }

    function pickPair() {
      const pool = [...SYMBOLS];
      const i = Math.floor(Math.random() * pool.length);
      left = pool.splice(i, 1)[0];
      const j = Math.floor(Math.random() * pool.length);
      right = pool.splice(j, 1)[0];
      if (Math.random() < 0.5) {
        probe = left;
        correctSide = 'L';
      } else {
        probe = right;
        correctSide = 'R';
      }
    }

    function setEnabled(on: boolean) {
      leftBtn.disabled = !on;
      rightBtn.disabled = !on;
    }

    function nextRound() {
      if (isTimeUp()) {
        finish();
        return;
      }
      clearTimers();
      rounds++;
      showMs = Math.max(420, 1100 - level * 40);
      blankMs = Math.min(1000, 380 + level * 28);
      pickPair();
      setEnabled(false);
      probeEl.textContent = '';
      prompt.textContent = 'Запомните пару…';
      leftBtn.textContent = left;
      rightBtn.textContent = right;
      leftBtn.style.opacity = '1';
      rightBtn.style.opacity = '1';

      timers.push(
        window.setTimeout(() => {
          leftBtn.textContent = '';
          rightBtn.textContent = '';
          prompt.textContent = 'Пауза…';
          timers.push(
            window.setTimeout(() => {
              probeEl.textContent = probe;
              prompt.textContent = 'Где был этот знак?';
              setEnabled(true);
              startRt = Date.now();
            }, blankMs)
          );
        }, showMs)
      );
    }

    function answer(side: 'L' | 'R') {
      if (leftBtn.disabled) return;
      setEnabled(false);
      const rt = Date.now() - startRt;
      avgRtMs = avgRtMs === 0 ? rt : (avgRtMs + rt) / 2;
      const ok = side === correctSide;
      if (ok) hits++;
      prompt.textContent = ok ? 'Верно' : 'Мимо';
      prompt.style.color = ok ? 'var(--ok)' : 'var(--danger, #f87171)';
      timers.push(
        window.setTimeout(() => {
          prompt.style.color = '';
          nextRound();
        }, 320)
      );
    }

    leftBtn.addEventListener('click', () => answer('L'));
    rightBtn.addEventListener('click', () => answer('R'));

    function finish() {
      clearTimers();
      onEnd({
        accuracy: rounds > 0 ? hits / rounds : 0,
        avgRtMs: avgRtMs || 500,
        rounds
      });
    }

    nextRound();
    return finish;
  }
};

export default anchorPairModule;
