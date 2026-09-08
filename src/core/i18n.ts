export type Locale = 'ru' | 'en';

const dictionary: Record<string, Record<Locale, string>> = {
  'today.title': {
    ru: 'Сегодня',
    en: 'Today'
  },
  'today.start': {
    ru: 'Начать тренировку',
    en: 'Start Training'
  },
  'trainers.title': {
    ru: 'Тренажёры',
    en: 'Trainers'
  },
  'analytics.title': {
    ru: 'Аналитика',
    en: 'Analytics'
  },
  'duel.title': {
    ru: 'Дуэль',
    en: 'Duel'
  },
  'settings.title': {
    ru: 'Настройки',
    en: 'Settings'
  }
};

let currentLocale: Locale = 'ru';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function t(key: string): string {
  if (dictionary[key]) {
    return dictionary[key][currentLocale] || dictionary[key]['ru'];
  }
  return key; // fallback
}
