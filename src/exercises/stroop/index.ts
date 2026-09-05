import { stroopManifest as manifest } from './manifest';
import { renderStroop as render } from './view';
import { ExerciseModule } from '../contract';

export const stroopModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default stroopModule;
