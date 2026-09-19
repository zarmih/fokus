import { dominantColorManifest as manifest } from './manifest';
import { renderDominantColor as render } from './view';
import { ExerciseModule } from '../contract';

export const dominantColorModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default dominantColorModule;
