import { getLocale } from './i18n';

/**
 * English rendering of the plan's per-slot reasons and slot labels.
 * The engine produces Russian strings (they are also stored in history),
 * so translation happens only at display time and never changes stored data.
 */
const SLOT_LABEL_EN: Record<string, string> = {
  'Повторение': 'Review',
  'Слот дня': 'Daily slot',
  'Новое': 'New'
};

const REASON_PATTERNS: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^Смена контекста для прорыва$/, () => 'A change of context to break a plateau'],
  [/^Интервал вышел — пора повторить$/, () => 'Interval is up — time to review'],
  [/^Новое упражнение — знакомство$/, () => 'New exercise — first try'],
  [/^Слот дня — в зоне роста$/, () => 'Daily slot — in your growth zone'],
  [/^Новый стимул — расширяем карту$/, () => 'A fresh stimulus — widening your map'],
  [/^Ваша цель: день (\d+) \(сбор данных\)$/, (m) => `Your goal: day ${m[1]} (collecting data)`],
  [/^Неделя (\d+): цель и отстающий навык$/, (m) => `Week ${m[1]}: goal and weakest skill`],
  [/^Неделя (\d+): работа над целью$/, (m) => `Week ${m[1]}: working on your goal`],
  [/^Фокус (\d+)-й недели$/, (m) => `Week ${m[1]} focus`],
  [/^Фокус недели$/, () => 'Focus of the week'],
  [/^Сбор данных для адаптации$/, () => 'Collecting data to adapt'],
  [/^День (\d+): акцент на отстающий навык$/, (m) => `Day ${m[1]}: focus on the weakest skill`],
  [/^Веха фазы: (.+)$/, (m) => `Phase milestone: ${m[1] === 'Прилив у ворот' ? 'Tide Gate' : m[1] === 'Якорная пара' ? 'Anchor Pair' : m[1]}`],
  [/^Знакомый блок — плавное возвращение в ритм$/, () => 'Familiar block — smooth return to rhythm'],
  [/^Знакомое упражнение — плавное включение$/, () => 'Familiar exercise — easy warm-up'],
  [/^Сохранённый уровень$/, () => 'Saved level'],
  [/^Другая область — разгрузка$/, () => 'Different domain — recovery'],
  [/^Зона вызова$/, () => 'Challenge zone'],
  [/^Мягкий шаг — модель ещё учится$/, () => 'Gentle step — model is still learning'],
  [/^Снижаем нагрузку: форма ниже базы$/, () => 'Easing load: current form below baseline'],
  [/^Жёсткий вызов$/, () => 'High challenge'],
  [/^Закрепление уверенного уровня$/, () => 'Reinforcing confident level']
];

export function slotLabelText(label: string): string {
  if (getLocale() !== 'en') return label;
  const en = SLOT_LABEL_EN[label];
  if (en) return en;
  return /[А-Яа-яЁё]/.test(label) ? 'Slot' : label;
}

/** Plan reason in the UI language; unknown reasons in English fall back to a neutral line. */
export function planReasonText(reason: string | undefined): string {
  if (!reason) return '';
  if (getLocale() !== 'en') return reason;
  for (const [re, fn] of REASON_PATTERNS) {
    const m = reason.match(re);
    if (m) return fn(m);
  }
  return /[А-Яа-яЁё]/.test(reason) ? 'Picked for your plan' : reason;
}
