export type Direction = 'U' | 'D' | 'L' | 'R';

export interface Rotor {
  r: number;
  c: number;
  angle: number;
  spin: 1 | -1;
  speed: number;
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
      
      const dr = r - rot.r;
      const dc = c - rot.c;
      if (Math.abs(dr) + Math.abs(dc) === 1) {
        let targetAngle = 0;
        if (dr === -1) targetAngle = 0;
        else if (dc === 1) targetAngle = 90;
        else if (dr === 1) targetAngle = 180;
        else if (dc === -1) targetAngle = 270;
        
        let diff = Math.abs((rot.angle - targetAngle + 540) % 360 - 180);
        if (diff <= 25) return true;
      }
    }
    return false;
  }

  tick(dtMs: number = 16) {
    if (this.status !== 'play') return;
    for (const rot of this.rotors) {
      rot.angle = (rot.angle + rot.spin * (rot.speed || 90) * (dtMs / 1000) + 360) % 360;
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
