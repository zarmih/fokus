import { nbackManifest as manifest } from './manifest';
import { renderNBack as render } from './view';
import { ExerciseModule } from '../contract';

export const nbackModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default nbackModule;
