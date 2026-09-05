export const pulleyManifest = {
  id: 'pulley',
  name: 'Шкив',
  domain: 'logic',
  instruction: 'Подвесь ровно столько, сколько нужно двери. Лишнее — канат не тянет как надо.'
};

export function getPulleyParams(level: number) {
  const l = Math.min(20, Math.max(1, level));
  let doors = 3;
  let pool = [1, 2];
  let need = [3];
  
  if (l === 1) { doors = 3; need = [2,3,4]; pool = [1,1,2,2,3]; }
  else if (l === 2) { doors = 3; need = [3,3,5]; pool = [1,2,2,3,3]; }
  else if (l === 3) { doors = 3; need = [4,5,6]; pool = [1,2,3,4,5]; }
  else {
    doors = l < 10 ? 3 : 4;
    pool = [];
    need = [];
    for(let i=0; i<doors; i++) {
      const parts = Math.random() < 0.5 ? 1 : (Math.random() < 0.8 ? 2 : 3);
      let sum = 0;
      for(let p=0; p<parts; p++) {
        const w = 1 + Math.floor(Math.random() * (l > 10 ? 6 : 4));
        pool.push(w);
        sum += w;
      }
      need.push(sum);
    }
    const extra = 1 + Math.floor(l / 6);
    for(let i=0; i<extra; i++) pool.push(1 + Math.floor(Math.random() * 4));
    
    for(let i=pool.length-1; i>0; i--) {
      const j = Math.floor(Math.random() * (i+1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  }

  const deadlineMs = Math.max(15000, 30000 - (l - 1) * 800);
  return { doors, pool, need, deadlineMs, targetMs: deadlineMs * 0.7 };
}
