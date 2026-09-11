import { ExerciseManifest } from '../contract';

export const motifFlipManifest: ExerciseManifest = {
  id: 'motif-flip',
  name: 'Смена мотива',
  domain: 'flexibility',
  skills: ['rule_switching', 'task_switching'],
  metricModel: 'speed-accuracy',
  instruction: 'Сопоставьте центральную карту с одной из нижних по текущему правилу (Цвет или Форма). Правило может меняться!'
};

export function getMotifFlipParams(level: number) {
  return {
    switchProbability: Math.min(0.8, 0.2 + level * 0.05)
  };
}
