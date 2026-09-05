import { oddOneManifest as manifest } from './manifest';
import { renderOddOne as render } from './view';
import { ExerciseModule } from '../contract';

export const oddOneModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default oddOneModule;
