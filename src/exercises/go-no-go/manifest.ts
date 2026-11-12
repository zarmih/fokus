import type { ExerciseManifest } from '../types';

export const goNoGoManifest: ExerciseManifest = {
  id: 'go-no-go',
  name: 'Go / No-Go',
  domain: 'attention',
  skills: ['inhibition', 'sustained_attention'],
  metricModel: 'speed-accuracy',
  instruction: 'Появился зелёный круг со стрелкой ▶ — нажмите «Жми». Красный квадрат со знаком ✕ — ничего не нажимайте. Без нажатий блок не засчитывается.',
  levels: {
    1: { trials: 15, noGoRatio: 0.2 },
    2: { trials: 20, noGoRatio: 0.3 },
    3: { trials: 30, noGoRatio: 0.4 },
  }
};
