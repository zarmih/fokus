import { comboAtMilestone, nextCombo, playCombo, playHit, playMiss } from '../core/audio';
import { vibrateForCue } from '../core/haptics';
import { detectReducedMotion, readSoundPrefs } from '../core/soundscape';
import { storage } from '../core/storage';

export interface PlayStage {
  root: HTMLElement;
  board: HTMLElement;
  hud: HTMLElement;
  setStatus(text: string): void;
  pulse(ok: boolean): void;
  burst(ok?: boolean, origin?: { x: number; y: number }): void;
  cleanup(): void;
}

const reduced = () => detectReducedMotion();

function cuePrefs() {
  try {
    return readSoundPrefs(storage.getProfile(), detectReducedMotion());
  } catch {
    return readSoundPrefs({ soundOn: true, hapticsOn: true }, detectReducedMotion());
  }
}

/**
 * «Тихий свет» sky: deep blue-violet, calm and static.
 * Applied inline on `.play-sky` so it overrides the stylesheet starfield
 * without touching palette tokens or styles.css.
 */
export const QUIET_SKY = {
  base: '#0F1020',
  indigo: '#1A1640',
  violet: '#2A1E5C'
} as const;

/** Very faint per-domain tint (hard-coded, independent of --dom-* tokens). */
const QUIET_SKY_TINT: Record<string, string> = {
  attention: 'rgba(70, 96, 170, 0.07)',
  memory: 'rgba(110, 80, 170, 0.07)',
  speed: 'rgba(150, 96, 120, 0.06)',
  flexibility: 'rgba(60, 120, 150, 0.06)',
  logic: 'rgba(140, 120, 90, 0.05)'
};

export function quietSkyBackground(domain = 'attention'): string {
  const tint = QUIET_SKY_TINT[domain] ?? 'rgba(80, 80, 150, 0.05)';
  return [
    // faint static stars (calm, sub-pixel soft — no pixel look)
    'radial-gradient(1px 1px at 18% 22%, rgba(220, 216, 255, 0.22), transparent 70%)',
    'radial-gradient(1px 1px at 72% 14%, rgba(220, 216, 255, 0.16), transparent 70%)',
    'radial-gradient(1.2px 1.2px at 58% 38%, rgba(220, 216, 255, 0.12), transparent 70%)',
    'radial-gradient(1px 1px at 34% 46%, rgba(220, 216, 255, 0.10), transparent 70%)',
    // violet glow near the top
    `radial-gradient(90% 55% at 50% -8%, ${hexA(QUIET_SKY.violet, 0.75)}, transparent 70%)`,
    // indigo side glows
    `radial-gradient(60% 45% at 12% 8%, ${hexA(QUIET_SKY.indigo, 0.9)}, transparent 72%)`,
    `radial-gradient(55% 40% at 88% 12%, ${hexA(QUIET_SKY.indigo, 0.8)}, transparent 72%)`,
    // optional very faint domain tint, low in the sky
    `radial-gradient(80% 50% at 50% 110%, ${tint}, transparent 70%)`,
    // vertical fade: indigo top -> base bottom
    `linear-gradient(180deg, ${QUIET_SKY.indigo} 0%, #141330 38%, ${QUIET_SKY.base} 78%, ${QUIET_SKY.base} 100%)`
  ].join(', ');
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function applyQuietSky(sky: HTMLElement, domain: string): void {
  const st = sky.style;
  st.backgroundColor = QUIET_SKY.base;
  st.backgroundImage = quietSkyBackground(domain);
  st.backgroundSize = '100% 100%';
  st.backgroundRepeat = 'no-repeat';
  st.backgroundPosition = '0 0';
  // static sky: the legacy drifting starfield would shift the gradient layers
  st.animation = 'none';
  st.opacity = '1';
  sky.dataset.sky = 'quiet-light';
}

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

  applyQuietSky(root.querySelector('.play-sky') as HTMLElement, domain);

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

  const burst = (ok = true, origin?: { x: number; y: number }, opts?: { haptic?: boolean }) => {
    if (opts?.haptic !== false) vibrateForCue(ok ? 'hit' : 'miss', cuePrefs());
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
      if (comboAtMilestone(combo)) playCombo(combo);
    } else {
      playMiss();
    }
    showCombo(combo);
    root.classList.remove('pulse-ok', 'pulse-bad');
    void root.offsetWidth;
    root.classList.add(ok ? 'pulse-ok' : 'pulse-bad');
    burst(ok, undefined, { haptic: false });
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
