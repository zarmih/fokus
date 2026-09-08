import type { ExerciseManifest } from '../types';

export const verbalFluencyManifest: ExerciseManifest = {
  id: 'verbal-fluency',
  name: 'Вербальная беглость',
  domain: 'flexibility',
  skills: ['recall', 'cognitive_flexibility'],
  metricModel: 'speed-accuracy',
  instruction: 'Назовите как можно больше ЖИВОТНЫХ за отведенное время. Нажмите "Говорить" и произносите слова чётко.',
  levels: {
    1: { duration: 20 },
    2: { duration: 30 },
    3: { duration: 45 },
  }
};
