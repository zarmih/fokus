import { navigateTo } from '../router';
import { renderShell } from '../shell';
import { catalog, getManifest } from '../../exercises/catalog';
import { loadExercise } from '../../exercises/load-exercise';
import type { ExerciseModule } from '../../exercises/contract';
import { scoreBlock } from '../../core/scoring';
import { updateExerciseState, calculateNormalizedPerformance, updateDomainIndex, updateSkillIndex } from '../../core/adaptive';
import { nextStreak } from '../../core/streak';
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
import { planWithRecovery } from '../../core/recovery';
import type { FocusCheckpoint, Session, SessionEndReason } from '../../core/types';
import { computeFokusIndex } from '../../core/fokus-index';
import { checkAchievements } from '../../core/achievements';
import type { ProbeOutcome } from '../../core/calibration';
import type { SessionItem } from '../../core/types';
import { announce, bindDialog, setScreenTitle } from '../a11y';
import { difficultyFor, markEngineCalibrated, planForNow, recordEngineObservation } from '../../core/adaptive-plan';
import { applyFeedback, enterStage, playSessionCue, replayClass } from '../../core/motion';
import {
  TIMER_RING_C,
  buildCheckpoint,
  formatSessionClock,
  readFocusPrefs,
  sessionFocusFlags,
  setFocusDndLive,
  shouldSaveCheckpoint,
  timerRingOffset
} from '../../core/focus-mode';
import { renderInterruptOverlay, removeInterruptOverlay } from '../components/focus-d5';


