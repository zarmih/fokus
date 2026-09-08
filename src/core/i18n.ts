export type Locale = 'ru' | 'en';

const dictionary: Record<string, Record<Locale, string>> = {
  'today.title': { ru: 'Сегодня', en: 'Today' },
  'today.start': { ru: 'Начать тренировку', en: 'Start Training' },
  'today.done_title': { ru: 'Отличная работа!', en: 'Great job!' },
  'today.done_desc': { ru: 'План на сегодня выполнен. Отдыхайте.', en: 'Today’s plan is complete. Rest.' },
  'trainers.title': { ru: 'Тренажёры', en: 'Trainers' },
  'analytics.title': { ru: 'Аналитика', en: 'Analytics' },
  'duel.title': { ru: 'Дуэль', en: 'Duel' },
  'settings.title': { ru: 'Настройки', en: 'Settings' },
  'settings.lang': { ru: 'Язык / Language', en: 'Language / Язык' },
  'settings.sound': { ru: 'Включить звуковые сигналы', en: 'Enable Sound' },
  'settings.install': { ru: 'Установить Fokus', en: 'Install Fokus' }
};

let currentLocale: Locale = 'ru';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function initI18n(lang: string | undefined) {
  if (lang === 'en' || lang === 'ru') {
    currentLocale = lang;
  }
}

export function t(key: string): string {
  if (dictionary[key]) {
    return dictionary[key][currentLocale] || dictionary[key]['ru'];
  }
  return key; // fallback
}
