import { posnerManifest as manifest } from './manifest';
import { renderPosner as render } from './view';
import { ExerciseModule } from '../contract';

export const posnerModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default posnerModule;
