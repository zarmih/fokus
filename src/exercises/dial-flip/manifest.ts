import type { ExerciseManifest } from '../types';

export const dialFlipManifest: ExerciseManifest = {
  id: 'dial-flip',
  name: 'Циферблат',
  domain: 'flexibility',
  skills: ['task_switching', 'rule_switching', 'cognitive_flexibility'],
  metricModel: 'speed-accuracy',
  instruction: 'Следуй правилу: если фон синий, нажми цифру, на которую указывает стрелка. Если фон оранжевый, нажми противоположную цифру.',
  levels: {
    1: { rules: 1, durationMs: 4000 },
    2: { rules: 2, durationMs: 3800 },
    3: { rules: 2, durationMs: 3500 },
    4: { rules: 2, durationMs: 3200 },
    5: { rules: 2, durationMs: 3000 },
    6: { rules: 2, durationMs: 2800 },
    7: { rules: 2, durationMs: 2500 },
    8: { rules: 2, durationMs: 2200 },
    9: { rules: 2, durationMs: 2000 },
    10: { rules: 2, durationMs: 1800 },
    11: { rules: 2, durationMs: 1700 },
    12: { rules: 2, durationMs: 1600 },
    13: { rules: 2, durationMs: 1500 },
    14: { rules: 2, durationMs: 1400 },
    15: { rules: 2, durationMs: 1300 },
    16: { rules: 2, durationMs: 1200 },
    17: { rules: 2, durationMs: 1100 },
    18: { rules: 2, durationMs: 1000 },
    19: { rules: 2, durationMs: 900 },
    20: { rules: 2, durationMs: 800 }
  }
};

export function getDialFlipParams(level: number) {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return dialFlipManifest.levels![lvl as keyof typeof dialFlipManifest.levels];
}
