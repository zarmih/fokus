import { registry } from './registry';
import { ExerciseModule } from './contract';

export const dispatch: Record<string, ExerciseModule> = {};
registry.forEach(m => {
  dispatch[m.manifest.id] = m;
});
