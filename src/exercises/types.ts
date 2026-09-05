import type { ExerciseManifest as ContractManifest } from './contract';

export type ExerciseManifest = ContractManifest & {
  levels?: Record<number, any>;
};
