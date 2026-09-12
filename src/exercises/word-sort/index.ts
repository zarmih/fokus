import { ExerciseModule } from '../contract';
import { renderWordSort } from './view';

const wordSortModule: ExerciseModule = {
  manifest: {
    id: 'word-sort',
    name: 'Word Sort',
    domain: 'flexibility',
    skills: ['task_switching'],
    metricModel: 'speed-accuracy',
    instruction: 'Сортируйте буквы.'
  },
  render: renderWordSort
};
export default wordSortModule;
