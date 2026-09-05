import { switchRuleManifest as manifest } from './manifest';
import { renderSwitchRule as render } from './view';
import { ExerciseModule } from '../contract';

export const switchRuleModule: ExerciseModule = {
  manifest: manifest as any,
  render: render as any
};
export default switchRuleModule;
