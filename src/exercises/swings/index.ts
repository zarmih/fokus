import { swingsManifest as manifest } from './manifest';
import { renderSwings as render } from './view';
import { ExerciseModule } from '../contract';

export const swingsModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default swingsModule;
