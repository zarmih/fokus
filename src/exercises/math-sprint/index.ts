import { MathSprintManifest as manifest } from './manifest';
import { renderMathSprint as render } from './view';
import { ExerciseModule } from '../contract';

export const mathSprintModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default mathSprintModule;
