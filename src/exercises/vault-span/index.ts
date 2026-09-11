import { manifest } from './manifest';
import { render } from './view';
import { ExerciseModule } from '../contract';

const module: ExerciseModule = { manifest: manifest as any, render };
export default module;
