import { renderVaultSpan } from './view';
import { manifest } from './manifest';
import { ExerciseModule } from '../contract';

export const vaultSpanModule: ExerciseModule = {
  manifest: manifest as any,
  render: renderVaultSpan as any
};
export default vaultSpanModule;
