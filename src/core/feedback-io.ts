import {
  FEEDBACK_KEY,
  addFeedbackNote,
  emptyFeedbackStore,
  exportFeedbackPlain,
  parseFeedbackStore,
  recordAnalyticsEvent,
  serializeFeedbackStore,
  setAnalyticsOptIn,
  type AnalyticsEvent,
  type FeedbackKind,
  type FeedbackStore
} from './product-feedback';
import type { StorageBackend } from './privacy';

function backend(): StorageBackend {
  return {
    getItem: (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    setItem: (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* quota */
      }
    },
    removeItem: (k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
  };
}

let mem: FeedbackStore | null = null;

export function loadFeedback(store?: StorageBackend): FeedbackStore {
  if (mem && !store) return mem;
  const b = store || backend();
  mem = parseFeedbackStore(b.getItem(FEEDBACK_KEY));
  return mem;
}

export function saveFeedback(next: FeedbackStore, store?: StorageBackend): FeedbackStore {
  const b = store || backend();
  mem = next;
  b.setItem(FEEDBACK_KEY, serializeFeedbackStore(next));
  return next;
}

export function submitFeedback(
  input: { kind: FeedbackKind; text: string; screen?: string; softReturn?: boolean },
  store?: StorageBackend
): FeedbackStore {
  const cur = loadFeedback(store);
  const next = addFeedbackNote(cur, {
    kind: input.kind,
    text: input.text,
    context: {
      screen: input.screen,
      softReturn: input.softReturn,
      appVersion: '0.6.0'
    }
  });
  return saveFeedback(next, store);
}

export function trackLocal(event: AnalyticsEvent, store?: StorageBackend): FeedbackStore {
  const cur = loadFeedback(store);
  const next = recordAnalyticsEvent(cur, event);
  if (next === cur) return cur;
  return saveFeedback(next, store);
}

export function setLocalAnalyticsOptIn(optedIn: boolean, store?: StorageBackend): FeedbackStore {
  return saveFeedback(setAnalyticsOptIn(loadFeedback(store), optedIn), store);
}

export function clearFeedback(store?: StorageBackend): void {
  const b = store || backend();
  b.removeItem(FEEDBACK_KEY);
  mem = emptyFeedbackStore();
}

export function feedbackExportText(store?: StorageBackend): string {
  return exportFeedbackPlain(loadFeedback(store));
}

export function __resetFeedbackMem() {
  mem = null;
}
