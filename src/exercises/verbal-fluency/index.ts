import { verbalFluencyManifest as manifest } from './manifest';
import { renderVerbalFluency as render } from './view';
import { ExerciseModule } from '../contract';

export const verbalFluencyModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default verbalFluencyModule;
