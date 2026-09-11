export const manifest = {
  id: 'frame-swap',
  name: 'Смена кадра',
  domain: 'flexibility',
  skills: ['task_switching', 'cognitive_flexibility'],
  metricModel: 'speed-accuracy',
  instruction: 'КРУГЛАЯ рамка: выберите фигуру ТАКОГО ЖЕ ЦВЕТА. КВАДРАТНАЯ рамка: выберите ТАКУЮ ЖЕ ФИГУРУ.'
};
export function getParams(level: number) {
  return { optionsCount: level > 3 ? 4 : 2 };
}
