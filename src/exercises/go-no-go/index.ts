import { goNoGoManifest as manifest } from './manifest';
import { renderGoNoGo as render } from './view';
import { ExerciseModule } from '../contract';

export const goNoGoModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default goNoGoModule;
