import { dialFlipManifest as manifest } from './manifest';
import { renderDialFlip as render } from './view';
import { ExerciseModule } from '../contract';

export const dialFlipModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default dialFlipModule;
