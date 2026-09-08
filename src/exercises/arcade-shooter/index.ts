import { manifest } from './manifest';
import { renderArcadeShooter as render } from './view';
import { ExerciseModule } from '../contract';

export const arcadeShooterModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default arcadeShooterModule;
