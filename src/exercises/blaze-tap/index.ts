import { blazeTapManifest as manifest } from './manifest';
import { renderBlazeTap as render } from './view';
import { ExerciseModule } from '../contract';

export const blazeTapModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default blazeTapModule;
