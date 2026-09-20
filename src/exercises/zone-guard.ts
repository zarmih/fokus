import { ExerciseModule, BlockResult } from './contract';

const zoneGuardModule: ExerciseModule = {
  manifest: {
    id: 'zone-guard',
    name: 'Страж зоны',
    domain: 'attention',
    skills: ['sustained_attention', 'selective_attention'],
    metricModel: 'speed-accuracy',
    instruction: 'Защищайте центр от красных объектов! Нажимайте только на красные угрозы и пропускайте остальные.'
  },
  render(el, level, onEnd, isTimeUp) {
    el.innerHTML = '';
    
    let rounds = 0;
    let accuracy = 0;
    let avgRtMs = 0;
    let totalAttempts = 0;
    let isRunning = true;
    
    const container = document.createElement('div');
    container.style.position = 'relative';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'hidden';
    container.style.backgroundColor = 'var(--bg)';
    
    const zone = document.createElement('div');
    zone.style.position = 'absolute';
    zone.style.width = '80px';
    zone.style.height = '80px';
    zone.style.left = '50%';
    zone.style.top = '50%';
    zone.style.transform = 'translate(-50%, -50%)';
    zone.style.borderRadius = '50%';
    zone.style.border = '4px solid var(--primary)';
    zone.style.backgroundColor = 'transparent';
    zone.style.boxSizing = 'border-box';
    container.appendChild(zone);
    
    el.appendChild(container);

    interface Entity {
      el: HTMLElement;
      x: number;
      y: number;
      vx: number;
      vy: number;
      isThreat: boolean;
      active: boolean;
      spawnTime: number;
    }
    
    let entities: Entity[] = [];
    let lastSpawn = 0;
    
    const baseSpeed = 1 + level * 0.2;
    const spawnRateMs = Math.max(500, 1500 - level * 100);
    
    function spawnEntity() {
      const isThreat = Math.random() > 0.5;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.max(window.innerWidth, window.innerHeight) / 2 + 50;
      
      const startX = window.innerWidth / 2 + Math.cos(angle) * dist;
      const startY = window.innerHeight / 2 + Math.sin(angle) * dist;
      
      const dx = window.innerWidth / 2 - startX;
      const dy = window.innerHeight / 2 - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      
      const vx = (dx / length) * baseSpeed;
      const vy = (dy / length) * baseSpeed;
      
      const entityEl = document.createElement('div');
      entityEl.style.position = 'absolute';
      entityEl.style.width = '40px';
      entityEl.style.height = '40px';
      entityEl.style.borderRadius = '50%';
      entityEl.style.backgroundColor = isThreat ? 'var(--error)' : 'var(--success)';
      entityEl.style.transform = 'translate(-50%, -50%)';
      entityEl.style.cursor = 'pointer';
      
      const entity: Entity = {
        el: entityEl,
        x: startX,
        y: startY,
        vx,
        vy,
        isThreat,
        active: true,
        spawnTime: Date.now()
      };
      
      entityEl.onmousedown = (e) => {
        e.preventDefault();
        handleInteraction(entity);
      };
      entityEl.ontouchstart = (e) => {
        e.preventDefault();
        handleInteraction(entity);
      };
      
      container.appendChild(entityEl);
      entities.push(entity);
    }
    
    function handleInteraction(entity: Entity) {
      if (!entity.active || !isRunning) return;
      entity.active = false;
      
      totalAttempts++;
      const rt = Date.now() - entity.spawnTime;
      avgRtMs = avgRtMs === 0 ? rt : (avgRtMs + rt) / 2;
      
      if (entity.isThreat) {
        accuracy++;
        entity.el.style.backgroundColor = 'var(--primary)';
        entity.el.style.transform = 'translate(-50%, -50%) scale(1.5)';
        entity.el.style.opacity = '0';
      } else {
        // false alarm
        showFeedback(false);
        entity.el.style.backgroundColor = 'var(--error)';
      }
      
      setTimeout(() => {
        if (container.contains(entity.el)) {
          container.removeChild(entity.el);
        }
      }, 300);
    }
    
    function showFeedback(positive: boolean) {
      zone.style.borderColor = positive ? 'var(--success)' : 'var(--error)';
      zone.style.transform = positive ? 'translate(-50%, -50%) scale(1.1)' : 'translate(-50%, -50%) scale(0.9)';
      setTimeout(() => {
        if (!isRunning) return;
        zone.style.borderColor = 'var(--primary)';
        zone.style.transform = 'translate(-50%, -50%) scale(1)';
      }, 200);
    }
    
    let reqId: number;
    function loop(now: number) {
      if (!isRunning) return;
      
      if (isTimeUp()) {
        finish();
        return;
      }
      
      if (now - lastSpawn > spawnRateMs) {
        spawnEntity();
        lastSpawn = now;
        rounds++;
      }
      
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      for (let i = entities.length - 1; i >= 0; i--) {
        const entity = entities[i];
        if (!entity.active) continue;
        
        entity.x += entity.vx;
        entity.y += entity.vy;
        entity.el.style.left = `${entity.x}px`;
        entity.el.style.top = `${entity.y}px`;
        
        const dx = entity.x - centerX;
        const dy = entity.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 40) {
          entity.active = false;
          if (entity.isThreat) {
            totalAttempts++;
            showFeedback(false); // Missed threat
          } else {
            // Ignored safe correctly
            accuracy++;
            totalAttempts++;
            showFeedback(true);
          }
          container.removeChild(entity.el);
          entities.splice(i, 1);
        }
      }
      
      reqId = requestAnimationFrame(loop);
    }
    
    reqId = requestAnimationFrame(loop);

    function finish() {
      isRunning = false;
      cancelAnimationFrame(reqId);
      
      entities.forEach(e => {
        if (container.contains(e.el)) {
          container.removeChild(e.el);
        }
      });
      entities = [];
      
      const acc = totalAttempts > 0 ? accuracy / totalAttempts : 0;
      onEnd({
        accuracy: acc,
        avgRtMs,
        rounds
      });
    }

    return finish;
  }
};

export default zoneGuardModule;
