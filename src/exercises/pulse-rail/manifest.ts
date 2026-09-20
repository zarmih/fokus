export const manifest = {
  id: 'pulse-rail',
  name: 'Пульс-рельс',
  domain: 'attention',
  skills: ['selective_attention', 'inhibition'],
  metricModel: 'speed-accuracy',
  instruction: 'В центре указан целевой цвет. Нажимайте на рельс (Влево или Вправо), когда на нем появляется фигура целевого цвета. Игнорируйте другие цвета.'
};
export function getParams(level: number) {
  const speedMs = Math.max(500, 1200 - level * 80);
  const colors = level > 5 ? 4 : (level > 2 ? 3 : 2);
  return { speedMs, colors };
}
