import { nextCombo, playCombo, playHit, playMiss } from '../core/audio';

export interface PlayStage {
  root: HTMLElement;
  board: HTMLElement;
  hud: HTMLElement;
  setStatus(text: string): void;
  pulse(ok: boolean): void;
  burst(ok?: boolean, origin?: { x: number; y: number }): void;
  cleanup(): void;
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function mountStage(container: HTMLElement, domain = 'attention'): PlayStage {
  container.innerHTML = '';
  const root = document.createElement('div');
  root.className = `play-stage dom-${domain}`;
  root.innerHTML = `
    <div class="play-sky" aria-hidden="true"></div>
    <div class="play-orbs" aria-hidden="true">
      <i></i><i></i><i></i>
    </div>
    <div class="play-hud"></div>
    <div class="play-combo" aria-live="polite"></div>
    <div class="play-board"></div>
    <canvas class="play-fx"></canvas>
  `;
  container.appendChild(root);

  const board = root.querySelector('.play-board') as HTMLElement;
  const hud = root.querySelector('.play-hud') as HTMLElement;
  const comboEl = root.querySelector('.play-combo') as HTMLElement;
  const canvas = root.querySelector('.play-fx') as HTMLCanvasElement;
  let combo = 0;
  const ctx = canvas.getContext('2d');
  const particles: { x: number; y: number; vx: number; vy: number; life: number; color: string; r: number }[] = [];
  let raf = 0;
  let alive = true;

  const resize = () => {
    const rect = root.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, rect.width * dpr);
    canvas.height = Math.max(1, rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize);

  const tick = () => {
    if (!alive || !ctx) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.life -= 0.018;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(tick);
  };
  if (!reduced()) raf = requestAnimationFrame(tick);

  const burst = (ok = true, origin?: { x: number; y: number }) => {
    if (reduced() || !ctx) return;
    const rect = root.getBoundingClientRect();
    const x = origin?.x ?? rect.width / 2;
    const y = origin?.y ?? rect.height / 2.4;
    const color = ok ? '#10b981' : '#ef4444';
    for (let i = 0; i < 22; i++) {
      const a = (Math.PI * 2 * i) / 22 + Math.random() * 0.3;
      const sp = 1.6 + Math.random() * 3.4;
      particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 1.2,
        life: 1,
        color,
        r: 1.5 + Math.random() * 2.5
      });
    }
    try {
      navigator.vibrate?.(ok ? 12 : 28);
    } catch { /* ignore */ }
  };

  const showCombo = (n: number) => {
    if (n >= 2) {
      comboEl.textContent = `×${n}`;
      comboEl.classList.remove('on');
      void comboEl.offsetWidth;
      comboEl.classList.add('on');
    } else {
      comboEl.textContent = '';
      comboEl.classList.remove('on');
    }
  };

  const pulse = (ok: boolean) => {
    combo = nextCombo(combo, ok);
    if (ok) {
      playHit(combo);
      if (combo === 3 || combo === 5 || combo === 8 || combo === 12) playCombo(combo);
    } else {
      playMiss();
    }
    showCombo(combo);
    root.classList.remove('pulse-ok', 'pulse-bad');
    void root.offsetWidth;
    root.classList.add(ok ? 'pulse-ok' : 'pulse-bad');
    burst(ok);
  };

  return {
    root,
    board,
    hud,
    setStatus(text: string) {
      hud.textContent = text;
    },
    pulse,
    burst,
    cleanup() {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    }
  };
}

export function tile3d(extraClass = '', inner = ''): string {
  return `<span class="tile-3d ${extraClass}"><span class="tile-cap"></span>${inner}</span>`;
}
