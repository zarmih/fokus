export interface WaveLockState {
  level: number;
  targetCenter: number;
  targetWidth: number;
  speed: number;
  rounds: number;
  correct: number;
  rts: number[];
  phase: 'wait' | 'move' | 'result';
  lastStart: number;
}

export function initGame(level: number): WaveLockState {
  return {
    level,
    targetCenter: 50,
    targetWidth: 20,
    speed: 0.5 + level * 0.1,
    rounds: 0,
    correct: 0,
    rts: [],
    phase: 'wait',
    lastStart: 0
  };
}

export function startRound(state: WaveLockState): WaveLockState {
  state.phase = 'move';
  state.targetWidth = Math.max(5, 30 - state.level * 2);
  state.targetCenter = 30 + Math.random() * 40;
  state.lastStart = performance.now();
  return state;
}

export function handleHit(state: WaveLockState, wavePos: number): WaveLockState {
  if (state.phase !== 'move') return state;
  state.phase = 'result';
  state.rounds++;
  const rt = performance.now() - state.lastStart;
  state.rts.push(rt);

  const leftBound = state.targetCenter - state.targetWidth / 2;
  const rightBound = state.targetCenter + state.targetWidth / 2;

  if (wavePos >= leftBound && wavePos <= rightBound) {
    state.correct++;
  }
  return state;
}

export function getStats(state: WaveLockState) {
  const accuracy = state.rounds > 0 ? state.correct / state.rounds : 0;
  const avgRtMs = state.rts.length > 0 ? state.rts.reduce((a,b)=>a+b,0)/state.rts.length : 1500;
  return { accuracy, avgRtMs, rounds: state.rounds };
}
