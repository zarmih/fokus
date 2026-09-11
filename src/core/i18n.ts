import { exerciseDictionary } from './i18n-exercises';

export type Locale = 'ru' | 'en';
export type I18nVars = Record<string, string | number>;

const uiDictionary: Record<string, Record<Locale, string>> = {
  // Nav / shell
  'today.title': { ru: 'Сегодня', en: 'Today' },
  'today.start': { ru: 'Начать тренировку', en: 'Start Training' },
  'today.done_title': { ru: 'Отличная работа!', en: 'Great job!' },
  'today.done_desc': { ru: 'План на сегодня выполнен. Отдыхайте.', en: 'Today’s plan is complete. Rest.' },
  'trainers.title': { ru: 'Каталог', en: 'Trainers' },
  'analytics.title': { ru: 'Статистика', en: 'Analytics' },
  'duel.title': { ru: 'Дуэль', en: 'Duel' },
  'settings.title': { ru: 'Настройки', en: 'Settings' },
  'program.title': { ru: 'Программа', en: 'Program' },

  // Today
  'today.hello.morning': { ru: 'Доброе утро', en: 'Good morning' },
  'today.hello.afternoon': { ru: 'Добрый день', en: 'Good afternoon' },
  'today.hello.evening': { ru: 'Добрый вечер', en: 'Good evening' },
  'today.balanced': { ru: 'Сбалансированная тренировка', en: 'Balanced session' },
  'today.quests': { ru: 'Квесты дня', en: 'Daily quests' },
  'today.quests_xp': { ru: '+{n} XP', en: '+{n} XP' },
  'today.coverage': { ru: '{n} из 5 областей', en: '{n} of 5 domains' },
  'today.first_step': { ru: 'Первый шаг', en: 'First step' },
  'today.calibrate_title': { ru: 'Калибровка уровня', en: 'Level calibration' },
  'today.calibrate_desc': {
    ru: 'Три коротких блока, около 90 секунд. После этого Fokus соберёт персональную сессию.',
    en: 'Three short blocks, about 90 seconds. After that Fokus builds a personal session.'
  },
  'today.calibrate_cta': { ru: 'Пройти калибровку', en: 'Start calibration' },
  'today.kicker_today': { ru: 'Сегодня', en: 'Today' },
  'today.plan_done': { ru: 'План выполнен', en: 'Plan complete' },
  'today.plan_done_desc': {
    ru: 'Дополнительная сессия не ломает прогресс — но лучший эффект даёт завтрашний ритуал.',
    en: 'An extra session will not break progress — but tomorrow’s ritual works better.'
  },
  'today.another_session': { ru: 'Ещё одна сессия', en: 'One more session' },
  'today.workout_kicker': { ru: 'Тренировка дня', en: 'Today’s session' },
  'today.workout_title': { ru: '{min} минут · {focus}', en: '{min} min · {focus}' },
  'today.start_session': { ru: 'Начать сессию', en: 'Start session' },
  'today.streak_start': { ru: 'начни серию', en: 'start a streak' },
  'today.streak_days': { ru: 'дней подряд', en: 'day streak' },
  'today.to_level': { ru: 'до ур. {n}', en: 'to lvl. {n}' },
  'today.yesterday': { ru: 'Вчерашний результат · {score} XP', en: 'Yesterday · {score} XP' },
  'today.yesterday_label': { ru: 'Вчерашний результат', en: 'Yesterday' },
  'today.coach_kicker': { ru: 'Коуч Fokus · {title}', en: 'Fokus coach · {title}' },
  'today.insight_kicker': { ru: 'Инсайт · {level}', en: 'Insight · {level}' },
  'today.insight.high': { ru: 'уверенный', en: 'confident' },
  'today.insight.medium': { ru: 'подтверждается', en: 'supported' },
  'today.insight.low': { ru: 'изучаем', en: 'still learning' },
  'today.lifestyle_title': { ru: 'Как вы сегодня?', en: 'How are you today?' },
  'today.lifestyle_lead': {
    ru: 'Необязательно. Помогает увидеть связь сна и результата.',
    en: 'Optional. Helps see how sleep relates to results.'
  },
  'today.sleep': { ru: 'Сон', en: 'Sleep' },
  'today.sleep.low': { ru: '&lt; 6 ч', en: '&lt; 6 h' },
  'today.sleep.normal': { ru: '6–8 ч', en: '6–8 h' },
  'today.sleep.high': { ru: '&gt; 8 ч', en: '&gt; 8 h' },
  'today.stress': { ru: 'Стресс', en: 'Stress' },
  'today.stress.low': { ru: 'Низкий', en: 'Low' },
  'today.stress.normal': { ru: 'Средний', en: 'Medium' },
  'today.stress.high': { ru: 'Высокий', en: 'High' },
  'today.lifestyle_skip': { ru: 'Пропустить', en: 'Skip' },

  // Program / session chrome
  'session.back': { ru: 'Назад', en: 'Back' },
  'session.pause': { ru: 'Пауза', en: 'Pause' },
  'session.resume': { ru: 'Прод.', en: 'Resume' },
  'session.restart': { ru: 'Заново', en: 'Restart' },
  'session.pause_overlay': { ru: 'Пауза', en: 'Paused' },
  'session.block_of': { ru: 'Блок {n} из {m}', en: 'Block {n} of {m}' },
  'session.block_level': { ru: 'Блок {n} · уровень {level}', en: 'Block {n} · level {level}' },
  'session.start': { ru: 'Начать', en: 'Start' },
  'session.recap': { ru: '{name}: {acc}% · +{score}', en: '{name}: {acc}% · +{score}' },
  'session.fatigue_title': { ru: 'Похоже, внимание падает', en: 'Attention looks tired' },
  'session.fatigue_lead': {
    ru: 'Два слабых блока подряд — это маркер усталости, не провала. Можно сохранить результат и остановиться.',
    en: 'Two weak blocks in a row mark fatigue, not failure. You can save the result and stop.'
  },
  'session.fatigue_end': { ru: 'Завершить сессию', en: 'End session' },
  'session.fatigue_go': { ru: 'Продолжить', en: 'Continue' },

  // Settings
  'settings.lang': { ru: 'Язык / Language', en: 'Language / Язык' },
  'settings.sound': { ru: 'Включить звуковые сигналы', en: 'Enable sound cues' },
  'settings.install': { ru: 'Установить Fokus', en: 'Install Fokus' },
  'settings.duration': { ru: 'Длительность сессии', en: 'Session length' },
  'settings.min5': { ru: '5 мин', en: '5 min' },
  'settings.min8': { ru: '8 мин', en: '8 min' },
  'settings.min12': { ru: '12 мин', en: '12 min' },
  'settings.goal': { ru: 'Главная цель', en: 'Primary goal' },
  'settings.theme': { ru: 'Тема', en: 'Theme' },
  'settings.theme.light': { ru: 'Светлая', en: 'Light' },
  'settings.theme.dark': { ru: 'Тёмная', en: 'Dark' },
  'settings.lang_ru': { ru: 'Русский', en: 'Русский' },
  'settings.lang_en': { ru: 'English', en: 'English' },
  'settings.sound_section': { ru: 'Звук', en: 'Sound' },
  'settings.install_section': { ru: 'Установка', en: 'Install' },
  'settings.install_cta': { ru: 'Установить Fokus на телефон / ПК', en: 'Install Fokus on phone / desktop' },
  'settings.install_hint': { ru: 'Для быстрого доступа без браузера', en: 'Quick access without the browser' },
  'settings.notifications': { ru: 'Уведомления', en: 'Notifications' },
  'settings.notifications_cta': { ru: 'Разрешить уведомления', en: 'Allow notifications' },
  'settings.notifications_on': { ru: 'Уведомления включены', en: 'Notifications on' },
  'settings.reminder_at': { ru: 'Напоминание в', en: 'Remind at' },
  'settings.reminder_off': { ru: 'Выкл', en: 'Off' },
  'settings.reminder_hint': {
    ru: 'Локальное напоминание, пока приложение установлено. Без сервера и без рекламы.',
    en: 'A local reminder while the app is installed. No server, no ads.'
  },
  'settings.notify_ok_body': { ru: 'Отлично! Теперь вы не пропустите тренировку.', en: 'Nice. You will not miss a session.' },
  'settings.notify_denied': { ru: 'Разрешение не получено.', en: 'Permission was not granted.' },
  'settings.notify_unsupported': { ru: 'Ваш браузер не поддерживает уведомления.', en: 'This browser does not support notifications.' },
  'settings.pre_session': { ru: 'Перед сессией', en: 'Before a session' },
  'settings.skip_lifestyle': { ru: 'Не спрашивать про сон и стресс', en: 'Do not ask about sleep and stress' },
  'settings.data': { ru: 'Данные', en: 'Data' },
  'settings.export': { ru: 'Экспорт', en: 'Export' },
  'settings.import': { ru: 'Импорт', en: 'Import' },
  'settings.reset': { ru: 'Сбросить профиль', en: 'Reset profile' },
  'settings.reset_confirm': {
    ru: 'Вы уверены, что хотите удалить все данные? Это действие необратимо.',
    en: 'Delete all data? This cannot be undone.'
  },
  'settings.import_ok': { ru: 'Данные успешно импортированы', en: 'Data imported' },
  'settings.import_err': { ru: 'Ошибка формата данных', en: 'Invalid data format' },
  'settings.disclaimer': {
    ru: 'Fokus — тренажёр для поддержания когнитивного тонуса. Не является медицинским изделием. Не предназначен для лечения или диагностики.',
    en: 'Fokus is a trainer for cognitive tone. It is not a medical device and is not meant to treat or diagnose.'
  },

  // Result
  'result.ready': { ru: 'Профиль готов', en: 'Profile ready' },
  'result.done': { ru: 'Тренировка завершена', en: 'Session complete' },
  'result.starter': { ru: 'стартовая оценка', en: 'starting estimate' },
  'result.total_points': { ru: 'всего очков', en: 'total points' },
  'result.avg_acc': { ru: 'Средняя точность: {n}%', en: 'Average accuracy: {n}%' },
  'result.avg_acc_label': { ru: 'Средняя точность', en: 'Average accuracy' },
  'result.sub': { ru: 'Точность {acc}% · Форма {form}', en: 'Accuracy {acc}% · Form {form}' },
  'result.compare': { ru: '{n} к прошлой сессии', en: '{n} vs last session' },
  'result.level_up': { ru: 'Новый уровень {n}', en: 'Level {n}' },
  'result.skill_shifts': { ru: 'Сдвиги навыков', en: 'Skill shifts' },
  'result.no_deltas': { ru: 'Нет изменений', en: 'No changes' },
  'result.progress': { ru: 'Результаты и прогресс', en: 'Results and progress' },
  'result.next': { ru: 'Следующий шаг', en: 'Next step' },
  'result.share': { ru: 'Поделиться', en: 'Share' },
  'result.done_btn': { ru: 'Готово', en: 'Done' },
  'result.accuracy': { ru: 'Точность {n}%', en: 'Accuracy {n}%' },
  'result.form': { ru: 'Форма {n}', en: 'Form {n}' },
  'result.mastery': { ru: 'Мастерство', en: 'Mastery' },
  'result.difficulty': { ru: 'Сложность', en: 'Difficulty' },
  'result.status': { ru: 'Статус', en: 'Status' },
  'result.calibration': { ru: 'Калибровка', en: 'Calibration' },
  'result.na': { ru: 'Н/Д', en: 'N/A' },
  'result.state.stable': { ru: 'Стабильно', en: 'Stable' },
  'result.state.up': { ru: '📈 Растёт', en: '📈 Rising' },
  'result.state.down': { ru: '📉 Падает', en: '📉 Falling' },
  'result.state.plateau': { ru: '➖ Плато', en: '➖ Plateau' },
  'result.state.calibrating': { ru: '🔄 Калибровка', en: '🔄 Calibrating' },

  // Common chrome
  'common.error_init': { ru: 'Ошибка инициализации', en: 'Startup error' },
  'common.error_nav': { ru: 'Ошибка навигации', en: 'Navigation error' },
  'fi.kicker': { ru: 'Fokus Index', en: 'Fokus Index' },
  'fi.delta.base': { ru: 'базовая оценка', en: 'baseline' },
  'fi.delta.up': { ru: '{n} к вчера', en: '{n} vs yesterday' },
  'fi.delta.down': { ru: '{n} к вчера', en: '{n} vs yesterday' },
  'fi.delta.flat': { ru: 'на уровне вчера', en: 'same as yesterday' },
  'fi.coverage': { ru: '{n} из 5 областей', en: '{n} of 5 domains' },

  // Domains / skills / goals / leagues
  'domain.attention': { ru: 'Внимание', en: 'Attention' },
  'domain.memory': { ru: 'Память', en: 'Memory' },
  'domain.speed': { ru: 'Скорость', en: 'Speed' },
  'domain.flexibility': { ru: 'Гибкость', en: 'Flexibility' },
  'domain.logic': { ru: 'Логика', en: 'Logic' },
  'skill.visual_memory': { ru: 'Зрительная память', en: 'Visual memory' },
  'skill.working_memory': { ru: 'Рабочая память', en: 'Working memory' },
  'skill.spatial_memory': { ru: 'Пространственная память', en: 'Spatial memory' },
  'skill.recall': { ru: 'Припоминание', en: 'Recall' },
  'skill.selective_attention': { ru: 'Избирательное внимание', en: 'Selective attention' },
  'skill.processing_speed': { ru: 'Скорость восприятия', en: 'Processing speed' },
  'skill.cognitive_flexibility': { ru: 'Когнитивная гибкость', en: 'Cognitive flexibility' },
  'skill.inhibitory_control': { ru: 'Подавление импульсов', en: 'Inhibitory control' },
  'skill.inhibition': { ru: 'Торможение', en: 'Inhibition' },
  'skill.quantitative_reasoning': { ru: 'Вычисления', en: 'Quantitative reasoning' },
  'skill.spatial_reasoning': { ru: 'Пространственное мышление', en: 'Spatial reasoning' },
  'skill.motor_control': { ru: 'Моторный контроль', en: 'Motor control' },
  'skill.divided_attention': { ru: 'Разделённое внимание', en: 'Divided attention' },
  'skill.pattern_recognition': { ru: 'Распознавание паттернов', en: 'Pattern recognition' },
  'skill.sustained_attention': { ru: 'Концентрация', en: 'Sustained attention' },
  'skill.task_switching': { ru: 'Переключение задач', en: 'Task switching' },
  'skill.rule_switching': { ru: 'Смена правила', en: 'Rule switching' },
  'skill.reaction_speed': { ru: 'Скорость реакции', en: 'Reaction speed' },
  'skill.visual_scanning': { ru: 'Зрительный поиск', en: 'Visual scanning' },
  'skill.logical_reasoning': { ru: 'Логика', en: 'Logical reasoning' },
  'skill.mental_calculation': { ru: 'Счёт в уме', en: 'Mental calculation' },
  'skill.estimation': { ru: 'Оценка величины', en: 'Estimation' },
  'skill.numerical_processing': { ru: 'Числа', en: 'Numbers' },
  'goal.balance.title': { ru: 'Баланс', en: 'Balance' },
  'goal.balance.desc': { ru: 'Равномерно прокачивать все области', en: 'Train all domains evenly' },
  'goal.memory.title': { ru: 'Память', en: 'Memory' },
  'goal.memory.desc': { ru: 'Удерживать и воспроизводить информацию', en: 'Hold and recall information' },
  'goal.attention.title': { ru: 'Внимание', en: 'Attention' },
  'goal.attention.desc': { ru: 'Дольше концентрироваться и меньше отвлекаться', en: 'Stay focused longer, get distracted less' },
  'goal.speed.title': { ru: 'Скорость', en: 'Speed' },
  'goal.speed.desc': { ru: 'Быстрее замечать и принимать решения', en: 'Notice and decide faster' },
  'goal.flexibility.title': { ru: 'Гибкость', en: 'Flexibility' },
  'goal.flexibility.desc': { ru: 'Легче переключаться между правилами', en: 'Switch between rules more easily' },
  'goal.logic.title': { ru: 'Логика', en: 'Logic' },
  'goal.logic.desc': { ru: 'Видеть закономерности и решать задачи', en: 'See patterns and solve problems' },
  'league.bronze': { ru: 'Бронза', en: 'Bronze' },
  'league.silver': { ru: 'Серебро', en: 'Silver' },
  'league.gold': { ru: 'Золото', en: 'Gold' },
  'league.platinum': { ru: 'Платина', en: 'Platinum' },
  'league.diamond': { ru: 'Алмаз', en: 'Diamond' },

  // Plan reasons (program / result)
  'plan.reason.balanced': { ru: 'Сбалансированная тренировка', en: 'Balanced session' },
  'plan.reason.maintain': { ru: 'Поддержание освоенного навыка', en: 'Keep a mastered skill sharp' },
  'plan.reason.context': { ru: 'Смена контекста для прорыва', en: 'Change of context to break a plateau' },
  'plan.reason.neglected': { ru: 'Забытый навык', en: 'Neglected skill' },
  'plan.reason.goal_and_growth': { ru: 'Ваша цель и зона роста', en: 'Your goal and growth area' },
  'plan.reason.goal': { ru: 'Работа над вашей целью', en: 'Work on your goal' },
  'plan.reason.weak': { ru: 'Укрепление слабой области', en: 'Strengthen a weak domain' },
  'plan.reason.skill': { ru: 'Развитие отстающего навыка', en: 'Develop a lagging skill' },
  'plan.reason.novel': { ru: 'Новое испытание', en: 'Something new' },

  // Coach (today)
  'coach.calibrate.title': { ru: 'Сначала настройка', en: 'Set up first' },
  'coach.calibrate.body': {
    ru: '90 секунд калибровки — и Fokus подстроит сложность под вас, а не наоборот.',
    en: '90 seconds of calibration — then Fokus matches difficulty to you, not the other way around.'
  },
  'coach.done.title': { ru: 'План выполнен', en: 'Plan complete' },
  'coach.done.body': {
    ru: 'Когнитивные навыки растут от регулярности, не от марафонов. Завтра Fokus соберёт новую сессию.',
    en: 'Skills grow from regularity, not marathons. Tomorrow Fokus will build a new session.'
  },
  'coach.streak_ok.title': { ru: 'Серия на месте', en: 'Streak still here' },
  'coach.streak_ok.body': {
    ru: 'Один пропуск Fokus уже простил. Пять минут сегодня закрепят привычку сильнее, чем час раз в неделю.',
    en: 'Fokus already forgave one miss. Five minutes today lock the habit better than an hour once a week.'
  },
  'coach.return.title': { ru: 'Вернуться легче, чем начать', en: 'Coming back is easier than starting' },
  'coach.return.body': {
    ru: 'Короткий блок внимания вернёт ритм. Не нужно навёрстывать пропущенные дни.',
    en: 'A short attention block brings the rhythm back. No need to make up missed days.'
  },
  'coach.window.title': { ru: 'Ваше сильное окно', en: 'Your strong window' },
  'coach.window.body': {
    ru: 'По прошлым сессиям вы сильнее {when}. Сегодня хорошее время для сложного блока.',
    en: 'Your past sessions are stronger {when}. This is a good time for a harder block.'
  },
  'coach.focus.title': { ru: 'Фокус дня', en: 'Today’s focus' },
  'coach.focus.body': {
    ru: 'Сегодня упор на «{domain}». Сложность подстроится по точности — ошибаться нормально.',
    en: 'Today leans on “{domain}”. Difficulty will follow accuracy — mistakes are fine.'
  },
  'coach.streak_n.title': { ru: '{n} дней подряд', en: '{n}-day streak' },
  'coach.streak_n.body': {
    ru: 'Регулярность важнее интенсивности: короткая сессия каждый день сильнее редких длинных.',
    en: 'Regularity beats intensity: a short session every day beats rare long ones.'
  },
  'coach.ritual.title': { ru: 'Короткий ритуал', en: 'A short ritual' },
  'coach.ritual.body': {
    ru: 'Тренируем конкретные задачи. Перенос в жизнь скромный — зато привычка внимания остаётся.',
    en: 'We train specific tasks. Transfer to daily life is modest — the attention habit stays.'
  },
  'chrono.morning': { ru: 'утром', en: 'in the morning' },
  'chrono.afternoon': { ru: 'днём', en: 'in the afternoon' },
  'chrono.evening': { ru: 'вечером', en: 'in the evening' },

  // Quests (today)
  'quest.q1.title': { ru: 'Марафонец', en: 'Marathoner' },
  'quest.q1.desc': { ru: 'Завершите 5 блоков за день', en: 'Finish 5 blocks today' },
  'quest.q2.title': { ru: 'Снайпер', en: 'Sharpshooter' },
  'quest.q2.desc': { ru: 'Достигните точности 90% в любом блоке', en: 'Reach 90% accuracy in any block' },
  'quest.q3.title': { ru: 'Рекордсмен', en: 'High score' },
  'quest.q3.desc': { ru: 'Наберите суммарно 500 очков за день', en: 'Score 500 points in a day' },
  'quest.q4.title': { ru: 'Разминка', en: 'Warm-up' },
  'quest.q4.desc': { ru: 'Завершите 3 блока без пропусков', en: 'Finish 3 blocks without skipping' },
  'quest.q5.title': { ru: 'Точность', en: 'Accuracy' },
  'quest.q5.desc': { ru: 'Наберите 80% точности в любом блоке', en: 'Reach 80% accuracy in any block' },

  // Insights (today)
  'insight.start.title': { ru: 'Начало пути', en: 'Just starting' },
  'insight.start.body': {
    ru: 'Мы всё ещё изучаем ваш профиль. Продолжайте тренироваться, чтобы получить персональные инсайты.',
    en: 'We are still learning your profile. Keep training to get personal insights.'
  },
  'insight.strength.title': { ru: 'Сильная сторона', en: 'Strength' },
  'insight.strength.body': {
    ru: '«{domain}» — ваша сильная область. Fokus будет поддерживать её и подтягивать остальные.',
    en: '“{domain}” is your strong area. Fokus will keep it and lift the others.'
  },
  'insight.growth.title': { ru: 'Зона роста', en: 'Growth area' },
  'insight.growth.body': {
    ru: '«{domain}» пока слабее остальных. Короткие повторы здесь дают самый быстрый прирост.',
    en: '“{domain}” is still weaker than the rest. Short repeats here give the fastest gain.'
  },
  'insight.progress.title': { ru: 'Заметный прогресс', en: 'Clear progress' },
  'insight.progress.body': { ru: 'Навык «{skill}» уверенно растёт. Так держать!', en: 'The skill “{skill}” is rising steadily. Keep going.' },
  'insight.plateau.title': { ru: 'Стабилизация', en: 'Stabilizing' },
  'insight.plateau.body': {
    ru: 'Ваш результат в игре «{name}» стабилизировался. Возможно, стоит переключиться на другие задачи для развития связанных навыков.',
    en: 'Your result in “{name}” has leveled off. Switching to related tasks may help those skills grow.'
  },
  'insight.habit.title': { ru: 'Привычка держится', en: 'The habit is holding' },
  'insight.habit.body': {
    ru: '{n} тренировок за последние 7 дней. Регулярность важнее длины сессии.',
    en: '{n} sessions in the last 7 days. Regularity matters more than session length.'
  },
  'insight.recovery.title': { ru: 'Отскок после спада', en: 'Bounce after a dip' },
  'insight.recovery.body': {
    ru: 'После более слабого дня результат вернулся. Это нормальная вариативность, не откат навыка.',
    en: 'After a weaker day the result came back. That is normal variation, not skill loss.'
  },
  'insight.sleep.title': { ru: 'Сон и результат', en: 'Sleep and score' },
  'insight.sleep.body': {
    ru: 'В дни с меньшим сном очки заметно ниже. Это корреляция, не диагноз — но короткий сон стоит учитывать.',
    en: 'Scores are lower on shorter-sleep days. Correlation, not a diagnosis — but short sleep is worth noticing.'
  },
  'insight.time.title': { ru: 'Удачное время', en: 'A good time' },
  'insight.time.body': {
    ru: 'Лучшие сессии у вас проходят {when}. Сложные блоки лучше ставить на это окно.',
    en: 'Your best sessions happen {when}. Put harder blocks in that window.'
  },

  // Achievements (result)
  'ach.first_session.name': { ru: 'Старт', en: 'Start' },
  'ach.first_session.desc': { ru: 'Первая полноценная тренировка', en: 'First full session' },
  'ach.streak_3.name': { ru: 'Огонь', en: 'Fire' },
  'ach.streak_3.desc': { ru: 'Тренировка 3 дня подряд', en: 'Train 3 days in a row' },
  'ach.streak_7.name': { ru: 'Неудержимый', en: 'Unstoppable' },
  'ach.streak_7.desc': { ru: 'Тренировка 7 дней подряд', en: 'Train 7 days in a row' },
  'ach.streak_14.name': { ru: 'Ритуал', en: 'Ritual' },
  'ach.streak_14.desc': { ru: 'Тренировка 14 дней подряд', en: 'Train 14 days in a row' },
  'ach.sniper.name': { ru: 'Снайпер', en: 'Sharpshooter' },
  'ach.sniper.desc': { ru: '100% точность за тренировку', en: '100% accuracy in a session' },
  'ach.night_owl.name': { ru: 'Сова', en: 'Night owl' },
  'ach.night_owl.desc': { ru: 'Тренировка после полуночи', en: 'Train after midnight' },
  'ach.early_bird.name': { ru: 'Жаворонок', en: 'Early bird' },
  'ach.early_bird.desc': { ru: 'Тренировка до 8 утра', en: 'Train before 8 a.m.' },
  'ach.veteran.name': { ru: 'Ветеран', en: 'Veteran' },
  'ach.veteran.desc': { ru: '50 пройденных блоков', en: '50 completed blocks' },
  'ach.explorer.name': { ru: 'Исследователь', en: 'Explorer' },
  'ach.explorer.desc': { ru: '10 разных упражнений', en: '10 different exercises' },
  'ach.balanced.name': { ru: 'Баланс', en: 'Balance' },
  'ach.balanced.desc': { ru: 'Данные по всем пяти областям', en: 'Data in all five domains' },

  // Share (result)
  'share.tagline': { ru: 'Тренировка внимания и памяти', en: 'Attention and memory training' },
  'share.points': { ru: 'очков за сессию', en: 'points this session' },
  'share.accuracy': { ru: 'Точность', en: 'Accuracy' },
  'share.streak': { ru: 'Серия', en: 'Streak' },
  'share.streak_n': { ru: '{n} дн.', en: '{n} d' },
  'share.focus': { ru: 'Фокус: {focus}', en: 'Focus: {focus}' },
  'share.fallback_focus': { ru: 'Короткие тренировки каждый день', en: 'Short sessions every day' },
  'share.text': { ru: 'Я набрал {score} очков в Fokus (точность {acc}%).', en: 'I scored {score} in Fokus ({acc}% accuracy).' },
  'share.text_plain': { ru: 'Я набрал {score} очков с точностью {acc}% в Fokus.', en: 'I scored {score} with {acc}% accuracy in Fokus.' },
  'share.copied': { ru: 'Результат скопирован в буфер обмена', en: 'Result copied to clipboard' },

  // Reminders (settings)
  'reminder.body': { ru: 'Пять минут на внимание и память. Серия ждёт.', en: 'Five minutes for attention and memory. The streak is waiting.' }
};

const dictionary: Record<string, Record<Locale, string>> = {
  ...uiDictionary,
  ...exerciseDictionary
};

let currentLocale: Locale = 'ru';

function applyDocumentLang(locale: Locale) {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = locale;
  }
}

export function getLocale(): Locale {
  return currentLocale;
}

export function localeTag(locale: Locale = currentLocale): string {
  return locale === 'en' ? 'en-US' : 'ru-RU';
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  applyDocumentLang(locale);
}

export function initI18n(lang: string | undefined) {
  if (lang === 'en' || lang === 'ru') {
    setLocale(lang);
  } else {
    setLocale('ru');
  }
}

export function hasKey(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(dictionary, key);
}

export function dictionaryKeys(): string[] {
  return Object.keys(dictionary);
}

export function dictionaryEntry(key: string): Record<Locale, string> | undefined {
  return dictionary[key];
}

export function t(key: string, vars?: I18nVars): string {
  const entry = dictionary[key];
  let s = entry ? (entry[currentLocale] || entry.ru) : key;
  if (vars) {
    s = s.replace(/\{(\w+)\}/g, (_, name: string) =>
      Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`
    );
  }
  return s;
}
