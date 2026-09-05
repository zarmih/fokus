export type Direction = 'U' | 'D' | 'L' | 'R';

export interface Rotor {
  r: number;
  c: number;
  angle: number;
  spin: 1 | -1;
  period: number;
  ticks: number;
}

export class SwingsEngine {
  rows = 3;
  cols = 4;
  rotors: Rotor[] = [];
  playerR = 0;
  playerC = 0;
  startR = 0;
  startC = 0;
  goalR = 0;
  goalC = 0;
  fails = 0;
  status: 'play' | 'win' = 'play';

  generate(params: { rows: number, cols: number, startR: number, goalR: number, rotors: Rotor[] }) {
    this.rows = params.rows;
    this.cols = params.cols;
    this.startR = params.startR;
    this.startC = 0;
    this.playerR = this.startR;
    this.playerC = 0;
    this.goalR = params.goalR;
    this.goalC = params.cols - 1;
    this.rotors = JSON.parse(JSON.stringify(params.rotors));
    this.fails = 0;
    this.status = 'play';
  }

  occupied(r: number, c: number): boolean {
    if (r === this.startR && c === this.startC) return true;
    if (r === this.goalR && c === this.goalC) return true;
    
    for (const rot of this.rotors) {
      if (rot.r === r && rot.c === c) return true;
      let dr = 0, dc = 0;
      if (rot.angle === 0) dr = -1;
      else if (rot.angle === 90) dc = 1;
      else if (rot.angle === 180) dr = 1;
      else if (rot.angle === 270) dc = -1;
      
      if (rot.r + dr === r && rot.c + dc === c) return true;
    }
    return false;
  }

  tick() {
    if (this.status !== 'play') return;
    for (const rot of this.rotors) {
      rot.ticks++;
      if (rot.ticks >= rot.period) {
        rot.ticks = 0;
        rot.angle = (rot.angle + rot.spin * 90 + 360) % 360;
      }
    }
    if (!this.occupied(this.playerR, this.playerC)) {
      this.resetPlayer();
    }
  }

  jump(dir: Direction) {
    if (this.status !== 'play') return false;
    let nr = this.playerR;
    let nc = this.playerC;
    if (dir === 'U') nr--;
    if (dir === 'D') nr++;
    if (dir === 'L') nc--;
    if (dir === 'R') nc++;
    
    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) {
      return false;
    }
    
    if (!this.occupied(nr, nc)) {
      this.resetPlayer();
      return false;
    }
    
    this.playerR = nr;
    this.playerC = nc;
    if (this.playerR === this.goalR && this.playerC === this.goalC) {
      this.status = 'win';
    }
    return true;
  }

  resetPlayer() {
    this.fails++;
    this.playerR = this.startR;
    this.playerC = this.startC;
  }
}
