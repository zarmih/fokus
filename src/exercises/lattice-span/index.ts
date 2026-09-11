import { latticeSpanManifest as manifest } from './manifest';
import { renderLatticeSpan as render } from './view';
import { ExerciseModule } from '../contract';

export const latticeSpanModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default latticeSpanModule;
