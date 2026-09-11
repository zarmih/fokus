import { cacheSpanManifest as manifest } from './manifest';
import { renderCacheSpan as render } from './view';
import { ExerciseModule } from '../contract';

export const cacheSpanModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default cacheSpanModule;
