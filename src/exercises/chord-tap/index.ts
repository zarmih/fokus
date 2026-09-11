import { chordTapManifest as manifest } from './manifest';
import { renderChordTap as render } from './view';
import { ExerciseModule } from '../contract';

export const chordTapModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default chordTapModule;
