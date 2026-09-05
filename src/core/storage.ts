import type { Profile, DomainIndex, ExerciseState, Session, DaySummary } from "./types";

export const storage = {
  getProfile: (): Profile => {
    const data = localStorage.getItem('profile');
    if (data) return JSON.parse(data);
    return { createdAt: new Date().toISOString(), sessionLengthSec: 300, soundOn: true, locale: 'ru' };
  },
  setProfile: (p: Profile) => localStorage.setItem('profile', JSON.stringify(p)),
  
  getDomains: (): DomainIndex[] => JSON.parse(localStorage.getItem('domains') || '[]'),
  setDomains: (d: DomainIndex[]) => localStorage.setItem('domains', JSON.stringify(d)),
  
  getExerciseStates: (): ExerciseState[] => JSON.parse(localStorage.getItem('exerciseStates') || '[]'),
  setExerciseStates: (s: ExerciseState[]) => localStorage.setItem('exerciseStates', JSON.stringify(s)),

  getSessions: (): Session[] => JSON.parse(localStorage.getItem('sessions') || '[]'),
  setSessions: (s: Session[]) => localStorage.setItem('sessions', JSON.stringify(s)),

  getDaySummaries: (): DaySummary[] => JSON.parse(localStorage.getItem('daySummaries') || '[]'),
  setDaySummaries: (s: DaySummary[]) => localStorage.setItem('daySummaries', JSON.stringify(s)),

  clearAll: () => localStorage.clear(),
  exportJson: () => JSON.stringify(localStorage)
};
