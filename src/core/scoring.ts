export function scoreBlock(params: {accuracy: number, level: number, avgRtMs: number, targetMs: number}): number {
  const {accuracy, level, avgRtMs, targetMs} = params;
  if (accuracy === 0) return 0;
  const rtRatio = avgRtMs > 0 ? targetMs / avgRtMs : 1;
  const clamp = Math.max(0.7, Math.min(1.3, rtRatio));
  return Math.round(accuracy * (100 + level * 12) * clamp);
}
