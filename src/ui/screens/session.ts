import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { dispatch } from '../../exercises/dispatch';
import { scoreBlock } from '../../core/scoring';
import { calculateNextLevel, updateDomainIndex } from '../../core/adaptive';
import { nextStreak } from '../../core/streak';
import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { mapAccuracyToStartLevel } from '../../core/calibration';
import type { SessionItem } from '../../core/types';

export function renderSession(container: HTMLElement, params: {mode?: string, items: {exerciseId: string}[]}) {
  const {items, mode = 'normal'} = params;
  let currentIndex = 0;
  const sessionResults: SessionItem[] = [];
  const domainDeltas: Record<string, number> = {};
  const sessionStartedAt = new Date().toISOString();
  let timerInterval: any;
  let timeLeft = mode === 'calibration' ? items.length * 30 : storage.getProfile().sessionLengthSec;
  let blockTimeLeft = mode === 'calibration' ? 30 : timeLeft;
  let isPaused = false;

  const content = renderShell(container, { active: 'today', hideNav: true });

  const renderCurrent = () => {
    if (currentIndex >= items.length || timeLeft <= 0) {
      finishSession();
      return;
    }
    blockTimeLeft = mode === 'calibration' ? 30 : timeLeft;
    const item = items[currentIndex];
    const exDispatch = dispatch[item.exerciseId];
    if (!exDispatch) {
      console.error('Unknown exercise', item.exerciseId);
      currentIndex++;
      renderCurrent();
      return;
    }
    
    const manifest = exDispatch.manifest;
    let state = storage.getExerciseStates().find(s => s.exerciseId === item.exerciseId);
    if (!state) state = { exerciseId: item.exerciseId, level: mode === 'calibration' ? 3 : 1, lastPlayedAt: new Date().toISOString(), lastAccuracy: 0 };

    content.innerHTML = `
      <div class="session-header">
        <div class="session-controls" style="display: flex; gap: 4px;">
          <button id="btn-back" class="btn-tiny">Назад</button>
          <button id="btn-pause" class="btn-tiny">Пауза</button>
          <button id="btn-restart" class="btn-tiny">Заново</button>
        </div>
        <div class="session-timer" id="session-timer">${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}</div>
        <div class="session-block-info">Блок ${currentIndex + 1} из ${items.length}</div>
      </div>
      <div class="instruction-card" id="instruction-card">
        <img src="${import.meta.env.BASE_URL}art/icon-${manifest.id}.svg" width="64" height="64" style="margin-bottom: 16px; border-radius: 16px;">
        <h2>${manifest.name}</h2>
        <p>${manifest.instruction}</p>
      </div>
      <button id="btn-next" class="btn-primary">Начать</button>
      <div id="game-container" style="position: relative;"></div>
    `;

    document.getElementById('btn-back')?.addEventListener('click', () => {
      clearInterval(timerInterval);
      navigateTo(mode === 'practice' ? 'trainers' : 'today');
    });

    document.getElementById('btn-pause')?.addEventListener('click', (e) => {
      const btn = e.target as HTMLButtonElement;
      isPaused = !isPaused;
      btn.textContent = isPaused ? 'Прод.' : 'Пауза';
      let overlay = document.getElementById('pause-overlay');
      if (isPaused) {
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'pause-overlay';
          overlay.innerHTML = '<div style="background: var(--surface); padding: 24px; border-radius: 16px; text-align: center; font-size: 20px; font-weight: bold; color: var(--text);">ПАУЗА</div>';
          overlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; pointer-events: all; border-radius: 16px;';
          document.getElementById('game-container')?.appendChild(overlay);
        }
      } else {
        overlay?.remove();
      }
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      isPaused = false;
      document.getElementById('pause-overlay')?.remove();
      renderCurrent();
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      document.getElementById('instruction-card')?.remove();
      document.getElementById('btn-next')?.remove();
      
      const isTimeUp = () => blockTimeLeft <= 0 || timeLeft <= 0;
      
      const onBlockEnd = (res: any) => {
        const tp = exDispatch.getParams(state!.level);
        const score = scoreBlock({accuracy: res.accuracy, level: state!.level, avgRtMs: res.avgRtMs, targetMs: tp.targetMs});
        sessionResults.push({
          exerciseId: item.exerciseId,
          level: state!.level,
          accuracy: res.accuracy,
          avgRtMs: res.avgRtMs,
          score
        });
        
        if (mode === 'calibration') {
          const newLevel = mapAccuracyToStartLevel(res.accuracy);
          const domain = manifest.domain;
          const st = storage.getExerciseStates();
          registry.filter(r => r.domain === domain).forEach(ex => {
            const idx = st.findIndex(s => s.exerciseId === ex.id);
            if (idx >= 0) st[idx].level = newLevel;
            else st.push({ exerciseId: ex.id, level: newLevel, lastPlayedAt: new Date().toISOString(), lastAccuracy: 0 });
          });
          storage.setExerciseStates(st);
        } else {
          const newLevel = calculateNextLevel(state!.level, res.accuracy, res.avgRtMs, tp.targetMs);
          state!.level = newLevel;
          state!.lastPlayedAt = new Date().toISOString();
          state!.lastAccuracy = res.accuracy;
          
          const st = storage.getExerciseStates();
          const idx = st.findIndex(s => s.exerciseId === item.exerciseId);
          if (idx >= 0) st[idx] = state!;
          else st.push(state!);
          storage.setExerciseStates(st);

          const domains = storage.getDomains();
          const dIdx = domains.findIndex(d => d.domain === manifest.domain);
          const currentDomainValue = dIdx >= 0 ? domains[dIdx].value : 1000;
          const newDomainValue = updateDomainIndex(currentDomainValue, res.accuracy, state!.level);
          if (dIdx >= 0) {
            domains[dIdx].value = newDomainValue;
            domains[dIdx].updatedAt = new Date().toISOString();
          } else {
            domains.push({ domain: manifest.domain, value: newDomainValue, updatedAt: new Date().toISOString() });
          }
          storage.setDomains(domains);
          domainDeltas[manifest.domain] = (domainDeltas[manifest.domain] || 0) + (newDomainValue - currentDomainValue);
        }
        
        currentIndex++;
        renderCurrent();
      };

      exDispatch.render(document.getElementById('game-container')!, state!.level, onBlockEnd, isTimeUp);
    });
  };

  const finishSession = () => {
    clearInterval(timerInterval);
    
    if (mode === 'calibration') {
      const p = storage.getProfile();
      p.calibrated = true;
      storage.setProfile(p);
      navigateTo('today');
      return;
    }

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
      domainDeltas,
      streak: ns.streak,
      skipped: ns.skipped
    };
    storage.addDaySummary(ds);

    navigateTo('result', {session: s});
  };

  timerInterval = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    blockTimeLeft--;
    const t = document.getElementById('session-timer');
    if (t) {
      t.textContent = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
    }
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);

  renderCurrent();
}
