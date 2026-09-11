export type Locale = 'ru' | 'en';

const dictionary: Record<string, Record<Locale, string>> = {
  'today.title': { ru: 'Сегодня', en: 'Today' },
  'program.title': { ru: 'План', en: 'Plan' },
  'today.start': { ru: 'Начать тренировку', en: 'Start Training' },
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
  'session.resume': { ru: 'Прод.', en: 'Resume' },
  'session.handoff': { ru: 'Следующий блок', en: 'Next block' },
  'session.closing': { ru: 'Завершаем сессию', en: 'Closing the session' },
  'today.halo_ready': { ru: 'Ритуал дня', en: 'Today’s ritual' },
  'today.halo_progress': { ru: 'Ритуал дня, {pct}%', en: 'Today’s ritual, {pct}%' },
  'today.halo_done': { ru: 'Ритуал дня выполнен', en: 'Today’s ritual is done' }
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
