/**
 * Privacy-friendly product feedback + optional local analytics.
 * Own design: nothing leaves the device unless the user copies/exports.
 * No third-party SDKs, no pixels, no accounts.
 */

export const FEEDBACK_KEY = 'fokus.feedback.v1';
export const FEEDBACK_SCHEMA = 1;

export type FeedbackKind = 'bug' | 'idea' | 'praise' | 'other';

export interface FeedbackNote {
  id: string;
  kind: FeedbackKind;
  text: string;
  createdAt: string;
  /** Optional local context — never auto-sent */
  context?: {
    screen?: string;
    softReturn?: boolean;
    appVersion?: string;
  };
}

export interface LocalAnalytics {
  /** Opt-in only. When false, counters are not updated. */
  optedIn: boolean;
  ritualsStarted: number;
  ritualsCompleted: number;
  softReturnOpens: number;
  installPromptShown: number;
  lastEventAt: string | null;
}

export interface FeedbackStore {
  schema: number;
  notes: FeedbackNote[];
  analytics: LocalAnalytics;
}

export function emptyFeedbackStore(): FeedbackStore {
  return {
    schema: FEEDBACK_SCHEMA,
    notes: [],
    analytics: {
      optedIn: false,
      ritualsStarted: 0,
      ritualsCompleted: 0,
      softReturnOpens: 0,
      installPromptShown: 0,
      lastEventAt: null
    }
  };
}

export function parseFeedbackStore(raw: string | null): FeedbackStore {
  if (!raw) return emptyFeedbackStore();
  try {
    const v = JSON.parse(raw);
    if (!v || typeof v !== 'object') return emptyFeedbackStore();
    const base = emptyFeedbackStore();
    const notes = Array.isArray(v.notes)
      ? v.notes
          .filter((n: any) => n && typeof n.text === 'string' && typeof n.id === 'string')
          .slice(0, 100)
          .map((n: any) => ({
            id: String(n.id),
            kind: (['bug', 'idea', 'praise', 'other'].includes(n.kind) ? n.kind : 'other') as FeedbackKind,
            text: String(n.text).slice(0, 2000),
            createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date().toISOString(),
            context: n.context && typeof n.context === 'object' ? n.context : undefined
          }))
      : [];
    const a = v.analytics && typeof v.analytics === 'object' ? v.analytics : {};
    return {
      schema: FEEDBACK_SCHEMA,
      notes,
      analytics: {
        optedIn: !!a.optedIn,
        ritualsStarted: Number(a.ritualsStarted) || 0,
        ritualsCompleted: Number(a.ritualsCompleted) || 0,
        softReturnOpens: Number(a.softReturnOpens) || 0,
        installPromptShown: Number(a.installPromptShown) || 0,
        lastEventAt: typeof a.lastEventAt === 'string' ? a.lastEventAt : null
      }
    };
  } catch {
    return emptyFeedbackStore();
  }
}

export function serializeFeedbackStore(store: FeedbackStore): string {
  return JSON.stringify({ ...store, schema: FEEDBACK_SCHEMA });
}

export function addFeedbackNote(
  store: FeedbackStore,
  input: { kind: FeedbackKind; text: string; context?: FeedbackNote['context'] },
  now = new Date(),
  rand = Math.random
): FeedbackStore {
  const text = input.text.trim().slice(0, 2000);
  if (!text) return store;
  const note: FeedbackNote = {
    id: `fb_${now.getTime().toString(36)}_${Math.floor(rand() * 1e6).toString(36)}`,
    kind: input.kind,
    text,
    createdAt: now.toISOString(),
    context: input.context
  };
  return { ...store, notes: [note, ...store.notes].slice(0, 100) };
}

export type AnalyticsEvent =
  | 'ritual_started'
  | 'ritual_completed'
  | 'soft_return_open'
  | 'install_prompt_shown';

export function recordAnalyticsEvent(
  store: FeedbackStore,
  event: AnalyticsEvent,
  now = new Date()
): FeedbackStore {
  if (!store.analytics.optedIn) return store;
  const analytics = { ...store.analytics, lastEventAt: now.toISOString() };
  if (event === 'ritual_started') analytics.ritualsStarted += 1;
  if (event === 'ritual_completed') analytics.ritualsCompleted += 1;
  if (event === 'soft_return_open') analytics.softReturnOpens += 1;
  if (event === 'install_prompt_shown') analytics.installPromptShown += 1;
  return { ...store, analytics };
}

export function setAnalyticsOptIn(store: FeedbackStore, optedIn: boolean): FeedbackStore {
  return {
    ...store,
    analytics: { ...store.analytics, optedIn }
  };
}

export function exportFeedbackPlain(store: FeedbackStore): string {
  const lines = [
    'Fokus — локальная обратная связь (ничему не отправлено автоматически)',
    `Заметок: ${store.notes.length}`,
    `Аналитика (opt-in): ${store.analytics.optedIn ? 'да' : 'нет'}`,
    ''
  ];
  for (const n of store.notes) {
    lines.push(`[${n.createdAt}] ${n.kind}: ${n.text}`);
  }
  if (store.analytics.optedIn) {
    lines.push('');
    lines.push('Локальные счётчики:');
    lines.push(`  ritualsStarted=${store.analytics.ritualsStarted}`);
    lines.push(`  ritualsCompleted=${store.analytics.ritualsCompleted}`);
    lines.push(`  softReturnOpens=${store.analytics.softReturnOpens}`);
    lines.push(`  installPromptShown=${store.analytics.installPromptShown}`);
  }
  return lines.join('\n');
}

export function feedbackPrivacyBlurb(): string {
  return 'Обратная связь и счётчики хранятся только на этом устройстве. Нет пикселей, нет сторонних аналитик, отправки нет — пока вы сами не скопируете или не экспортируете текст.';
}
