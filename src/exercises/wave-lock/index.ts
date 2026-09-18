import { waveLockManifest as manifest } from './manifest';
import { renderWaveLock as render } from './view';
import { ExerciseModule } from '../contract';

export const waveLockModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default waveLockModule;
