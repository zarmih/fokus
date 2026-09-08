import { mentalRotationManifest as manifest } from './manifest';
import { renderMentalRotation as render } from './view';
import { ExerciseModule } from '../contract';

export const mentalRotationModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default mentalRotationModule;
