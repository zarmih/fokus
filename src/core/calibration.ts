export function mapAccuracyToStartLevel(accuracy: number): number {
  if (accuracy >= 0.95) return 8.0;
  if (accuracy >= 0.8) return 5.0; // high
  if (accuracy >= 0.5) return 3.0; // mid
  return 1.5; // low
}
