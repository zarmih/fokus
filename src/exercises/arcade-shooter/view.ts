import { manifest } from './manifest';
import type { BlockResult } from '../contract';

export function renderArcadeShooter(
  container: HTMLElement,
  difficulty: number,
  onEnd: (res: BlockResult) => void,
  isTimeUp: () => boolean
) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'width: 100%; height: 100%; display: block; background: #0f172a; border-radius: 16px; overflow: hidden;';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  let width = 0;
  let height = 0;

  const resize = () => {
    const rect = container.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };
  window.addEventListener('resize', resize);
  resize();

  const levelIdx = Math.min(Math.floor(difficulty), manifest.levels.length - 1);
  const cfg = manifest.levels[levelIdx];

  const state = {
    shipX: width / 2,
    bullets: [] as {x: number, y: number}[],
    enemies: [] as {id: number, x: number, y: number, hp: number}[],
    particles: [] as {x: number, y: number, vx: number, vy: number, life: number}[],
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
    state.shipX = Math.max(20, Math.min(width - 20, clientX - rect.left));
  };

  const handlePointer = (e: PointerEvent) => onMove(e.clientX);
  canvas.addEventListener('pointermove', handlePointer);
  canvas.addEventListener('pointerdown', handlePointer);

  let animationId = 0;

  const loop = () => {
    if (!state.running) return;

    if (isTimeUp()) {
      endGame();
      return;
    }

    const now = Date.now();
    ctx.clearRect(0, 0, width, height);

    // Stars background
    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < 20; i++) {
      const sx = (Date.now() / 10 + i * 123) % width;
      const sy = (Date.now() / 5 + i * 321) % height;
      ctx.fillRect(sx, sy, 2, 2);
    }

    // Spawn enemies
    if (now - state.lastSpawn > cfg.spawnRateMs) {
      state.lastSpawn = now;
      state.enemies.push({
        id: state.enemyIdCounter++,
        x: 30 + Math.random() * (width - 60),
        y: -30,
        hp: 1
      });
    }

    // Auto shoot
    if (now - state.lastShot > 200) {
      state.lastShot = now;
      state.bullets.push({ x: state.shipX, y: height - 50 });
      import('../../core/audio').then(a => a.playTick()).catch(() => {});
    }

    // Update bullets
    ctx.fillStyle = '#38bdf8';
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const b = state.bullets[i];
      b.y -= 10;
      if (b.y < -10) {
        state.bullets.splice(i, 1);
        state.misses++;
        continue;
      }
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Check collision
      for (let j = state.enemies.length - 1; j >= 0; j--) {
        const e = state.enemies[j];
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy < 900) {
          // Hit!
          state.hits++;
          for(let k=0; k<10; k++) {
            state.particles.push({
              x: e.x, y: e.y,
              vx: (Math.random() - 0.5) * 5,
              vy: (Math.random() - 0.5) * 5,
              life: 1.0
            });
          }
          state.enemies.splice(j, 1);
          state.bullets.splice(i, 1);
          import('../../core/audio').then(a => a.playBeep(true)).catch(() => {});
          break;
        }
      }
    }

    // Update enemies
    ctx.fillStyle = '#f43f5e';
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      e.y += cfg.speedBase;
      if (e.y > height + 30) {
        state.enemies.splice(i, 1);
        state.escaped++;
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(e.x, e.y + 15);
      ctx.lineTo(e.x - 15, e.y - 15);
      ctx.lineTo(e.x + 15, e.y - 15);
      ctx.fill();
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.05;
      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }
      ctx.fillStyle = `rgba(245, 158, 11, ${p.life})`;
      ctx.fillRect(p.x, p.y, 3, 3);
    }

    // Draw ship
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(state.shipX, height - 60);
    ctx.lineTo(state.shipX - 20, height - 20);
    ctx.lineTo(state.shipX + 20, height - 20);
    ctx.fill();

    animationId = requestAnimationFrame(loop);
  };

  const endGame = () => {
    state.running = false;
    cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointermove', handlePointer);
    canvas.removeEventListener('pointerdown', handlePointer);

    const totalPossible = state.hits + state.escaped;
    const acc = totalPossible === 0 ? 0 : state.hits / totalPossible;
    
    // Penalty for missed bullets (spraying randomly)
    // Actually in an auto-shooter, misses are just wasted bullets.
    // Let's not penalize bullets, only escaped enemies.
    onEnd({
      accuracy: acc,
      avgRtMs: cfg.targetMs, // In arcade games, RT is abstract
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
  };
}
