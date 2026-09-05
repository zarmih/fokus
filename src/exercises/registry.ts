import { ExerciseModule } from './contract';
import gridMemoryModule from './grid-memory';
import oddOneModule from './odd-one';
import pairsModule from './pairs';
import patternNextModule from './pattern-next';
import pulleyModule from './pulley';
import sequenceModule from './sequence';
import stroopModule from './stroop';
import swingsModule from './swings';
import switchRuleModule from './switch-rule';

export const registry: ExerciseModule[] = [
  gridMemoryModule,
  oddOneModule,
  pairsModule,
  patternNextModule,
  pulleyModule,
  sequenceModule,
  stroopModule,
  swingsModule,
  switchRuleModule
];
