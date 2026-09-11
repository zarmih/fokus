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
  'settings.install': { ru: 'Установить Fokus', en: 'Install Fokus' },
  'a11y.skip': { ru: 'Перейти к содержимому', en: 'Skip to content' },
  'a11y.nav': { ru: 'Основное меню', en: 'Main menu' },
  'a11y.streak': { ru: 'Серия: {n} дн.', en: 'Streak: {n} days' },
  'session.pause': { ru: 'Пауза', en: 'Pause' },
  'session.resume': { ru: 'Прод.', en: 'Resume' },

  'domain.attention': { ru: 'Внимание', en: 'Attention' },
  'domain.memory': { ru: 'Память', en: 'Memory' },
  'domain.speed': { ru: 'Скорость', en: 'Speed' },
  'domain.flexibility': { ru: 'Гибкость', en: 'Flexibility' },
  'domain.logic': { ru: 'Логика', en: 'Logic' },

  'weekly.title': { ru: 'Итоги недели', en: 'Week in review' },
  'weekly.cta': { ru: 'Итоги', en: 'Week' },
  'weekly.empty_title': { ru: 'Недостаточно данных', en: 'Not enough data' },
  'weekly.empty_body': {
    ru: 'На этой неделе не было тренировок. Fokus собирает данные, чтобы сформировать отчёт.',
    en: 'No sessions this week. Fokus waits for local history before writing a report.'
  },
  'weekly.days': { ru: 'Дней', en: 'Days' },
  'weekly.sessions': { ru: 'Сессий', en: 'Sessions' },
  'weekly.exercises': { ru: 'Упражнений', en: 'Exercises' },
  'weekly.changed_title': { ru: 'Что изменилось', en: 'What changed' },
  'weekly.changed_empty': {
    ru: 'Пока недостаточно подтверждённых изменений. Fokus продолжает калибровку ваших навыков.',
    en: 'Not enough confirmed changes yet. Fokus is still calibrating these skills.'
  },
  'weekly.next_step': { ru: 'Следующий шаг', en: 'Next step' },
  'weekly.narrative_kicker': { ru: 'Неделя своими словами', en: 'The week in words' },
  'weekly.domains_kicker': { ru: 'Области на неделе', en: 'Domains this week' },
  'weekly.domains_title': { ru: 'Что тренировали', en: 'What you trained' },
  'weekly.streak_kicker': { ru: 'Серия без прикрас', en: 'Streak, honestly' },
  'weekly.share_kicker': { ru: 'Карточка недели', en: 'Week card' },
  'weekly.share_title': { ru: 'Сохранить у себя', en: 'Save on this device' },
  'weekly.share_download': { ru: 'Скачать карточку', en: 'Download card' },
  'weekly.share_local_note': {
    ru: 'Файл остаётся на устройстве. Fokus никуда не отправляет отчёт.',
    en: 'The file stays on this device. Fokus does not upload the report.'
  },
  'weekly.share_footer': { ru: 'Fokus · локальная история', en: 'Fokus · local history' },
  'weekly.share_disclaimer': {
    ru: 'Не IQ, не диагноз, не «прокачка мозга».',
    en: 'Not an IQ score, not a diagnosis, not “brain upgrade”.'
  },
  'weekly.share.days': { ru: 'Дни', en: 'Days' },
  'weekly.share.sessions': { ru: 'Сессии', en: 'Sessions' },
  'weekly.share.domains': { ru: 'Области', en: 'Domains' },
  'weekly.share.streak': { ru: 'Серия', en: 'Streak' },
  'weekly.share.none': { ru: 'пока нет', en: 'none yet' },
  'weekly.trained': { ru: 'в работе', en: 'trained' },
  'weekly.quiet': { ru: 'тихо', en: 'quiet' },
  'weekly.cal_played': { ru: 'тренировка', en: 'trained' },
  'weekly.cal_missed': { ru: 'пауза', en: 'pause' },
  'weekly.cal_forgiven': { ru: 'прощённый пропуск', en: 'forgiven skip' },
  'weekly.a11y_report': { ru: 'Недельный отчёт Fokus', en: 'Fokus weekly report' },
  'weekly.a11y_share': { ru: 'Скачать карточку недели на это устройство', en: 'Download this week’s card to this device' },
  'weekly.a11y_calendar': { ru: 'Календарь недели: тренировка, пауза или прощённый пропуск', en: 'Week calendar: trained, pause, or forgiven skip' },

  'weekly.nar.empty.headline': { ru: 'Неделя тихая', en: 'A quiet week' },
  'weekly.nar.empty.p1': {
    ru: 'Сессий не было. Fokus не дорисовывает прогресс и не держит серию на пустом календаре.',
    en: 'No sessions. Fokus does not invent progress or keep a streak on an empty calendar.'
  },
  'weekly.nar.empty.p2': {
    ru: 'Короткий ритуал в привычном слоте важнее длинного отчёта. Когда появится история — здесь будет текст по фактам.',
    en: 'A short ritual in a familiar slot beats a long report. Copy appears when there is history.'
  },
  'weekly.nar.warming.headline': { ru: 'Пока рано складывать неделю', en: 'Too early to sum the week' },
  'weekly.nar.warming.p1': {
    ru: '{daysPhrase} с тренировкой, {sessionsPhrase}. Это задел, не вывод о форме.',
    en: '{daysPhrase} with training, {sessionsPhrase}. A start, not a verdict on form.'
  },
  'weekly.nar.warming.p2': {
    ru: 'Ещё два-три ритуала — и появится, какие области реально работали. Чуда из одного блока не будет.',
    en: 'Two or three more rituals, and it will be clear which domains actually worked. One block is not a miracle.'
  },
  'weekly.nar.habit.headline': { ru: '{daysPhrase} подряд — без дыр', en: '{daysPhrase} in a row — no gaps' },
  'weekly.nar.habit.p1': {
    ru: '{daysPhrase} из 7, {sessionsPhrase}. В работе: {domains}.',
    en: '{daysPhrase} out of 7, {sessionsPhrase}. In play: {domains}.'
  },
  'weekly.nar.habit.p2': {
    ru: 'Это ритм, не марафон. Удлинять сессии «за компанию» не нужно.',
    en: 'This is rhythm, not a marathon. No need to lengthen sessions for the sake of it.'
  },
  'weekly.nar.forgiven.headline': { ru: 'Серия есть — подряд не было', en: 'A streak, but not in a row' },
  'weekly.nar.forgiven.p1': {
    ru: 'Серия {streak}, на этой неделе {playedPhrase} с тренировкой. Один день Fokus простил — это пауза, не тренировка.',
    en: 'Streak {streak}, {playedPhrase} trained this week. Fokus forgave one day — that is a pause, not training.'
  },
  'weekly.nar.forgiven.p2': {
    ru: 'Мы не пишем «дней подряд», если в ряду был пропуск. Регулярность важнее закрытого календаря.',
    en: 'We do not say “in a row” when a skip sits in the run. Regularity beats a filled calendar.'
  },
  'weekly.nar.broken.headline': { ru: 'Ряд оборвался', en: 'The run broke' },
  'weekly.nar.broken.p1': {
    ru: 'На неделе {playedPhrase} с тренировкой, но пауза сбросила серию. Навык от этого не обнуляется.',
    en: '{playedPhrase} trained this week, but a gap reset the streak. The skill does not zero out.'
  },
  'weekly.nar.broken.p2': {
    ru: 'Навёрстывать пропущенные дни не нужно. Завтра достаточно короткого блока.',
    en: 'No need to make up missed days. A short block tomorrow is enough.'
  },
  'weekly.nar.sparse.headline': { ru: 'Неделя с паузами', en: 'A week with pauses' },
  'weekly.nar.sparse.p1': {
    ru: '{playedPhrase} из 7, {sessionsPhrase}. Календарь не сплошной — и это нормально.',
    en: '{playedPhrase} out of 7, {sessionsPhrase}. The calendar is not solid — that is fine.'
  },
  'weekly.nar.sparse.p2': {
    ru: 'Fokus считает только дни с сессией. Пустая клетка не становится «почти тренировкой».',
    en: 'Fokus counts only days with a session. An empty cell does not become “almost training”.'
  },
  'weekly.nar.mix.p2': {
    ru: 'На неделе больше всего ушло в «{strong}», меньше — в «{weak}».',
    en: 'Most of the week went into {strong}, less into {weak}.'
  },
  'weekly.nar.narrow.p2': {
    ru: 'Почти всё время было в «{domain}». Навыки в жизни не живут по отдельности.',
    en: 'Almost all time sat in {domain}. Skills in life do not live in isolation.'
  },
  'weekly.nar.balanced.p2': {
    ru: 'Области распределились ровно. Так и задумано: держим форму, а не качаем одну черту.',
    en: 'Domains landed evenly. That is the point: keep form, do not pump a single trait.'
  },
  'weekly.nar.transfer_hook': {
    ru: 'Ниже — заметка переноса: «{title}».',
    en: 'A transfer note below: “{title}”.'
  },
  'weekly.nar.focus_hook': {
    ru: 'Фокус недели — {domain}. Это смещение набора, не курс лечения.',
    en: 'Focus of the week is {domain}. A mix shift, not a course of treatment.'
  },

  'weekly.honesty.empty': {
    ru: 'Серии нет: на неделе не было сессий. Пустые дни не копим.',
    en: 'No streak: no sessions this week. Empty days are not banked.'
  },
  'weekly.honesty.intact': {
    ru: 'Серия {streak}. На этой неделе {livePhrase} подряд — все с сессией, без прощённого пропуска.',
    en: 'Streak {streak}. This week {livePhrase} in a row — every day had a session, no forgiven skip.'
  },
  'weekly.honesty.forgiven': {
    ru: 'Серия {streak}, но подряд не было: в ряду есть прощённый пропуск. Тренировочных дней в текущем ряде — {live}.',
    en: 'Streak {streak}, but not consecutive: a forgiven skip sits in the run. Trained days in the current run: {live}.'
  },
  'weekly.honesty.broken': {
    ru: 'Серия сброшена после паузы. На неделе {playedPhrase} с тренировкой — это факты, не непрерывность.',
    en: 'The streak reset after a gap. {playedPhrase} trained this week — facts, not continuity.'
  },
  'weekly.honesty.sparse': {
    ru: 'Серия {streak}. На неделе {playedPhrase}, и они не стоят сплошняком. Считаем дни с сессией, не клетки календаря.',
    en: 'Streak {streak}. {playedPhrase} this week, not a solid block. We count session days, not calendar cells.'
  },
  'weekly.honesty.share.intact': { ru: '{n} подряд', en: '{n} in a row' },
  'weekly.honesty.share.forgiven': { ru: '{n}, с пропуском', en: '{n}, with a skip' },
  'weekly.honesty.share.broken': { ru: 'сброс · {n} дн.', en: 'reset · {n}d' },
  'weekly.honesty.share.sparse': { ru: '{n} дн. с паузами', en: '{n}d with pauses' },
  'weekly.honesty.share.empty': { ru: 'нет серии', en: 'no streak' }
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

export function t(key: string, vars?: Record<string, string | number>, locale?: Locale): string {
  const loc: Locale = locale === 'en' || locale === 'ru' ? locale : currentLocale;
  const entry = dictionary[key];
  let out = entry ? entry[loc] || entry.ru : key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.split(`{${k}}`).join(String(v));
    }
  }
  return out;
}

export function hasI18nKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(dictionary, key);
}

export function peekI18n(key: string, locale: Locale): string | undefined {
  return dictionary[key]?.[locale];
}

export function listI18nKeys(): string[] {
  return Object.keys(dictionary);
}
