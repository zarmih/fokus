import './styles.css';
import { renderToday } from './ui/screens/today';
import { renderSession } from './ui/screens/session';
import { renderResult } from './ui/screens/result';
import { navigateTo } from './ui/router';

const app = document.getElementById('app')!;
renderToday(app);

window.addEventListener('navigate', (e: any) => {
  if (e.detail === 'today') renderToday(app);
  else if (e.detail === 'session') renderSession(app);
  else if (e.detail === 'result') renderResult(app);
  
  if (e.detail === 'today') {
    setTimeout(() => {
      document.getElementById('btn-start')?.addEventListener('click', () => navigateTo('session'));
    }, 0);
  }
});

setTimeout(() => {
  document.getElementById('btn-start')?.addEventListener('click', () => navigateTo('session'));
}, 0);
