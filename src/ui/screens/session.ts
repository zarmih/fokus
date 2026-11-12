import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { catalog, getManifest } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import type { ExerciseModule } from '../../exercises/contract';
import { scoreBlock } from '../../core/scoring';
import { updateExerciseState, calculateNormalizedPerformance, updateDomainIndex, updateSkillIndex } from '../../core/adaptive';
import { nextStreak, resolveFokusTimeZone, calendarDayKey } from '../../core/streak';
import { storage } from '../../core/storage';
import {
  PROBE_BUDGET_SEC,
  PROBE_BLOCK_SEC,
  decideNextProbeStep,
  bootstrapFromProbe,
  seedStatesFromSnapshot,
  mapAccuracyToStartLevel
} from '../../core/calibration';
import { buildFirstWeekPlan } from '../../core/onboarding';
import type { Session, SessionEndReason } from '../../core/types';
import { safeError } from '../../core/log';
import { computeFokusIndex } from '../../core/fokus-index';
import { checkAchievements } from '../../core/achievements';
import type { ProbeOutcome } from '../../core/calibration';
import type { SessionItem } from '../../core/types';
import { announce, bindDialog, setScreenTitle, focusMain, prefersReducedMotion } from '../a11y';
import { difficultyFor, markEngineCalibrated, planForNow, recordEngineObservation } from '../../core/adaptive-plan';
import { applyFeedback, enterStage, playSessionCue, replayClass } from '../../core/motion';
import { mountScene } from '../scene';
import { buildSessionContent } from '../../core/exercise-content';
import { blockBudgetSec, interruptAbortsBlock, isScorableBlock, shouldTick } from '../../core/session-timing';

export const COUNTDOWN_START_ANNOUNCEMENT = 'Сейчас начнём';
export const COUNTDOWN_GO_ANNOUNCEMENT = 'Начали';