export function renderSession(container: HTMLElement, params: {
  mode?: string;
  items: {exerciseId: string, difficulty?: number}[];
  durationSec?: number;
  resume?: FocusCheckpoint;
}) {
  const {items, mode = 'normal'} = params;
  const isProbe = mode === 'calibration' || mode === 'recalibration';
  const resume = params.resume && params.resume.mode === mode ? params.resume : null;
  let currentIndex = resume?.currentIndex ?? 0;
  const sessionResults: SessionItem[] = resume?.results ? resume.results.map((r) => ({ ...r })) : [];
  const probeOutcomes: ProbeOutcome[] = [];
  const domainDeltas: Record<string, number> = resume?.domainDeltas ? { ...resume.domainDeltas } : {};
  const sessionStartedAt = resume?.startedAt ?? new Date().toISOString();
  const sessionId = resume?.sessionId ?? Date.now().toString();
  let timerInterval: any;
  const sessionBudget = resume?.sessionBudget ?? params.durationSec ?? storage.getProfile().sessionLengthSec;
  let timeLeft = resume
    ? resume.timeLeft
    : mode === 'calibration' ? PROBE_BUDGET_SEC : isProbe ? items.length * 30 : sessionBudget;
  let sessionEndReason: SessionEndReason = 'completed';
  let blockTimeLeft = mode === 'calibration' ? PROBE_BLOCK_SEC : isProbe ? 30 : timeLeft;
  let isPaused = false;
  let currentCleanup: any = null;
  let fatigueCounter = 0;
  let skipReplanOnce = !!resume;
  let playing = false;
  let wakeLock: { release: () => Promise<void> } | null = null;
  let wakeGen = 0;

  const prefs = readFocusPrefs(storage.getProfile());
  const focus = sessionFocusFlags(prefs, mode);
  applyFocusDom(focus.active);
  setFocusDndLive(focus.dnd);

  const content = renderShell(container, { active: 'today', hideNav: true });
  if (focus.active) content.classList.add('is-focus-session');

  const snapshotCheckpoint = () =>
    buildCheckpoint({
      sessionId,
      startedAt: sessionStartedAt,
      mode,
      items,
      currentIndex,
      timeLeft,
      sessionBudget,
      results: sessionResults,
      domainDeltas
    });

  const saveCheckpointIfNeeded = () => {
    if (!shouldSaveCheckpoint({
      mode,
      focusActive: focus.active,
      currentIndex,
      resultsCount: sessionResults.length,
      playing
    })) return;
    const p = storage.getProfile();
    p.focusCheckpoint = snapshotCheckpoint();
    storage.setProfile(p);
  };

  const clearCheckpoint = () => {
    const p = storage.getProfile();
    if (!p.focusCheckpoint) return;
    p.focusCheckpoint = undefined;
    storage.setProfile(p);
  };

  const releaseWakeLock = () => {
    wakeGen += 1;
    const lock = wakeLock;
    wakeLock = null;
    lock?.release().catch(() => {});
  };

  const acquireWakeLock = () => {
    if (!focus.dnd) return;
    const gen = ++wakeGen;
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
    };
    nav.wakeLock?.request('screen').then((lock) => {
      if (gen !== wakeGen) {
        lock.release().catch(() => {});
        return;
      }
      wakeLock = lock;
    }).catch(() => {
      if (gen === wakeGen) wakeLock = null;
    });
  };

  const teardownFocus = () => {
    setFocusDndLive(false);
    applyFocusDom(false);
    releaseWakeLock();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onPageHide);
  };

  const paintTimer = () => {
    const t = document.getElementById('session-timer');
    if (!t) return;
    const clock = formatSessionClock(timeLeft);
    const digits = t.querySelector('.timer-digits');
    if (digits) digits.textContent = clock;
    else t.textContent = clock;
    t.setAttribute('aria-label', `Осталось ${clock}`);
    const fill = t.querySelector('.timer-ring-fill');
    if (fill) fill.setAttribute('stroke-dashoffset', String(timerRingOffset(timeLeft, sessionBudget)));
  };

  const timerMarkup = () => {
    const clock = formatSessionClock(timeLeft);
    const ring = focus.timerRing
      ? `<svg class="timer-ring" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">
          <circle class="timer-ring-track" cx="24" cy="24" r="18" fill="none" stroke-width="4"></circle>
          <circle class="timer-ring-fill" cx="24" cy="24" r="18" fill="none" stroke-width="4"
            stroke-dasharray="${TIMER_RING_C.toFixed(3)}" stroke-dashoffset="${timerRingOffset(timeLeft, sessionBudget).toFixed(3)}"
            transform="rotate(-90 24 24)"></circle>
        </svg>`
      : '';
    return `<div class="session-timer${focus.timerRing ? ' has-ring' : ''}" id="session-timer" role="timer" aria-live="off" aria-label="Осталось ${clock}">
      ${ring}<span class="timer-digits">${clock}</span>
    </div>`;
  };

  const setPaused = (next: boolean, source: 'user' | 'system') => {
    if (isPaused === next) return;
    isPaused = next;
    const btn = document.getElementById('btn-pause');
    if (btn) {
      btn.textContent = isPaused ? 'Прод.' : 'Пауза';
      btn.setAttribute('aria-pressed', isPaused ? 'true' : 'false');
    }
    let overlay = document.getElementById('pause-overlay');
    if (isPaused) {
      renderInterruptOverlay(document.getElementById('game-container') || content, source, () => setPaused(false, 'user'));
      announce(source === 'system' ? 'Пауза, экран скрыт' : 'Пауза');
      if (source === 'system') saveCheckpointIfNeeded();
      releaseWakeLock();
    } else {
      removeInterruptOverlay();
      announce('Продолжаем');
      acquireWakeLock();
    }
  };

  function onVisibility() {
    if (!focus.dnd) return;
    if (document.hidden) {
      setPaused(true, 'system');
      saveCheckpointIfNeeded();
    }
  }

  function onPageHide() {
    saveCheckpointIfNeeded();
    releaseWakeLock();
  }

  const leaveSession = (dest: 'today' | 'trainers') => {
    if (currentCleanup) currentCleanup();
    clearInterval(timerInterval);
    if (mode === 'normal' && focus.active) {
      saveCheckpointIfNeeded();
    } else if (mode === 'normal' && sessionResults.length > 0) {
      persistAbandonedSession();
    }
    teardownFocus();
    navigateTo(dest);
  };

  const renderCurrent = () => {
    if (currentIndex >= items.length || timeLeft <= 0) {
      finishSession();
      return;
    }
    blockTimeLeft = mode === 'calibration' ? PROBE_BLOCK_SEC : isProbe ? 30 : timeLeft;
    playing = false;

    if (mode === 'normal' && currentIndex > 0 && !skipReplanOnce) {
      const profile = storage.getProfile();
      const ritual = planWithRecovery({
        durationSec: Math.max(180, timeLeft),
        catalog,
        domains: storage.getDomains(),
        skills: storage.getSkills(),
        states: storage.getExerciseStates(),
        primaryGoal: profile.primaryGoal,
        sessions: storage.getSessions(),
        daySummaries: storage.getDaySummaries(),
        recoveryHintsEnabled: profile.recoveryHints !== false,
        excludeIds: sessionResults.map((sr) => sr.exerciseId)
      });
      const nextItem = ritual.plan.items.find(pi => !sessionResults.some(sr => sr.exerciseId === pi.exerciseId));
      if (nextItem) {
        items[currentIndex].exerciseId = nextItem.exerciseId;
        items[currentIndex].difficulty = nextItem.difficulty;
      }
    }
    skipReplanOnce = false;

    const item = items[currentIndex];
    const preview = getManifest(item.exerciseId);
    if (!preview) {
      console.error('Unknown exercise', item.exerciseId);
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
    const lastBanner = last && lastEx && !focus.hideChrome ? `
      <div class="block-recap fx-enter ${last.accuracy >= 0.8 ? 'is-ok' : 'is-miss'}" aria-live="polite">
        ${lastEx.name}: ${Math.round(last.accuracy * 100)}% · +${Math.round(last.score)}
      </div>
    ` : '';

    content.dataset.sessionPhase = 'intro';
    content.dataset.focus = focus.active ? 'on' : 'off';
    content.innerHTML = `
      <div class="session-header${focus.hideChrome ? ' is-focus' : ''}">
        <div class="session-controls">
          <button id="btn-back" class="btn-tiny" type="button">${focus.hideChrome ? 'Выйти' : 'Назад'}</button>
          <button id="btn-pause" class="btn-tiny" type="button" aria-pressed="${isPaused ? 'true' : 'false'}">${isPaused ? 'Прод.' : 'Пауза'}</button>
          ${focus.hideChrome ? '' : '<button id="btn-restart" class="btn-tiny" type="button">Заново</button>'}
        </div>
        ${timerMarkup()}
        ${focus.hideChrome ? '' : `<div class="session-block-info">${mode === 'calibration' ? `Зонд · блок ${currentIndex + 1}` : `Блок ${currentIndex + 1} из ${items.length}`}</div>`}
      </div>
      ${lastBanner}
      <div class="instruction-card fx-enter" id="instruction-card">
        <div class="instruction-glow" aria-hidden="true"></div>
        <img src="${import.meta.env.BASE_URL}art/icon-${manifest.id}.svg" width="72" height="72" alt="" class="instruction-icon">
        <h2>${manifest.name}</h2>
        <p>${manifest.instruction}</p>
        <div class="instruction-meta">Блок ${currentIndex + 1} · уровень ${Math.floor(state.difficulty)}</div>
      </div>
      <button id="btn-next" class="btn-primary" type="button">${resume && currentIndex === (params.resume?.currentIndex ?? -1) && sessionResults.length > 0 ? 'Продолжить' : 'Начать'}</button>
      <div id="game-container" class="play-arena"></div>
    `;

    document.getElementById('btn-back')?.addEventListener('click', () => {
      leaveSession(mode === 'practice' ? 'trainers' : 'today');
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      setPaused(!isPaused, 'user');
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      if (currentCleanup) currentCleanup();
      timeLeft = mode === 'calibration' ? PROBE_BUDGET_SEC : isProbe ? items.length * 30 : sessionBudget;
      probeOutcomes.length = 0;
      isPaused = false;
      playing = false;
      removeInterruptOverlay();
      const pBtn = document.getElementById('btn-pause');
      if (pBtn) {
        pBtn.textContent = 'Пауза';
        pBtn.setAttribute('aria-pressed', 'false');
      }
      
      currentIndex = 0;
      sessionResults.length = 0;
      for (const key in domainDeltas) delete domainDeltas[key];
      clearCheckpoint();
      paintTimer();
      renderCurrent();
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      document.getElementById('instruction-card')?.remove();
      document.getElementById('btn-next')?.remove();
      
      const container = document.getElementById('game-container');
      if (!container) return;
      content.dataset.sessionPhase = 'countdown';
      container.setAttribute('aria-busy', 'true');

      const countdown = document.createElement('div');
      countdown.className = 'count-overlay is-tick';
      countdown.setAttribute('role', 'status');
      countdown.setAttribute('aria-live', 'assertive');
      container.appendChild(countdown);

      let count = 3;
      countdown.textContent = count.toString();
      playSessionCue('tick');
      let iv: any = null;
      let pendingModule: ExerciseModule | null = null;
      let countdownDone = false;

      const startBlock = (exDispatch: ExerciseModule) => {
        container.removeAttribute('aria-busy');
        countdown.remove();
        content.dataset.sessionPhase = 'play';
        playing = true;
        enterStage(container);
        playSessionCue('enter');
        const isTimeUp = () => blockTimeLeft <= 0 || timeLeft <= 0;
        let cleanupFn: any = null;

        const onBlockEnd = (res: any) => {
          if (cleanupFn) cleanupFn();
          playing = false;
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
            pSuccess: irtPick?.pSuccess
          };
          
          if (mode === 'normal') {
            import('../../core/quests').then(q => {
              q.updateQuestProgress('blocks', 1);
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
          saveCheckpointIfNeeded();
          
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

        cleanupFn = exDispatch.render(container, state!.difficulty, onBlockEnd, isTimeUp);
        currentCleanup = cleanupFn;
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
          replayClass(countdown, 'is-tick');
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
    playing = false;
    clearCheckpoint();
    teardownFocus();
    
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
      id: sessionId,
      startedAt: sessionStartedAt,
      finishedAt,
      durationSec: duration,
      items: sessionResults,
      interrupted: false,
      endReason: sessionEndReason,
      plannedDurationSec: sessionBudget
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

  function persistAbandonedSession() {
    const duration = Math.max(0, sessionBudget - timeLeft);
    if (storage.getSessions().some((s) => s.id === sessionId)) return;
    storage.addSession({
      id: sessionId,
      startedAt: sessionStartedAt,
      finishedAt: null,
      durationSec: duration,
      items: sessionResults,
      interrupted: true,
      endReason: 'abandoned',
      plannedDurationSec: sessionBudget
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

  timerInterval = setInterval(() => {
    if (isPaused) return;
    timeLeft--;
    blockTimeLeft--;
    paintTimer();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
    }
  }, 1000);

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onPageHide);
  acquireWakeLock();
  renderCurrent();
}

function applyFocusDom(active: boolean) {
  document.documentElement.classList.toggle('focus-mode', active);
  if (active) document.documentElement.dataset.focusMode = 'on';
  else delete document.documentElement.dataset.focusMode;
}
