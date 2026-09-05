export const pulleyManifest = {
  id: 'pulley',
  name: 'Шкив',
  domain: 'logic',
  instruction: 'Подвесь ровно столько, сколько нужно двери. Лишнее — канат не тянет как надо.'
};

const LEVELS = [
  { need: [6, 9, 7, 5], pool: [1, 1, 2, 4, 4, 4, 4, 5, 6] },
  { need: [5, 8, 7, 6], pool: [1, 1, 2, 3, 5, 7, 7, 7] },
  { need: [5, 7, 9, 5], pool: [1, 1, 3, 3, 4, 4, 4, 4, 5] },
  { need: [5, 5, 5, 6], pool: [1, 1, 1, 1, 2, 3, 4, 4, 5] },
  { need: [6, 8, 7, 8], pool: [2, 3, 3, 3, 3, 4, 4, 5, 6] },
  { need: [8, 11, 7, 10], pool: [1, 1, 3, 6, 7, 7, 8, 9] },
  { need: [10, 9, 12, 10], pool: [1, 2, 4, 5, 5, 9, 9, 10] },
  { need: [10, 12, 8, 7], pool: [1, 2, 2, 3, 5, 7, 8, 10] },
  { need: [11, 10, 8, 12], pool: [1, 2, 3, 5, 6, 8, 8, 11] },
  { need: [8, 10, 10, 11], pool: [2, 3, 3, 4, 6, 7, 8, 10] },
  { need: [9, 9, 11, 8], pool: [1, 2, 4, 4, 5, 5, 8, 9] },
  { need: [7, 10, 11, 9], pool: [2, 2, 3, 4, 5, 5, 5, 7, 7] },
  { need: [7, 9, 10, 11], pool: [1, 3, 3, 4, 4, 5, 6, 7, 7] },
  { need: [10, 10, 12, 7], pool: [1, 2, 2, 2, 3, 4, 8, 9, 10] },
  { need: [8, 9, 7, 12], pool: [4, 4, 4, 7, 7, 8, 9] },
  { need: [14, 10, 16, 16], pool: [2, 5, 5, 5, 6, 8, 11, 14, 15] },
  { need: [12, 12, 16, 14], pool: [2, 2, 5, 7, 7, 9, 10, 10, 12] },
  { need: [12, 10, 15, 16], pool: [1, 2, 3, 5, 5, 10, 12, 16] },
  { need: [11, 13, 10, 15], pool: [2, 3, 4, 4, 7, 7, 10, 11, 11] },
  { need: [10, 15, 12, 15], pool: [1, 2, 3, 6, 7, 7, 8, 10, 14] }
];

export function getPulleyParams(level: number) {
  const l = Math.min(20, Math.max(1, level));
  const data = LEVELS[l - 1];
  const deadlineMs = Math.max(15000, 35000 - (l - 1) * 800);
  return { doors: 4, pool: [...data.pool], need: [...data.need], deadlineMs, targetMs: deadlineMs * 0.7 };
}
