import { getLocale } from './i18n';
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
  { id: 'balance', title: 'Баланс', desc: 'Тренировать все области поровну' },
  { id: 'memory', title: 'Память', desc: 'Удерживать и воспроизводить информацию' },
  { id: 'attention', title: 'Внимание', desc: 'Дольше концентрироваться и меньше отвлекаться' },
  { id: 'speed', title: 'Скорость', desc: 'Быстрее замечать и принимать решения' },
  { id: 'flexibility', title: 'Гибкость', desc: 'Легче переключаться между правилами' },
  { id: 'logic', title: 'Логика', desc: 'Видеть закономерности и решать задачи' }
];

export const DOMAIN_LABELS_EN: Record<string, string> = {
  attention: 'Attention',
  memory: 'Memory',
  speed: 'Speed',
  flexibility: 'Flexibility',
  logic: 'Logic'
};

export const SKILL_LABELS_EN: Record<string, string> = {
  visual_memory: 'Visual memory', working_memory: 'Working memory', spatial_memory: 'Spatial memory', recall: 'Recall',
  selective_attention: 'Selective attention', processing_speed: 'Processing speed', cognitive_flexibility: 'Cognitive flexibility',
  inhibitory_control: 'Impulse control', inhibition: 'Inhibition', quantitative_reasoning: 'Calculation',
  spatial_reasoning: 'Spatial reasoning', motor_control: 'Motor control', divided_attention: 'Divided attention',
  pattern_recognition: 'Pattern recognition', sustained_attention: 'Sustained attention', task_switching: 'Task switching',
  rule_switching: 'Rule switching', reaction_speed: 'Reaction speed', visual_scanning: 'Visual search',
  logical_reasoning: 'Logic', mental_calculation: 'Mental arithmetic', estimation: 'Estimation', numerical_processing: 'Numbers'
};

const GOAL_COPY_EN: Record<string, { title: string; desc: string }> = {
  balance: { title: 'Balance', desc: 'Train all areas equally' },
  memory: { title: 'Memory', desc: 'Hold and recall information' },
  attention: { title: 'Attention', desc: 'Focus longer, get distracted less' },
  speed: { title: 'Speed', desc: 'Notice and decide faster' },
  flexibility: { title: 'Flexibility', desc: 'Switch between rules more easily' },
  logic: { title: 'Logic', desc: 'Spot patterns and solve problems' }
};

/** Goal cards in the current language. */
export function goalCopy(): { id: string; title: string; desc: string }[] {
  if (getLocale() !== 'en') return GOAL_COPY;
  return GOAL_COPY.map((g) => ({ id: g.id, ...(GOAL_COPY_EN[g.id] || { title: g.title, desc: g.desc }) }));
}

export function domainLabel(id: string): string {
  if (getLocale() === 'en') return DOMAIN_LABELS_EN[id] || id;
  return DOMAIN_LABELS[id] || id;
}

export function skillLabel(id: string): string {
  if (getLocale() === 'en') return SKILL_LABELS_EN[id] || id.replace(/_/g, ' ');
  return SKILL_LABELS[id] || id.replace(/_/g, ' ');
}

export function leagueName(level: number): string {
  if (level < 10) return 'Бронза';
  if (level < 20) return 'Серебро';
  if (level < 30) return 'Золото';
  if (level < 40) return 'Платина';
  return 'Алмаз';
}
