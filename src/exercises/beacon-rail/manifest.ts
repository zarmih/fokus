import { ExerciseManifest } from '../contract';

export const beaconRailManifest: ExerciseManifest = {
  id: 'beacon-rail',
  name: 'Маяк-рельс',
  domain: 'attention',
  skills: ['selective_attention', 'inhibition'],
  metricModel: 'timing-precision',
  instruction: 'Нажимайте кнопку только тогда, когда заданный маяк (цветной круг) достигает центральной зоны.'
};

export function getBeaconRailParams(level: number) {
  return {
    speedMs: Math.max(500, 1500 - level * 100),
    targetProbability: 0.3
  };
}
