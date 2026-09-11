import { hingeSwapManifest as manifest } from './manifest';
import { renderHingeSwap as render } from './view';
import { ExerciseModule } from '../contract';

export const hingeSwapModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default hingeSwapModule;
