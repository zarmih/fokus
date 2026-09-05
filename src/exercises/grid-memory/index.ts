import { gridMemoryManifest as manifest } from './manifest';
import { renderGridMemory as render } from './view';
import { ExerciseModule } from '../contract';

export const gridMemoryModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default gridMemoryModule;
