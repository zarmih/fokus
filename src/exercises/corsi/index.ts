import { corsiManifest as manifest } from './manifest';
import { renderCorsi as render } from './view';
import { ExerciseModule } from '../contract';

export const corsiModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default corsiModule;
