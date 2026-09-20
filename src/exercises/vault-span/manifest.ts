export const manifest = {
  id: 'vault-span',
  name: 'Хранилище',
  domain: 'memory',
  skills: ['working_memory', 'visual_memory'],
  metricModel: 'capacity',
  instruction: 'Запомните, в каких ячейках хранилища появились монеты, и повторите их в ТОМ ЖЕ порядке.'
};
export function getParams(level: number) {
  const sequenceLength = Math.min(9, 3 + Math.floor(level / 2));
  return { sequenceLength };
}
