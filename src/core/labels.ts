export const DOMAIN_ORDER = ['attention', 'memory', 'speed', 'flexibility', 'logic'] as const;

export type DomainId = (typeof DOMAIN_ORDER)[number];

export const DOMAIN_LABELS: Record<string, string> = {
  attention: 'Внимание',
  memory: 'Память',
  speed: 'Скорость',
  flexibility: 'Гибкость',
  logic: 'Логика'
};

export const DOMAIN_COLORS: Record<string, string> = {
  attention: 'var(--dom-attention)',
  memory: 'var(--dom-memory)',
  speed: 'var(--dom-speed)',
  flexibility: 'var(--dom-flexibility)',
  logic: 'var(--dom-logic)'
};

export const SKILL_LABELS: Record<string, string> = {
  visual_memory: 'Зрительная память',
  working_memory: 'Рабочая память',
  spatial_memory: 'Пространственная память',
  recall: 'Припоминание',
  selective_attention: 'Избирательное внимание',
  processing_speed: 'Скорость восприятия',
  cognitive_flexibility: 'Когнитивная гибкость',
  inhibitory_control: 'Подавление импульсов',
  inhibition: 'Торможение',
  quantitative_reasoning: 'Вычисления',
  spatial_reasoning: 'Пространственное мышление',
  motor_control: 'Моторный контроль',
  divided_attention: 'Разделённое внимание',
  pattern_recognition: 'Распознавание паттернов',
  sustained_attention: 'Концентрация',
  task_switching: 'Переключение задач',
  rule_switching: 'Смена правила',
  reaction_speed: 'Скорость реакции',
  visual_scanning: 'Зрительный поиск',
  logical_reasoning: 'Логика',
  mental_calculation: 'Счёт в уме',
  estimation: 'Оценка величины',
  numerical_processing: 'Числа'
};

export const GOAL_COPY: { id: string; title: string; desc: string }[] = [
  { id: 'balance', title: 'Баланс', desc: 'Равномерно прокачивать все области' },
  { id: 'memory', title: 'Память', desc: 'Удерживать и воспроизводить информацию' },
  { id: 'attention', title: 'Внимание', desc: 'Дольше концентрироваться и меньше отвлекаться' },
  { id: 'speed', title: 'Скорость', desc: 'Быстрее замечать и принимать решения' },
  { id: 'flexibility', title: 'Гибкость', desc: 'Легче переключаться между правилами' },
  { id: 'logic', title: 'Логика', desc: 'Видеть закономерности и решать задачи' }
];

export function domainLabel(id: string): string {
  return DOMAIN_LABELS[id] || id;
}

export function skillLabel(id: string): string {
  return SKILL_LABELS[id] || id.replace(/_/g, ' ');
}

export function leagueName(level: number): string {
  if (level < 10) return 'Бронза';
  if (level < 20) return 'Серебро';
  if (level < 30) return 'Золото';
  if (level < 40) return 'Платина';
  return 'Алмаз';
}
