export const pulleyManifest = {
  id: 'pulley',
  name: 'Шкив',
  domain: 'logic',
  instruction: 'Подвесь ровно столько, сколько нужно двери. Лишнее — канат не тянет как надо.'
};

export function getPulleyParams(level: number) {
  const l = Math.min(20, Math.max(1, level));
  let doors = 1;
  let pool = [1, 2];
  let need = [3];
  
  if (l === 1) { doors = 1; pool = [1, 2]; need = [3]; }
  else if (l === 2) { doors = 1; pool = [2, 3]; need = [5]; }
  else if (l === 3) { doors = 1; pool = [1, 1, 2, 3]; need = [4]; }
  else if (l === 4) { doors = 1; pool = [2, 3, 4, 1]; need = [6]; }
  else if (l === 5) { doors = 1; pool = [1, 2, 3, 4, 5]; need = [8]; }
  else if (l === 6) { doors = 2; pool = [1, 2, 3, 4]; need = [3, 4]; }
  else {
    doors = l < 12 ? 2 : 3;
    pool = [];
    need = [];
    let parts = [];
    for(let i=0; i<doors; i++) {
      const n = 3 + Math.floor(Math.random() * 5); // 3..7
      need.push(n);
      const p1 = Math.max(1, Math.floor(n / 2));
      const p2 = n - p1;
      parts.push(p1, p2);
    }
    pool = [...parts];
    const extra = Math.floor(l / 4);
    for(let i=0; i<extra; i++) pool.push(1 + Math.floor(Math.random() * 3));
    
    for(let i=pool.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  const deadlineMs = Math.max(12000, 25000 - (l - 1) * 800);
  return { doors, pool, need, deadlineMs, targetMs: deadlineMs * 0.7 };
}
