export function calculateScore(accuracy: number, level: number, avgRtMs: number, targetMs: number): number {
  const clamp = Math.max(0.7, Math.min(1.3, targetMs / avgRtMs));
  return Math.round(accuracy * (100 + level * 12) * clamp);
}
