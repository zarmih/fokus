export type Recency = 'new' | 'recent' | 'rested' | 'quiet';

const DAY_MS = 86400000;

export function exerciseRecency(lastPlayedAt: string | null | undefined, nowMs: number): Recency {
  if (!lastPlayedAt) {
    return 'new';
  }
  const timestamp = new Date(lastPlayedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return 'new';
  }
  
  const diffMs = nowMs - timestamp;
  
  if (diffMs < 7 * DAY_MS) {
    return 'recent';
  }
  if (diffMs <= 21 * DAY_MS) {
    return 'rested';
  }
  return 'quiet';
}
