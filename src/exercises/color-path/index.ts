import { ExerciseModule } from '../contract';
import { renderColorPath } from './view';

const colorPathModule: ExerciseModule = {
  manifest: {
    id: 'color-path',
    name: 'Color Path',
    domain: 'speed',
    skills: ['processing_speed'],
    metricModel: 'speed-accuracy',
    instruction: 'Жмите на зеленые квадраты.'
  },
  render: renderColorPath
};
export default colorPathModule;
