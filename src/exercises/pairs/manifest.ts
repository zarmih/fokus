export const pairsManifest = {
  id: 'pairs',
  name: 'Пары',
  domain: 'memory',
  instruction: 'Найди одинаковые картинки.'
};

export function getPairsParams(level: number) {
  const l = Math.min(20, Math.max(1, level));
  return {
    pairsCount: Math.min(8, 3 + Math.floor((l - 1) / 3)),
    previewMs: Math.max(500, 3000 - (l - 1) * 150)
  };
}
