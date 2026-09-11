import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { dispatch } from '../../exercises/dispatch';
import { scoreBlock } from '../../core/scoring';
import { updateExerciseState, calculateNormalizedPerformance, updateDomainIndex, updateSkillIndex, initializeExerciseStateFromCalibration, initializeSkillFromCalibration } from '../../core/adaptive';
import { nextStreak } from '../../core/streak';
import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { mapAccuracyToStartLevel } from '../../core/calibration';
import { buildTrainingPlan } from '../../core/session-builder';
import { computeFokusIndex } from '../../core/fokus-index';
import { checkAchievements } from '../../core/achievements';
import type { SessionItem } from '../../core/types';

export function renderSession(container: HTMLElement, params: {mode?: string, items: {exerciseId: string}[], isResume?: boolean}) {
  let {items, mode = 'normal', isResume = false} = params;
  let active = (mode === 'normal' && isResume) ? storage.getActiveSession() : null;
  if (mode === 'normal' && !isResume) storage.clearActiveSession();

  let currentIndex = active ? active.items.length : 0;
  const sessionResults: SessionItem[] = active ? active.items : [];
  const domainDeltas: Record<string, number> = active ? active.domainDeltas : {};
  const sessionStartedAt = active ? active.startedAt : new Date().toISOString();
  let timerInterval: any;
  let timeLeft = mode === 'calibration' ? items.length * 30 : (active ? active.timeLeft : storage.getProfile().sessionLengthSec);
  if (active && active.planItems) items = active.planItems;
  let blockTimeLeft = mode === 'calibration' ? 30 : timeLeft;
  let isPaused = false;
  let currentCleanup: any = null;
  let fatigueCounter = 0;

  const content = renderShell(container, { active: 'today', hideNav: true });

  const renderCurrent = () => {
    if (currentIndex >= items.length || timeLeft <= 0) {
      finishSession();
      return;
    }
    blockTimeLeft = mode === 'calibration' ? 30 : timeLeft;

    if (mode === 'normal' && currentIndex > 0) {
      // Adaptive Session: re-evaluate the next item based on fresh results
      const plan = buildTrainingPlan({
        durationSec: timeLeft,
        catalog: registry as any,
        domains: storage.getDomains(),
        skills: storage.getSkills(),
        states: storage.getExerciseStates(),
        primaryGoal: storage.getProfile().primaryGoal,
        programDay: storage.getProfile().programDay || 1
      });
      const nextItem = plan.items.find(pi => !sessionResults.some(sr => sr.exerciseId === pi.exerciseId));
      if (nextItem) {
        items[currentIndex].exerciseId = nextItem.exerciseId;
      }
    }

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
    if (!state) state = { exerciseId: item.exerciseId, level: mode === 'calibration' ? 3 : 1, difficulty: mode === 'calibration' ? 3.0 : 1.0, performance: 0, lastPlayedAt: new Date().toISOString(), lastAccuracy: 0 };

    const last = sessionResults[sessionResults.length - 1];
    const lastEx = last ? registry.find(r => r.manifest.id === last.exerciseId) : null;
    const lastBanner = last && lastEx ? `
      <div class="block-recap">
        ${lastEx.manifest.name}: ${Math.round(last.accuracy * 100)}% · +${Math.round(last.score)}
      </div>
    ` : '';

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
      ${lastBanner}
      <div class="instruction-card" id="instruction-card" style="animation: slideUpFade 0.4s ease-out both;">
        <div class="instruction-glow" aria-hidden="true"></div>
        <img src="${import.meta.env.BASE_URL}art/icon-${manifest.id}.svg" width="72" height="72" alt="" class="instruction-icon">
        <h2>${manifest.name}</h2>
        <p>${manifest.instruction}</p>
        <div class="instruction-meta">Блок ${currentIndex + 1} · уровень ${Math.floor(state.difficulty)}</div>
      </div>
      <button id="btn-next" class="btn-primary">Начать</button>
      <div id="game-container" class="play-arena"></div>
    `;

    document.getElementById('btn-back')?.addEventListener('click', () => {
      if (currentCleanup) currentCleanup();
      clearInterval(timerInterval);
      if (mode === 'normal' && sessionResults.length > 0) {
        storage.setActiveSession({
          items: sessionResults,
          planItems: items,
          timeLeft: timeLeft,
          startedAt: sessionStartedAt,
          domainDeltas: domainDeltas
        });
      }
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
          overlay.className = 'pause-overlay';
          overlay.innerHTML = '<div class="pause-card">Пауза</div>';
          document.getElementById('game-container')?.appendChild(overlay);
        }
      } else {
        overlay?.remove();
      }
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      if (currentCleanup) currentCleanup();
      timeLeft = mode === 'calibration' ? items.length * 30 : storage.getProfile().sessionLengthSec;
      const t = document.getElementById('session-timer');
      if (t) {
        t.textContent = `${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}`;
      }
      isPaused = false;
      document.getElementById('pause-overlay')?.remove();
      const pBtn = document.getElementById('btn-pause');
      if (pBtn) pBtn.textContent = 'Пауза';
      
      currentIndex = 0;
      sessionResults.length = 0;
      for (const key in domainDeltas) delete domainDeltas[key];
      
      renderCurrent();
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      document.getElementById('instruction-card')?.remove();
      document.getElementById('btn-next')?.remove();
      
      const container = document.getElementById('game-container');
      if (!container) return;
      
      const countdown = document.createElement('div');
      countdown.className = 'count-overlay';
      container.appendChild(countdown);
      
      let count = 3;
      countdown.textContent = count.toString();
      let iv: any = null;
      
      const startBlock = () => {
        countdown.remove();
        const isTimeUp = () => blockTimeLeft <= 0 || timeLeft <= 0;
        let cleanupFn: any = null;

        const onBlockEnd = (res: any) => {
          if (cleanupFn) cleanupFn();
          import('../../core/audio').then(a => {
            a.playBeep(res.accuracy >= 0.8);
          }).catch(() => {});

          const targetMs = (manifest as any).levels ? ((manifest as any).levels[Math.floor(state!.difficulty)]?.targetMs || 1500) : 1500;
          
          const perf = calculateNormalizedPerformance(res.accuracy, res.avgRtMs, targetMs, state!.difficulty, manifest.metricModel);
          const score = Math.round(perf / 10); // simple mapping for UI score
          
          let sr: SessionItem = {
            exerciseId: item.exerciseId,
            level: Math.floor(state!.difficulty),
            accuracy: res.accuracy,
            avgRtMs: res.avgRtMs,
            score,
            performance: perf,
            masteryBefore: state?.mastery || 0,
            difficultyBefore: state?.difficulty || 1.0
          };
          
          if (mode === 'normal') {
            import('../../core/quests').then(q => {
              q.updateQuestProgress('blocks', 1);
              q.updateQuestProgress('accuracy', Math.round(res.accuracy * 100));
            }).catch(() => {});
          }

          if (mode === 'calibration') {
            const newLevel = mapAccuracyToStartLevel(res.accuracy);
            const domain = manifest.domain;
            const st = storage.getExerciseStates();
            registry.filter(r => r.manifest.domain === domain).forEach(ex => {
              const idx = st.findIndex(s => s.exerciseId === ex.manifest.id);
              if (idx >= 0) {
                st[idx].level = newLevel;
                st[idx].difficulty = newLevel;
              }
              else {
                st.push(initializeExerciseStateFromCalibration(ex.manifest.id, newLevel, perf));
              }
            });
            storage.setExerciseStates(st);
            
            // Initialize domains and skills
            const domains = storage.getDomains();
            const dIdx = domains.findIndex(d => d.domain === domain);
            if (dIdx < 0) {
              domains.push({ domain: domain, value: perf, trend: 0, updatedAt: new Date().toISOString() });
              storage.setDomains(domains);
            }
            
            const skills = storage.getSkills();
            let skillsChanged = false;
            manifest.skills.forEach(skillId => {
              const sIdx = skills.findIndex(s => s.skill === skillId);
              if (sIdx < 0) {
                skills.push(initializeSkillFromCalibration(skillId, perf, item.exerciseId));
                skillsChanged = true;
              }
            });
            if (skillsChanged) storage.setSkills(skills);
          } else {
            const newState = updateExerciseState(state!, res.accuracy, res.avgRtMs, targetMs, perf);
            state = newState;
            
            const st = storage.getExerciseStates();
            const idx = st.findIndex(s => s.exerciseId === item.exerciseId);
            if (idx >= 0) st[idx] = state!;
            else st.push(state!);
            storage.setExerciseStates(st);

            // Update skills
            const skills = storage.getSkills();
            manifest.skills.forEach(skillId => {
              const sIdx = skills.findIndex(s => s.skill === skillId);
              const newSk = updateSkillIndex(sIdx >= 0 ? skills[sIdx] : undefined, skillId, perf, item.exerciseId);
              if (sIdx >= 0) skills[sIdx] = newSk;
              else skills.push(newSk);
            });
            storage.setSkills(skills);

            // Update domain
            const domains = storage.getDomains();
            const dIdx = domains.findIndex(d => d.domain === manifest.domain);
            const currentVal = dIdx >= 0 ? domains[dIdx].value : 0;
            const updatedDomain = updateDomainIndex(dIdx >= 0 ? domains[dIdx] : undefined, manifest.domain, perf);
            
            if (dIdx >= 0) {
              domains[dIdx] = updatedDomain;
            } else {
              domains.push(updatedDomain);
            }
            storage.setDomains(domains);
            domainDeltas[manifest.domain] = (domainDeltas[manifest.domain] || 0) + (updatedDomain.value - currentVal);
            
            sr.masteryAfter = state.mastery;
            sr.difficultyAfter = state.difficulty;
            sr.confidenceAfter = Math.min(1.0, (state.attempts || 1) / 15) * 100;
            if ((state.attempts || 1) < 3) sr.progressionState = 'calibrating';
            else if (state.mastery! > sr.masteryBefore!) sr.progressionState = 'up';
            else if (state.mastery! < sr.masteryBefore!) sr.progressionState = 'down';
            else if ((state.consecutivePlateau || 0) >= 3) sr.progressionState = 'plateau';
            else sr.progressionState = 'stable';
          }
          
          sessionResults.push(sr);
          
          if (mode === 'normal' && res.accuracy < 0.70 && (storage.getProfile().sessionLengthSec - timeLeft) > 300) {
            fatigueCounter++;
            if (fatigueCounter >= 2) {
              showFatiguePrompt();
              return;
            }
          } else if (res.accuracy >= 0.8) {
            fatigueCounter = 0;
          }
          
          if (mode === 'normal') {
            storage.setActiveSession({
              items: sessionResults,
              planItems: items,
              timeLeft: timeLeft,
              startedAt: sessionStartedAt,
              domainDeltas: domainDeltas
            });
          }

          currentIndex++;
          renderCurrent();
        };

        cleanupFn = exDispatch.render(container, state!.difficulty, onBlockEnd, isTimeUp);
        currentCleanup = cleanupFn;
      };

      currentCleanup = () => {
        if (iv) clearInterval(iv);
        countdown.remove();
      };

      iv = setInterval(() => {
        if (isPaused) return; // Wait if paused during countdown
        count--;
        if (count > 0) {
          countdown.textContent = count.toString();
          countdown.style.transform = 'scale(1.2)';
          setTimeout(() => countdown.style.transform = 'scale(1)', 150);
          import('../../core/audio').then(a => a.playTick()).catch(() => {});
        } else {
          clearInterval(iv);
          iv = null;
          import('../../core/audio').then(a => a.playBeep(true)).catch(() => {});
          startBlock();
        }
      }, 700);
    });
  };

  const finishSession = () => {
    if (currentCleanup) currentCleanup();
    clearInterval(timerInterval);
    
    if (mode === 'calibration') {
      const p = storage.getProfile();
      p.calibrated = true;
      p.needsRecalibration = false;
      p.recalibrationPostponed = false;
      storage.setProfile(p);
      const s = {
        id: Date.now().toString(),
        startedAt: sessionStartedAt,
        finishedAt: new Date().toISOString(),
        durationSec: items.length * 30 - timeLeft,
        items: sessionResults
      };
      navigateTo('result', { session: s, calibration: true });
      return;
    }

    if (mode === 'normal') {
      storage.clearActiveSession();
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
    
    const todayStr = sessionStartedAt.split('T')[0];
    const playedToday = summaries.some(d => d.date.startsWith(todayStr));
    
    if (mode === 'normal' && !playedToday) {
      const prof = storage.getProfile();
      prof.programDay = (prof.programDay || 0) + 1;
      if (prof.programDay > 7) {
        prof.programDay = 1;
        prof.programWeek = (prof.programWeek || 1) + 1;
        prof.needsRecalibration = true;
      }
      storage.setProfile(prof);
    }

    const ns = nextStreak(lastDate, lastStreak, sessionStartedAt);
    const fiNow = computeFokusIndex(storage.getDomains());
    const ds: any = {
      date: sessionStartedAt,
      totalScore,
      domainDeltas,
      streak: ns.streak,
      skipped: ns.skipped,
      fokusIndex: fiNow.value
    };
    const prof = storage.getProfile();
    if (prof.lastLifestyle && prof.lastLifestyle.date === new Date().toISOString().split('T')[0]) {
      ds.lifestyle = { sleep: prof.lastLifestyle.sleep, stress: prof.lastLifestyle.stress };
    }
    storage.addDaySummary(ds);

    let totalAccuracy = 0;
    sessionResults.forEach(r => totalAccuracy += r.accuracy);
    const avgAcc = sessionResults.length > 0 ? totalAccuracy / sessionResults.length : 0;

    storage.addHistory({
      date: sessionStartedAt,
      minutes: Math.round(duration / 60),
      score: totalScore,
      accuracy: avgAcc,
      domainDeltas
    });

    const p = storage.getProfile();
    p.xp = (p.xp || 0) + totalScore;
    storage.setProfile(p);

    const unlocked = checkAchievements();

    if (mode === 'normal') {
      import('../../core/quests').then(q => {
        q.updateQuestProgress('score', totalScore);
      }).catch(() => {});
    }

    navigateTo('result', { session: s, unlocked });
  };

  function showFatiguePrompt() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-root';
    overlay.innerHTML = `
      <div class="surface modal-card">
        <h3>Похоже, внимание падает</h3>
        <p class="modal-lead">Два слабых блока подряд — это маркер усталости, не провала. Можно сохранить результат и остановиться.</p>
        <button id="btn-fatigue-end" class="btn-primary" type="button">Завершить сессию</button>
        <button id="btn-fatigue-go" class="btn-secondary" type="button">Продолжить</button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#btn-fatigue-end')?.addEventListener('click', () => {
      overlay.remove();
      finishSession();
    });
    overlay.querySelector('#btn-fatigue-go')?.addEventListener('click', () => {
      overlay.remove();
      fatigueCounter = 0;
      currentIndex++;
      renderCurrent();
    });
  }

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
