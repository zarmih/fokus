import { pulleyManifest as manifest } from './manifest';
import { renderPulley as render } from './view';
import { ExerciseModule } from '../contract';

export const pulleyModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default pulleyModule;
