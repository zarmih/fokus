export const manifest = {
  id: 'arcade-shooter',
  name: 'Космический стрелок',
  instruction: 'Управляйте кораблем, чтобы сбивать летящие сверху цели. Промах снижает точность!',
  domain: 'speed',
  skills: ['reaction', 'tracking'],
  metricModel: {
    weightAccuracy: 0.7,
    weightSpeed: 0.3,
    penaltyFactor: 1.5
  },
  levels: [
    { targetMs: 1500, spawnRateMs: 1200, speedBase: 2 },
    { targetMs: 1200, spawnRateMs: 1000, speedBase: 3 },
    { targetMs: 1000, spawnRateMs: 800, speedBase: 4 },
    { targetMs: 800, spawnRateMs: 600, speedBase: 5 },
    { targetMs: 600, spawnRateMs: 500, speedBase: 6 },
    { targetMs: 500, spawnRateMs: 400, speedBase: 7 }
  ]
};
