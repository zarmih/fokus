export interface MathState {
  level: number;
  equation: string;
  isCorrect: boolean;
  round: number;
  maxRounds: number;
  correctAnswers: number;
  reactionTimes: number[];
  lastStartTime: number;
  status: 'playing' | 'done';
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateEquation(level: number): { equation: string; isCorrect: boolean } {
  let a, b, op, realAns;
  const isCorrect = Math.random() > 0.5;

  if (level <= 2) {
    a = randomInt(1, 10);
    b = randomInt(1, 10);
    op = '+';
    realAns = a + b;
  } else if (level <= 5) {
    op = Math.random() > 0.5 ? '+' : '-';
    a = randomInt(5, 30);
    b = randomInt(5, 30);
    if (op === '-' && a < b) { const t = a; a = b; b = t; }
    realAns = op === '+' ? a + b : a - b;
  } else if (level <= 10) {
    const ops = ['+', '-', '*'];
    op = ops[randomInt(0, 2)];
    if (op === '*') {
      a = randomInt(2, 9);
      b = randomInt(2, 9);
      realAns = a * b;
    } else {
      a = randomInt(10, 50);
      b = randomInt(10, 50);
      if (op === '-' && a < b) { const t = a; a = b; b = t; }
      realAns = op === '+' ? a + b : a - b;
    }
  } else {
    const ops = ['+', '-', '*'];
    op = ops[randomInt(0, 2)];
    if (op === '*') {
      a = randomInt(3, 15);
      b = randomInt(3, 12);
      realAns = a * b;
    } else {
      a = randomInt(20, 100);
      b = randomInt(20, 100);
      if (op === '-' && a < b) { const t = a; a = b; b = t; }
      realAns = op === '+' ? a + b : a - b;
    }
  }

  let displayedAns = realAns;
  if (!isCorrect) {
    const offset = randomInt(1, 3) * (Math.random() > 0.5 ? 1 : -1);
    displayedAns = realAns + offset;
    if (displayedAns < 0) displayedAns = realAns + randomInt(1, 4);
  }

  return {
    equation: `${a} ${op === '*' ? '×' : op} ${b} = ${displayedAns}`,
    isCorrect
  };
}

export function initGame(level: number): MathState {
  const eq = generateEquation(level);
  return {
    level,
    equation: eq.equation,
    isCorrect: eq.isCorrect,
    round: 1,
    maxRounds: 15,
    correctAnswers: 0,
    reactionTimes: [],
    lastStartTime: Date.now(),
    status: 'playing'
  };
}

export function submitAnswer(state: MathState, answer: boolean): MathState {
  if (state.status !== 'playing') return state;
  const rt = Date.now() - state.lastStartTime;
  state.reactionTimes.push(rt);

  if (answer === state.isCorrect) {
    state.correctAnswers++;
  }

  if (state.round >= state.maxRounds) {
    state.status = 'done';
  } else {
    state.round++;
    const eq = generateEquation(state.level);
    state.equation = eq.equation;
    state.isCorrect = eq.isCorrect;
    state.lastStartTime = Date.now();
  }
  return state;
}

export function getStats(state: MathState) {
  const avg = state.reactionTimes.reduce((a, b) => a + b, 0) / Math.max(1, state.reactionTimes.length);
  return {
    accuracy: state.correctAnswers / state.maxRounds,
    avgRtMs: avg
  };
}
