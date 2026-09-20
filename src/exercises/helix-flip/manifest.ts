import type { ExerciseManifest } from '../types';

export const manifest: ExerciseManifest = {
  id: 'helix-flip',
  name: 'Вращение Правил',
  domain: 'flexibility',
  skills: ['cognitive_flexibility', 'rule_switching', 'reaction_speed'],
  metricModel: 'speed-accuracy',
  instruction: 'Сравни две фигуры по текущему правилу (Цвет или Форма). Правило может внезапно измениться!',
  levels: {
    1: { switchChance: 0.1 },
    2: { switchChance: 0.2 },
    3: { switchChance: 0.25 },
    4: { switchChance: 0.3 },
    5: { switchChance: 0.35 },
    6: { switchChance: 0.4 },
    7: { switchChance: 0.45 },
    8: { switchChance: 0.5 },
    9: { switchChance: 0.6 },
  }
};

export function getHelixFlipParams(level: number) {
  const cfg = manifest.levels![level] || manifest.levels![9];
  return { switchChance: cfg.switchChance };
}
