import { vowelCountManifest as manifest } from './manifest';
import { renderVowelCount as render } from './view';
import { ExerciseModule } from '../contract';

export const vowelCountModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default vowelCountModule;
