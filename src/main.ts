import './styles.css';
import { renderToday } from './ui/screens/today';
import { renderSession } from './ui/screens/session';
import { renderResult } from './ui/screens/result';
import { renderProgress } from './ui/screens/progress';
import { renderSettings } from './ui/screens/settings';
import { renderTrainers } from './ui/screens/trainers';

const app = document.getElementById('app')!;
renderToday(app);

window.addEventListener('navigate', (e: any) => {
  const {screenId, params} = e.detail;
  if (screenId === 'today') renderToday(app);
  else if (screenId === 'session') renderSession(app, params);
  else if (screenId === 'result') renderResult(app, params);
  else if (screenId === 'progress') renderProgress(app);
  else if (screenId === 'settings') renderSettings(app);
  else if (screenId === 'trainers') renderTrainers(app);
});
