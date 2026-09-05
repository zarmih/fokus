export const gridMemoryManifest = {
  id: 'grid-memory',
  name: 'Матрица',
  domain: 'memory',
  instruction: 'Запомните подсвеченные клетки. Воспроизведите их кликами.',
  levels: {
    1: { cells: 3, grid: 3, showMs: 1500, targetMs: 2000 },
    3: { cells: 4, grid: 4, showMs: 1000, targetMs: 1500 },
    20: { cells: 9, grid: 6, showMs: 300, targetMs: 800 }
  }
};
