import { renderEmberLane } from './view';
import { manifest } from './manifest';
import { ExerciseModule } from '../contract';

export const emberLaneModule: ExerciseModule = {
  manifest: manifest as any,
  render: renderEmberLane as any
};
export default emberLaneModule;
