import { hiveSpanManifest as manifest } from './manifest';
import { renderHiveSpan as render } from './view';
import { ExerciseModule } from '../contract';

export const hiveSpanModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default hiveSpanModule;
