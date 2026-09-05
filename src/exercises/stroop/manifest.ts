import type { ExerciseManifest } from '../types';

export const stroopManifest: ExerciseManifest = {
  id: 'stroop',
  name: 'Чернила',
  domain: 'flexibility',
  instruction: 'Нажми цвет букв, не читай слово.',
  levels: {
    1: { deadlineMs: 2200, incongruentPct: 0.3, colors: 3, targetMs: 1800 },
    2: { deadlineMs: 2000, incongruentPct: 0.4, colors: 3, targetMs: 1600 },
    3: { deadlineMs: 1800, incongruentPct: 0.5, colors: 3, targetMs: 1400 },
    4: { deadlineMs: 1600, incongruentPct: 0.6, colors: 3, targetMs: 1200 },
    5: { deadlineMs: 1500, incongruentPct: 0.7, colors: 3, targetMs: 1100 },
    6: { deadlineMs: 1500, incongruentPct: 0.5, colors: 4, targetMs: 1100 },
    7: { deadlineMs: 1400, incongruentPct: 0.6, colors: 4, targetMs: 1000 },
    8: { deadlineMs: 1300, incongruentPct: 0.7, colors: 4, targetMs: 950 },
    9: { deadlineMs: 1200, incongruentPct: 0.7, colors: 4, targetMs: 900 },
    10: { deadlineMs: 1100, incongruentPct: 0.8, colors: 4, targetMs: 850 },
    11: { deadlineMs: 1050, incongruentPct: 0.8, colors: 4, targetMs: 800 },
    12: { deadlineMs: 1000, incongruentPct: 0.8, colors: 4, targetMs: 750 },
    13: { deadlineMs: 950, incongruentPct: 0.8, colors: 4, targetMs: 700 },
    14: { deadlineMs: 900, incongruentPct: 0.9, colors: 4, targetMs: 650 },
    15: { deadlineMs: 850, incongruentPct: 0.9, colors: 4, targetMs: 600 },
    16: { deadlineMs: 800, incongruentPct: 0.9, colors: 4, targetMs: 550 },
    17: { deadlineMs: 750, incongruentPct: 1.0, colors: 4, targetMs: 500 },
    18: { deadlineMs: 700, incongruentPct: 1.0, colors: 4, targetMs: 450 },
    19: { deadlineMs: 650, incongruentPct: 1.0, colors: 4, targetMs: 400 },
    20: { deadlineMs: 600, incongruentPct: 1.0, colors: 4, targetMs: 350 }
  }
};

export function getStroopParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return stroopManifest.levels[lvl as keyof typeof stroopManifest.levels];
}
