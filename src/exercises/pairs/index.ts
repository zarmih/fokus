import { pairsManifest as manifest } from './manifest';
import { renderPairs as render } from './view';
import { ExerciseModule } from '../contract';

export const pairsModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default pairsModule;
