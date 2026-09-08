import { manifest } from './manifest';
import type { BlockResult } from '../contract';
import { mountStage } from '../stage';

export function renderArcadeShooter(
  container: HTMLElement,
  difficulty: number,
  onEnd: (res: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const stage = mountStage(container, 'speed');
  stage.setStatus('Удерживайте прицел');
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width:100%;height:360px;display:block;border-radius:16px;';
  stage.board.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;
  let width = 0;
  let height = 0;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(280, rect.width);
    height = Math.max(280, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();

  const levelIdx = Math.min(Math.floor(difficulty), manifest.levels.length - 1);
  const cfg = manifest.levels[levelIdx];
  const state = {
    shipX: width / 2,
    bullets: [] as { x: number; y: number }[],
    enemies: [] as { id: number; x: number; y: number; hp: number }[],
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; c: string }[],
    lastSpawn: 0,
    lastShot: 0,
    hits: 0,
    misses: 0,
    escaped: 0,
    enemyIdCounter: 0,
    running: true
  };

  const onMove = (clientX: number) => {
    const rect = canvas.getBoundingClientRect();
    state.shipX = Math.max(22, Math.min(width - 22, clientX - rect.left));
  };
  const handlePointer = (e: PointerEvent) => onMove(e.clientX);
  canvas.addEventListener('pointermove', handlePointer);
  canvas.addEventListener('pointerdown', handlePointer);

  let animationId = 0;
  const glow = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const loop = () => {
    if (!state.running) return;
    if (isTimeUp()) { endGame(); return; }
    const now = Date.now();
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#0b1224');
    bg.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 36; i++) {
      const sx = (now / 18 + i * 97) % width;
      const sy = (now / 9 + i * 53) % height;
      ctx.fillStyle = `rgba(255,255,255,${0.15 + (i % 5) * 0.08})`;
      ctx.fillRect(sx, sy, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }

    if (now - state.lastSpawn > cfg.spawnRateMs) {
      state.lastSpawn = now;
      state.enemies.push({ id: state.enemyIdCounter++, x: 30 + Math.random() * (width - 60), y: -28, hp: 1 });
    }
    if (now - state.lastShot > 200) {
      state.lastShot = now;
      state.bullets.push({ x: state.shipX, y: height - 54 });
    }

    ctx.fillStyle = '#7dd3fc';
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.y -= 11;
      if (b.y < -12) { state.bullets.splice(i, 1); state.misses++; continue; }
      glow(b.x, b.y, 12, 'rgba(56,189,248,0.35)');
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy < 900) {
          state.hits++;
          for (let k = 0; k < 14; k++) {
            state.particles.push({
              x: e.x, y: e.y,
              vx: (Math.random() - 0.5) * 6,
              vy: (Math.random() - 0.5) * 6,
              life: 1,
              c: k % 2 ? '#f59e0b' : '#fb7185'
            });
          }
          state.enemies.splice(j, 1);
          state.bullets.splice(i, 1);
          import('../../core/audio').then(a => a.playBeep(true)).catch(() => {});
          break;
        }
      }
    }

    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.y += cfg.speedBase;
      if (e.y > height + 30) { state.enemies.splice(i, 1); state.escaped++; continue; }
      glow(e.x, e.y, 28, 'rgba(244,63,94,0.35)');
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 16);
      ctx.lineTo(e.x - 16, e.y - 14);
      ctx.lineTo(e.x + 16, e.y - 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(e.x - 4, e.y - 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 0.04;
      if (p.life <= 0) { state.particles.splice(i, 1); continue; }
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    glow(state.shipX, height - 42, 36, 'rgba(16,185,129,0.28)');
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.moveTo(state.shipX, height - 68);
    ctx.lineTo(state.shipX - 22, height - 22);
    ctx.lineTo(state.shipX + 22, height - 22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ecfdf5';
    ctx.fillRect(state.shipX - 3, height - 48, 6, 14);

    animationId = requestAnimationFrame(loop);
  };

  const endGame = () => {
    state.running = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointermove', handlePointer);
    canvas.removeEventListener('pointerdown', handlePointer);
    stage.cleanup();
    const totalPossible = state.hits + state.escaped;
    onEnd({
      accuracy: totalPossible === 0 ? 0 : state.hits / totalPossible,
      avgRtMs: cfg.targetMs,
      rounds: totalPossible
    });
  };

  animationId = requestAnimationFrame(loop);
  return () => {
    state.running = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointermove', handlePointer);
    canvas.removeEventListener('pointerdown', handlePointer);
    stage.cleanup();
  };
}
