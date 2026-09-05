import { SwingsEngine, Rotor } from './engine';

export const swingsManifest = {
  id: 'swings',
  name: 'Качели',
  domain: 'speed',
  instruction: 'Прыгай на перекладину. Мимо — сначала.'
};

export function getSwingsParams(level: number) {
  const l = Math.min(20, Math.max(1, level));
  const cols = l < 5 ? 4 : 5;
  const rows = l < 5 ? 3 : 4;
  
  while (true) {
    const startR = Math.floor(Math.random() * rows);
    const goalR = Math.floor(Math.random() * rows);
    const rotors: Rotor[] = [];
    
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (Math.random() < 0.8) {
          rotors.push({
            r, c, 
            angle: Math.floor(Math.random() * 4) * 90,
            spin: Math.random() < 0.5 ? 1 : -1,
            period: l < 10 ? (Math.random() < 0.5 ? 2 : 3) : (Math.random() < 0.7 ? 1 : 2),
            ticks: 0
          });
        }
      }
    }
    
    if (hasPath({ rows, cols, startR, goalR, rotors })) {
      const tickMs = Math.max(450, 900 - (l - 1) * 30);
      return { rows, cols, startR, goalR, rotors, tickMs, targetMs: 70000, deadlineMs: 70000 };
    }
  }
}

function hasPath(params: { rows: number, cols: number, startR: number, goalR: number, rotors: Rotor[] }): boolean {
  const maxTicks = 24;
  const engine = new SwingsEngine();
  engine.generate(params);
  
  const grids: boolean[][][] = [];
  for (let t = 0; t < maxTicks; t++) {
    const grid: boolean[][] = [];
    for (let r = 0; r < params.rows; r++) {
      grid[r] = [];
      for (let c = 0; c < params.cols; c++) {
        grid[r][c] = engine.occupied(r, c);
      }
    }
    grids.push(grid);
    engine.tick();
  }

  const visited = new Set<string>();
  const q = [{ r: params.startR, c: 0, t: 0 }];
  visited.add(`${params.startR},0,0`);
  
  let head = 0;
  while(head < q.length) {
    const { r, c, t } = q[head++];
    if (r === params.goalR && c === params.cols - 1) return true;
    
    const moves = [[-1,0], [1,0], [0,-1], [0,1]];
    for (const [dr, dc] of moves) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < params.rows && nc >= 0 && nc < params.cols) {
        if (grids[t][nr][nc]) {
          const k = `${nr},${nc},${t}`;
          if (!visited.has(k)) {
            visited.add(k);
            q.push({ r: nr, c: nc, t });
          }
        }
      }
    }
    
    const nt = (t + 1) % maxTicks;
    if (grids[nt][r][c]) {
      const k = `${r},${c},${nt}`;
      if (!visited.has(k)) {
        visited.add(k);
        q.push({ r, c, t: nt });
      }
    }
  }
  return false;
}
