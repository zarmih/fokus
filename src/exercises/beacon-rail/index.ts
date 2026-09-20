import { beaconRailManifest as manifest } from './manifest';
import { renderBeaconRail as render } from './view';
import { ExerciseModule } from '../contract';

export const beaconRailModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default beaconRailModule;
