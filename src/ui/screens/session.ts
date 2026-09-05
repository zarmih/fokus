import { navigateTo } from '../router';
import { renderGridMemory } from '../../exercises/grid-memory/view';
import { getGridMemoryParams } from '../../exercises/grid-memory/manifest';
import { scoreBlock } from '../../core/scoring';
import { calculateNextLevel, updateDomainIndex } from '../../core/adaptive';
import { nextStreak } from '../../core/streak';
import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import type { SessionItem, ExerciseState } from '../../core/types';

export function renderSession(container: HTMLElement, params: {items: {exerciseId: string}[]}) {
  const {items} = params;
  let currentIndex = 0;
  const sessionResults: SessionItem[] = [];
  const sessionStartedAt = new Date().toISOString();
  let timerInterval: any;
  let timeLeft = storage.getProfile().sessionLengthSec;

  const renderCurrent = () => {
    if (currentIndex >= items.length || timeLeft <= 0) {
      finishSession();
      return;
    }
    const item = items[currentIndex];
    const manifest = registry.find(m => m.id === item.exerciseId)!;
    
    let state = storage.getExerciseStates().find(s => s.exerciseId === item.exerciseId);
    if (!state) state = { exerciseId: item.exerciseId, level: 3, lastPlayedAt: new Date().toISOString(), lastAccuracy: 0 };

    container.innerHTML = `
      <div class="screen screen-session">
        <div class="header">
          <span class="timer">${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}</span>
          <h2>${manifest.name}</h2>
        </div>
        <p class="instruction">${manifest.instruction}</p>
        <button id="btn-next" class="btn-primary">Дальше</button>
        <div id="game-container"></div>
      </div>
    `;

    document.getElementById('btn-next')?.addEventListener('click', () => {
      document.querySelector('.instruction')?.remove();
      document.getElementById('btn-next')?.remove();
      
      if (item.exerciseId === 'grid-memory') {
        renderGridMemory(document.getElementById('game-container')!, state!.level, (res) => {
          const tp = getGridMemoryParams(state!.level);
          const score = scoreBlock({accuracy: res.accuracy, level: state!.level, avgRtMs: res.avgRtMs, targetMs: tp.targetMs});
          sessionResults.push({
            exerciseId: item.exerciseId,
            level: state!.level,
            accuracy: res.accuracy,
            avgRtMs: res.avgRtMs,
            score
          });
          
          const newLevel = calculateNextLevel(state!.level, res.accuracy, res.avgRtMs, tp.targetMs);
          state!.level = newLevel;
          state!.lastPlayedAt = new Date().toISOString();
          state!.lastAccuracy = res.accuracy;
          
          const st = storage.getExerciseStates();
          const idx = st.findIndex(s => s.exerciseId === item.exerciseId);
          if (idx >= 0) st[idx] = state!;
          else st.push(state!);
          storage.setExerciseStates(st);
          
          currentIndex++;
          renderCurrent();
        });
      }
    });
  };

  const finishSession = () => {
    clearInterval(timerInterval);
    const finishedAt = new Date().toISOString();
    const duration = storage.getProfile().sessionLengthSec - timeLeft;
    const s = {
      id: Date.now().toString(),
      startedAt: sessionStartedAt,
      finishedAt,
      durationSec: duration,
      items: sessionResults
    };
    storage.addSession(s);

    let totalScore = 0;
    sessionResults.forEach(r => totalScore += r.score);

    const summaries = storage.getDaySummaries();
    const lastStreak = summaries.length > 0 ? summaries[summaries.length-1].streak : 0;
    const lastDate = summaries.length > 0 ? summaries[summaries.length-1].date : null;
    
    const ns = nextStreak(lastDate, lastStreak, sessionStartedAt);
    const ds = {
      date: sessionStartedAt,
      totalScore,
      domainDeltas: {},
      streak: ns.streak,
      skipped: ns.skipped
    };
    storage.addDaySummary(ds);

    navigateTo('result', {session: s});
  };

  timerInterval = setInterval(() => {
    timeLeft--;
    const t = document.querySelector('.timer');
    if (t) {
      t.textContent = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);

  renderCurrent();
}
