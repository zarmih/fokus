import { shapeEquationManifest as manifest } from './manifest';
import { renderShapeEquation as render } from './view';
import { ExerciseModule } from '../contract';

export const shapeEquationModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default shapeEquationModule;
