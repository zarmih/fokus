export function isSolvable(need: number[], pool: number[]): boolean {
  let found = false;
  
  function backtrack(doorIdx: number, currentPool: number[]) {
    if (found) return;
    if (doorIdx === need.length) {
      found = true;
      return;
    }
    
    const target = need[doorIdx];
    
    for (let i = 0; i < currentPool.length; i++) {
      if (currentPool[i] === target) {
        const nextPool = [...currentPool];
        nextPool.splice(i, 1);
        backtrack(doorIdx + 1, nextPool);
      }
    }
    
    if (found) return;
    
    for (let i = 0; i < currentPool.length; i++) {
      for (let j = i + 1; j < currentPool.length; j++) {
        if (currentPool[i] + currentPool[j] === target) {
          const nextPool = [...currentPool];
          nextPool.splice(j, 1);
          nextPool.splice(i, 1);
          backtrack(doorIdx + 1, nextPool);
        }
      }
    }
  }
  
  backtrack(0, pool);
  return found;
}

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
    if (this.gates[this.playerAt].hook.length >= 2) return false;
    const w = this.floor.splice(idx, 1)[0];
    this.gates[this.playerAt].hook.push(w);
    return true;
  }

  dropHook(hookIdx: number): boolean {
    if (this.status !== 'play') return false;
    const currentGate = this.gates[this.playerAt];
    if (hookIdx < 0 || hookIdx >= currentGate.hook.length) return false;
    
    const w = currentGate.hook.splice(hookIdx, 1)[0];
    this.floor.push(w);
    return true;
  }

  dumpAllToFloor() {
    for (const gate of this.gates) {
      this.floor.push(...gate.hook);
      gate.hook = [];
    }
    this.playerAt = 0;
    this.status = 'play';
  }

  walk(): boolean {
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
