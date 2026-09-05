import { sequenceManifest as manifest } from './manifest';
import { renderSequence as render } from './view';
import { ExerciseModule } from '../contract';

export const sequenceModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default sequenceModule;
