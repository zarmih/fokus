export class PulleyEngine {
  gates: { id: number, need: number, hook: number[] }[] = [];
  floor: number[] = [];
  playerAt = 0;
  status: 'play' | 'win' | 'stuck' = 'play';

  generate(params: { doors: number, pool: number[], need: number[] }) {
    this.gates = [];
    for (let i = 0; i < params.doors; i++) {
      this.gates.push({ id: i, need: params.need[i] || 3, hook: [] });
    }
    this.floor = [...params.pool];
    this.playerAt = 0;
    this.status = 'play';
  }

  takeFloor(idx: number) {
    if (this.status !== 'play' || this.playerAt >= this.gates.length) return false;
    if (idx < 0 || idx >= this.floor.length) return false;
    const w = this.floor.splice(idx, 1)[0];
    this.gates[this.playerAt].hook.push(w);
    return true;
  }

  dropHook(idx: number) {
    if (this.status !== 'play' || this.playerAt >= this.gates.length) return false;
    const hook = this.gates[this.playerAt].hook;
    if (idx < 0 || idx >= hook.length) return false;
    const w = hook.splice(idx, 1)[0];
    this.floor.push(w);
    return true;
  }

  walk() {
    if (this.status !== 'play' || this.playerAt >= this.gates.length) return false;
    const hookSum = this.gates[this.playerAt].hook.reduce((a, b) => a + b, 0);
    if (hookSum === this.gates[this.playerAt].need) {
      this.playerAt++;
      if (this.playerAt >= this.gates.length) {
        this.status = 'win';
      }
      return true;
    }
    return false;
  }
}
