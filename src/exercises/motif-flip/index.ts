import { motifFlipManifest as manifest } from './manifest';
import { renderMotifFlip as render } from './view';
import { ExerciseModule } from '../contract';

export const motifFlipModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default motifFlipModule;
