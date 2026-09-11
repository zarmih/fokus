import { hasKey, t } from './i18n';

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

export function getGoalCopy(): { id: string; title: string; desc: string }[] {
  return GOAL_COPY.map((g) => ({
    id: g.id,
    title: t(`goal.${g.id}.title`),
    desc: t(`goal.${g.id}.desc`)
  }));
}

export function domainLabel(id: string): string {
  const key = `domain.${id}`;
  return hasKey(key) ? t(key) : (DOMAIN_LABELS[id] || id);
}

export function skillLabel(id: string): string {
  const key = `skill.${id}`;
  return hasKey(key) ? t(key) : (SKILL_LABELS[id] || id.replace(/_/g, ' '));
}

export function leagueName(level: number): string {
  if (level < 10) return t('league.bronze');
  if (level < 20) return t('league.silver');
  if (level < 30) return t('league.gold');
  if (level < 40) return t('league.platinum');
  return t('league.diamond');
}

export function exerciseName(id: string, fallback?: string): string {
  const key = `ex.${id}.name`;
  return hasKey(key) ? t(key) : (fallback || id);
}

export function exerciseInstruction(id: string, fallback?: string): string {
  const key = `ex.${id}.instruction`;
  return hasKey(key) ? t(key) : (fallback || '');
}

export function achievementName(id: string, fallback?: string): string {
  const key = `ach.${id}.name`;
  return hasKey(key) ? t(key) : (fallback || id);
}
