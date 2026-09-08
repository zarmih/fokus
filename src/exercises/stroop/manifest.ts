import type { ExerciseManifest } from '../types';

export const stroopManifest: ExerciseManifest = {
  id: 'stroop',
  name: 'Чернила',
  domain: 'flexibility',
  skills: ['selective_attention', 'inhibition', 'processing_speed'],
  metricModel: 'speed-accuracy',
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
    11: { deadlineMs: 1080, incongruentPct: 0.8, colors: 4, targetMs: 830 },
    12: { deadlineMs: 1060, incongruentPct: 0.85, colors: 4, targetMs: 810 },
    13: { deadlineMs: 1040, incongruentPct: 0.85, colors: 4, targetMs: 790 },
    14: { deadlineMs: 1020, incongruentPct: 0.9, colors: 4, targetMs: 770 },
    15: { deadlineMs: 1000, incongruentPct: 0.9, colors: 4, targetMs: 750 },
    16: { deadlineMs: 980, incongruentPct: 0.9, colors: 4, targetMs: 730 },
    17: { deadlineMs: 960, incongruentPct: 0.95, colors: 4, targetMs: 710 },
    18: { deadlineMs: 940, incongruentPct: 0.95, colors: 4, targetMs: 690 },
    19: { deadlineMs: 920, incongruentPct: 1.0, colors: 4, targetMs: 670 },
    20: { deadlineMs: 900, incongruentPct: 1.0, colors: 4, targetMs: 650 }
  }
};

export function getStroopParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return stroopManifest.levels![lvl as keyof typeof stroopManifest.levels];
}
