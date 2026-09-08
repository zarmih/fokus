import { schulteManifest as manifest } from './manifest';
import { renderSchulte as render } from './view';
import { ExerciseModule } from '../contract';

export const schulteModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default schulteModule;
