import { renderHelixFlip } from './view';
import { manifest } from './manifest';
import { ExerciseModule } from '../contract';

export const helixFlipModule: ExerciseModule = {
  manifest: manifest as any,
  render: renderHelixFlip as any
};
export default helixFlipModule;
