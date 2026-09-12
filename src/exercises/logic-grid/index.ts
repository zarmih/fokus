import { ExerciseModule } from '../contract';
import { renderLogicGrid } from './view';

const logicGridModule: ExerciseModule = {
  manifest: {
    id: 'logic-grid',
    name: 'Logic Grid',
    domain: 'memory',
    skills: ['working_memory'],
    metricModel: 'speed-accuracy',
    instruction: 'Запоминайте и отвечайте.'
  },
  render: renderLogicGrid
};
export default logicGridModule;
