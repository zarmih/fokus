export type Locale = 'ru' | 'en';

const dictionary: Record<string, Record<Locale, string>> = {
  'today.title': { ru: 'Сегодня', en: 'Today' },
  'program.title': { ru: 'План', en: 'Plan' },
  'today.start': { ru: 'Тренировка на сегодня', en: "Today's workout" },
  'today.done_title': { ru: 'Отличная работа!', en: 'Great job!' },
  'today.done_desc': { ru: 'План на сегодня выполнен. Отдыхайте.', en: 'Today’s plan is complete. Rest.' },
  'trainers.title': { ru: 'Каталог', en: 'Trainers' },
  'analytics.title': { ru: 'Статистика', en: 'Analytics' },
  'duel.title': { ru: 'Дуэль', en: 'Duel' },
  'settings.title': { ru: 'Настройки', en: 'Settings' },
  'settings.lang': { ru: 'Язык / Language', en: 'Language / Язык' },
  'settings.sound': { ru: 'Включить звуковые сигналы', en: 'Enable Sound' },
  'settings.volume': { ru: 'Громкость', en: 'Volume' },
  'settings.haptics': { ru: 'Вибрация (если устройство умеет)', en: 'Vibration (if the device supports it)' },
  'settings.install': { ru: 'Установить Fokus', en: 'Install Fokus' },
  'a11y.skip': { ru: 'Перейти к содержимому', en: 'Skip to content' },
  'a11y.nav': { ru: 'Основное меню', en: 'Main menu' },
  'a11y.streak': { ru: 'Серия: {n} дн.', en: 'Streak: {n} days' },
  'session.pause': { ru: 'Пауза', en: 'Pause' },
  'session.resume': { ru: 'Прод.', en: 'Resume' }
};

let currentLocale: Locale = 'ru';

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function initI18n(lang: string | undefined) {
  if (lang === 'en' || lang === 'ru') {
    currentLocale = lang;
  }
}

export function t(key: string, vars?: Record<string, string | number>): string {
  let out = dictionary[key] ? dictionary[key][currentLocale] || dictionary[key]['ru'] : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

/** Inline pair for main-path copy: Russian (default) / English. */
export function L(ru: string, en: string): string {
  return currentLocale === 'en' ? en : ru;
}

/** Suggested UI language for a new profile from the device (Russian-speaking → ru, else en). */
export function suggestLocale(langs: readonly string[] | undefined = typeof navigator !== 'undefined' ? navigator.languages : undefined): Locale {
  const list = (langs && langs.length ? langs : ['ru']).map((l) => l.toLowerCase());
  return list.some((l) => /^(ru|be|uk|kk)\b/.test(l)) ? 'ru' : 'en';
}

/** Plural helper: ru forms [one, few, many]; en [one, other]. */
export function plural(n: number, ru: [string, string, string], en: [string, string]): string {
  if (currentLocale === 'en') return n === 1 ? en[0] : en[1];
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return ru[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return ru[1];
  return ru[2];
}
