export function mapAccuracyToStartLevel(accuracy: number): number {
  if (accuracy >= 0.8) return 5; // high
  if (accuracy >= 0.5) return 3; // mid
  return 2; // low
}
