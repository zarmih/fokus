import { patternNextManifest as manifest } from './manifest';
import { renderPatternNext as render } from './view';
import { ExerciseModule } from '../contract';

export const patternNextModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default patternNextModule;
