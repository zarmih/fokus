/**
 * Map fractional session difficulty to a safe 0-based LEVELS index.
 * Same semantics as pulley / go-no-go: floor the value, treat non-finite / 0
 * as level 1, then clamp so LEVELS[i] is never undefined.
 */
export function resolveLevelIndex(difficulty: unknown, length: number): number {
  if (!Number.isFinite(length) || length <= 0) return 0;
  const oneBased = Math.min(
    length,
    Math.max(1, Math.floor(Number(difficulty) || 1))
  );
  return oneBased - 1;
}