export function renderSession(container: HTMLElement, params: {mode?: string, items: {exerciseId: string, difficulty?: number}[], durationSec?: number}) {
  const {items, mode = 'normal'} = params;
  const isProbe = mode === 'calibration' || mode === 'recalibration';
  let currentIndex = 0;
  const sessionResults: SessionItem[] = [];
  const probeOutcomes: ProbeOutcome[] = [];
  const domainDeltas: Record<string, number> = {};
  const sessionStartedAt = new Date().toISOString();
  let timerInterval: any;
  const sessionBudget = params.durationSec ?? storage.getProfile().sessionLengthSec;
  let timeLeft = mode === 'calibration' ? PROBE_BUDGET_SEC : isProbe ? items.length * 30 : sessionBudget;
  let sessionEndReason: SessionEndReason = 'completed';
  let blockTimeLeft = mode === 'calibration' ? PROBE_BLOCK_SEC : isProbe ? 30 : timeLeft;
  let isPaused = false;
  let currentCleanup: any = null;
  let fatigueCounter = 0;
  /** Blocks aborted by pause/background (restarted, never scored). */
  let abortedBlocks = 0;
  /** Resume after an interrupted block replays the same item (no re-planning). */
  let replaySameItem = false;

  const content = renderShell(container, { active: 'today', hideNav: true });

  const renderCurrent = () => {
    if (currentIndex >= items.length || timeLeft <= 0) {
      finishSession();
      return;
    }
    blockTimeLeft = blockBudgetSec({
      mode,
      timeLeftSec: timeLeft,
      remainingBlocks: items.length - currentIndex,
      probeBlockSec: PROBE_BLOCK_SEC
    });

    // Play exactly the plan that Today showed (core/daily-plan.ts). No mid-session re-plan: difficulty
    // still adapts per block via difficultyFor(), but the exercise list stays the one the user saw.
    replaySameItem = false;

    const item = items[currentIndex];
    const preview = getManifest(item.exerciseId);
    if (!preview) {
      safeError('Unknown exercise', item.exerciseId);
      currentIndex++;
      renderCurrent();
      return;
    }
    
    const manifest = preview;
    const loadPromise = loadExercise(item.exerciseId);
    setScreenTitle(manifest.name);
    let state = storage.getExerciseStates().find(s => s.exerciseId === item.exerciseId);
    if (!state) state = { exerciseId: item.exerciseId, level: isProbe ? 3 : 1, difficulty: isProbe ? 3.0 : 1.0, performance: 0, lastPlayedAt: new Date().toISOString(), lastAccuracy: 0 };

    const irtPick = !isProbe
      ? difficultyFor(item.exerciseId, item.difficulty ?? state.difficulty)
      : null;
    if (irtPick) {
      state = { ...state, difficulty: irtPick.difficulty, level: Math.floor(irtPick.difficulty) };
    }

    const last = sessionResults[sessionResults.length - 1];
    const lastEx = last ? getManifest(last.exerciseId) : null;
    const reducedMotion = prefersReducedMotion();
    const motionClass = reducedMotion ? '' : 'fx-enter';
    const lastBanner = last && lastEx ? `
      <div class="block-recap ${motionClass} ${last.accuracy >= 0.8 ? 'is-ok' : 'is-miss'}" aria-live="polite">
        ${lastEx.name}: ${Math.round(last.accuracy * 100)}% · +${Math.round(last.score)}
      </div>
    ` : '';

    const contentHints = buildSessionContent({
      blockIndex: currentIndex + 1,
      difficulty: state.difficulty,
      domain: manifest.domain,
      instruction: manifest.instruction
    });

    content.dataset.sessionPhase = 'intro';
    content.innerHTML = `
      <div class="session-header">
        <div class="session-controls" style="display: flex; gap: 4px;">
          <button id="btn-back" class="btn-tiny" type="button">Назад</button>
          <button id="btn-pause" class="btn-tiny" type="button">Пауза</button>
          <button id="btn-restart" class="btn-tiny" type="button">Заново</button>
        </div>
        <div class="session-timer" id="session-timer" role="timer" aria-live="off">${Math.floor(timeLeft/60)}:${(timeLeft%60).toString().padStart(2,'0')}</div>
        <div class="session-block-info">${mode === 'calibration' ? `Зонд · блок ${currentIndex + 1}` : `Блок ${currentIndex + 1} из ${items.length}`}</div>
      </div>
      ${lastBanner}
      <div class="instruction-card ${motionClass}" id="instruction-card" tabindex="-1">
        <div class="instruction-glow" aria-hidden="true"></div>
        <img src="${import.meta.env.BASE_URL}art/icon-${manifest.id}.svg" width="72" height="72" alt="" class="instruction-icon">
        <h2>${manifest.name}</h2>
        <p>${manifest.instruction}</p>
        <div class="instruction-meta">${contentHints.metaLine}</div>
        <p class="instruction-hint">${contentHints.hintLine}</p>
      </div>
      <button id="btn-next" class="btn-primary" type="button">Начать</button>
      <div id="game-container" class="play-arena"></div>
    `;

    requestAnimationFrame(() => {
      const btnNext = document.getElementById('btn-next');
      if (btnNext) {
        btnNext.focus();
      } else {
        focusMain();
      }
    });

    document.getElementById('btn-back')?.addEventListener('click', () => {
      if (currentCleanup) currentCleanup();
      clearInterval(timerInterval);
      stopVisibility();
      if (mode === 'normal' && sessionResults.length > 0) {
        persistAbandonedSession();
      }
      navigateTo(mode === 'practice' ? 'trainers' : 'today');
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      if (isPaused) resumeSession();
      else pauseSession('button');
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      if (currentCleanup) currentCleanup();
      timeLeft = mode === 'calibration' ? PROBE_BUDGET_SEC : isProbe ? items.length * 30 : sessionBudget;
      probeOutcomes.length = 0;
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
      // «Тихий свет»: per-exercise scene (data-scene + .scene-layer); the module renders into the host.
      const playHost = mountScene(container, item.exerciseId, getManifest(item.exerciseId)?.domain);
      content.dataset.sessionPhase = 'countdown';
      container.setAttribute('aria-busy', 'true');

      const reducedMotion = prefersReducedMotion();
      const countdown = document.createElement('div');
      countdown.className = `count-overlay ${reducedMotion ? '' : 'is-tick'}`;
      // Visual-only digits: screen readers get one polite announcement instead of 3/2/1 spam.
      countdown.setAttribute('aria-hidden', 'true');
      container.appendChild(countdown);
      announce(COUNTDOWN_START_ANNOUNCEMENT);

      let count = 3;
      countdown.textContent = count.toString();
      playSessionCue('tick');
      let iv: any = null;
      let pendingModule: ExerciseModule | null = null;
      let countdownDone = false;

      const startBlock = (exDispatch: ExerciseModule) => {
        container.removeAttribute('aria-busy');
        countdown.remove();
        announce(COUNTDOWN_GO_ANNOUNCEMENT);
        content.dataset.sessionPhase = 'play';
        enterStage(container);
        playSessionCue('enter');
        const isTimeUp = () => blockTimeLeft <= 0 || timeLeft <= 0;
        let cleanupFn: any = null;
        // Some exercises return their own finish() as the cleanup, and finish() calls
        // onBlockEnd again: end each block exactly once to avoid infinite recursion.
        let blockEnded = false;

        const onBlockEnd = (res: any) => {
          if (blockEnded) return;
          blockEnded = true;
          const fn = cleanupFn;
          cleanupFn = null;
          if (fn) fn();
          if (!isScorableBlock(res)) {
            // No trial happened (or broken numbers): nothing is recorded, not even a 0 %.
            announce('Блок не засчитан: не было ни одного ответа');
            currentIndex++;
            renderCurrent();
            return;
          }
          content.dataset.sessionPhase = 'feedback';
          const ok = res.accuracy >= 0.8;
          const stageEl = container.querySelector('.play-stage') as HTMLElement | null;
          applyFeedback(stageEl || container, ok);
          playSessionCue(ok ? 'hit' : 'miss');

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
            difficultyBefore: state?.difficulty || 1.0,
            pSuccess: irtPick?.pSuccess,
            rounds: res.rounds,
            mode: 'standard'
          };
          
          if (mode === 'normal') {
            import('../../core/quests').then(q => {
              q.updateQuestProgress('blocks', 1, item.exerciseId);
              if (manifest.domain) {
                q.updateWeeklyGoalProgress(manifest.domain, 1);
              }
              q.updateQuestProgress('accuracy', Math.round(res.accuracy * 100));
            }).catch(() => {});
          }

          recordEngineObservation({
            exerciseId: item.exerciseId,
            domain: manifest.domain,
            skills: [...(manifest.skills || [])],
            metricModel: manifest.metricModel || 'speed-accuracy',
            difficulty: state!.difficulty,
            accuracy: res.accuracy,
            avgRtMs: res.avgRtMs,
            targetMs,
            performance: perf,
            rounds: res.rounds,
            probe: isProbe
          });

          if (mode === 'calibration') {
            probeOutcomes.push({
              exerciseId: item.exerciseId,
              domain: manifest.domain,
              accuracy: res.accuracy,
              avgRtMs: res.avgRtMs,
              rounds: res.rounds,
              difficulty: state!.difficulty,
              performance: perf,
              skills: [...manifest.skills]
            });
            const next = decideNextProbeStep({
              outcomes: probeOutcomes,
              primaryGoal: storage.getProfile().primaryGoal,
              catalog: catalog.map((r) => ({
                id: r.manifest.id,
                domain: r.manifest.domain,
                skills: [...r.manifest.skills]
              }))
            });
            if (next && !items.some((it) => it.exerciseId === next.exerciseId)) {
              items.push({ exerciseId: next.exerciseId });
            }
          } else {
            const newState = updateExerciseState(state!, res.accuracy, res.avgRtMs, targetMs, perf, {
              recentItems: sessionResults.map((sr) => ({
                exerciseId: sr.exerciseId,
                accuracy: sr.accuracy,
                difficulty: sr.difficultyBefore,
                difficultyAfter: sr.difficultyAfter,
                difficultyBefore: sr.difficultyBefore,
                level: sr.level
              }))
            });
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
          
          currentIndex++;
          renderCurrent();
        };

        cleanupFn = exDispatch.render(playHost, state!.difficulty, onBlockEnd, isTimeUp);
        // External teardown (back, restart, session end) aborts the block without scoring it.
        currentCleanup = () => {
          blockEnded = true;
          const fn = cleanupFn;
          cleanupFn = null;
          if (fn) fn();
        };
      };

            currentCleanup = () => {
        if (iv) clearInterval(iv);
        countdown.remove();
      };

      const tryStart = () => {
        if (!countdownDone || !pendingModule) return;
        startBlock(pendingModule);
      };

      iv = setInterval(() => {
        if (isPaused) return; // Wait if paused during countdown
        count--;
        if (count > 0) {
          countdown.textContent = count.toString();
          if (!reducedMotion) replayClass(countdown, 'is-tick');
          playSessionCue('tick');
        } else {
          clearInterval(iv);
          iv = null;
          countdownDone = true;
          tryStart();
        }
      }, 700);

      loadPromise.then((mod) => {
        pendingModule = mod;
        tryStart();
      }).catch(() => {
        if (iv) clearInterval(iv);
        countdown.remove();
        container.removeAttribute('aria-busy');
        currentIndex++;
        renderCurrent();
      });

    });
  };

  const finishSession = () => {
    if (currentCleanup) currentCleanup();
    clearInterval(timerInterval);
    stopVisibility();
    
    if (mode === 'calibration') {
      if (probeOutcomes.length === 0 && sessionResults.length === 0) {
        navigateTo('today');
        return;
      }
      const snapshot = bootstrapFromProbe(probeOutcomes, {
        durationSec: Math.max(0, PROBE_BUDGET_SEC - timeLeft)
      });
      const seeded = seedStatesFromSnapshot(
        snapshot,
        catalog.map((r) => ({
          id: r.manifest.id,
          domain: r.manifest.domain,
          skills: [...r.manifest.skills]
        }))
      );
      storage.setExerciseStates(seeded.exerciseStates);
      storage.setDomains(seeded.domains);
      storage.setSkills(seeded.skills);

      const p = storage.getProfile();
      p.calibrated = true;
      p.probeSnapshot = snapshot;
      if (!p.firstWeekPlan) {
        p.firstWeekPlan = buildFirstWeekPlan({
          primaryGoal: p.primaryGoal,
          sessionLengthSec: p.sessionLengthSec,
          startDate: new Date().toISOString(),
          snapshot
        });
      } else {
        p.firstWeekPlan = buildFirstWeekPlan({
          primaryGoal: p.primaryGoal,
          sessionLengthSec: p.sessionLengthSec,
          startDate: p.firstWeekPlan.startDate,
          snapshot
        });
      }
      storage.setProfile(p);
      markEngineCalibrated();
      const s = {
        id: Date.now().toString(),
        startedAt: sessionStartedAt,
        finishedAt: new Date().toISOString(),
        durationSec: Math.max(0, PROBE_BUDGET_SEC - timeLeft),
        items: sessionResults
      };
      navigateTo('result', { session: s, calibration: true });
      return;
    }
    if (isProbe) {
      markEngineCalibrated();
      const s = {
        id: Date.now().toString(),
        startedAt: sessionStartedAt,
        finishedAt: new Date().toISOString(),
        durationSec: Math.max(0, items.length * 30 - timeLeft),
        items: sessionResults
      };
      navigateTo('result', { session: s, recalibration: true });
      return;
    }

    const finishedAt = new Date().toISOString();
    const duration = Math.max(0, sessionBudget - timeLeft);
    const s: Session = {
      id: Date.now().toString(),
      startedAt: sessionStartedAt,
      finishedAt,
      durationSec: duration,
      items: sessionResults,
      interrupted: false,
      endReason: sessionEndReason,
      plannedDurationSec: sessionBudget,
      abortedBlocks,
      mode: mode as Session['mode']
    };
    storage.addSession(s);

    let totalScore = 0;
    sessionResults.forEach(r => totalScore += r.score);

    const summaries = storage.getDaySummaries();
    const lastStreak = summaries.length > 0 ? summaries[summaries.length-1].streak : 0;
    const lastDate = summaries.length > 0 ? summaries[summaries.length-1].date : null;
    
    const ns = nextStreak(lastDate, lastStreak, sessionStartedAt);
    const domainsNow = storage.getDomains();
    const fiNow = computeFokusIndex(domainsNow);
    const domainValues: Record<string, number> = {};
    domainsNow.forEach((d) => {
      if (d.value > 0) domainValues[d.domain] = d.value;
    });
    const ds: any = {
      date: sessionStartedAt,
      totalScore,
      domainDeltas,
      streak: ns.streak,
      skipped: ns.skipped,
      fokusIndex: fiNow.value,
      domainValues
    };
    const prof = storage.getProfile();
    const tz = resolveFokusTimeZone().timeZone;
    if (prof.lastLifestyle && calendarDayKey(prof.lastLifestyle.date, tz) === calendarDayKey(new Date(), tz)) {
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

  function persistAbandonedSession() {
    const duration = Math.max(0, sessionBudget - timeLeft);
    storage.addSession({
      id: Date.now().toString(),
      startedAt: sessionStartedAt,
      finishedAt: null,
      durationSec: duration,
      items: sessionResults,
      interrupted: true,
      endReason: 'abandoned',
      plannedDurationSec: sessionBudget,
      mode: mode as Session['mode']
    });
  }

  function showFatiguePrompt() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-root';
    overlay.innerHTML = `
      <div class="surface modal-card">
        <h3 id="fatigue-title">Похоже, внимание падает</h3>
        <p class="modal-lead">Два слабых блока подряд — это маркер усталости, не провала. Можно сохранить результат и остановиться.</p>
        <button id="btn-fatigue-end" class="btn-primary" type="button">Завершить сессию</button>
        <button id="btn-fatigue-go" class="btn-secondary" type="button">Продолжить</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const unbind = bindDialog(overlay, {
      labelledBy: 'fatigue-title',
      onClose: () => {
        unbind();
        overlay.remove();
        fatigueCounter = 0;
        currentIndex++;
        renderCurrent();
      }
    });
    overlay.querySelector('#btn-fatigue-end')?.addEventListener('click', () => {
      unbind();
      overlay.remove();
      sessionEndReason = 'fatigue';
      finishSession();
    });
    overlay.querySelector('#btn-fatigue-go')?.addEventListener('click', () => {
      unbind();
      overlay.remove();
      fatigueCounter = 0;
      currentIndex++;
      renderCurrent();
    });
  }

  function pauseSession(source: 'button' | 'background') {
    if (isPaused) return;
    isPaused = true;
    const phase = content.dataset.sessionPhase;
    const aborted = interruptAbortsBlock(phase);
    if (aborted) {
      // The exercise keeps its own trial timers; letting them run would record misses the user never
      // played. Abort the block without scoring and replay it from the instruction on resume.
      if (currentCleanup) currentCleanup();
      currentCleanup = null;
      abortedBlocks++;
      replaySameItem = true;
      content.dataset.sessionPhase = 'paused';
    }
    const btn = document.getElementById('btn-pause');
    if (btn) {
      btn.textContent = 'Прод.';
      btn.setAttribute('aria-pressed', 'true');
    }
    document.getElementById('pause-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.className = 'pause-overlay';
    overlay.dataset.aborted = aborted ? '1' : '0';
    overlay.dataset.source = source;
    overlay.innerHTML = `
      <div class="pause-card">
        <div style="margin-bottom:8px;">Пауза</div>
        ${aborted ? '<p class="pause-note" style="margin:0 0 16px;font-size:14px;">Блок начнётся заново. Прерванная попытка не засчитана.</p>' : ''}
        <button id="btn-unpause" class="btn-primary" type="button">Продолжить</button>
      </div>
    `;
    (document.getElementById('game-container') || content).appendChild(overlay);
    overlay.querySelector('#btn-unpause')?.addEventListener('click', () => resumeSession());
    (overlay as any)._unbind = bindDialog(overlay, { label: 'Пауза', onClose: () => resumeSession() });
    announce(aborted ? 'Пауза. Блок начнётся заново' : 'Пауза');
  }

  function resumeSession() {
    if (!isPaused) return;
    isPaused = false;
    const overlay = document.getElementById('pause-overlay');
    const aborted = overlay?.dataset.aborted === '1';
    if (overlay) {
      const unbind = (overlay as any)._unbind;
      if (unbind) unbind();
      overlay.remove();
    }
    const btn = document.getElementById('btn-pause');
    if (btn) {
      btn.textContent = 'Пауза';
      btn.setAttribute('aria-pressed', 'false');
    }
    announce('Продолжаем');
    if (aborted) renderCurrent();
    else btn?.focus();
  }

  const onVisibility = () => {
    if (document.hidden) pauseSession('background');
  };
  document.addEventListener('visibilitychange', onVisibility);
  const stopVisibility = () => document.removeEventListener('visibilitychange', onVisibility);

  timerInterval = setInterval(() => {
    if (!shouldTick(content.dataset.sessionPhase, isPaused, typeof document !== 'undefined' && document.hidden)) return;
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
