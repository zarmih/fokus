import type { DomainIndex } from './types';

/**
 * Honest domain → everyday-skill map.
 * Training practises on-screen tasks. Transfer to daily life is modest and situational.
 * No IQ / miracle / medical claims.
 */

export const TRANSFER_DOMAINS = [
  'memory',
  'attention',
  'logic',
  'speed',
  'flexibility'
] as const;

export type TransferDomain = (typeof TRANSFER_DOMAINS)[number];

export interface DailySituation {
  id: string;
  situation: string;
  practiceLink: string;
}

export interface TransferEntry {
  domain: TransferDomain;
  label: string;
  trains: string;
  notClaimed: string;
  situations: DailySituation[];
}

export const WEEKLY_FOCUS_BIAS = 18;

export const TRANSFER_MAP: Record<TransferDomain, TransferEntry> = {
  memory: {
    domain: 'memory',
    label: 'Память',
    trains: 'Удерживать несколько элементов и воспроизвести их через короткий интервал.',
    notClaimed: 'Не обещает суперпамять, запоминание книг или рост IQ.',
    situations: [
      {
        id: 'memory-list',
        situation: 'На кассе вспомнить 4–5 пунктов без телефона',
        practiceLink: 'Короткое удержание ряда ближе к списку покупок, чем к «улучшению памяти навсегда».'
      },
      {
        id: 'memory-name',
        situation: 'Удержать имя человека до конца короткого разговора',
        practiceLink: 'Повтор сразу после представления помогает на минуту-другую — не навсегда.'
      },
      {
        id: 'memory-code',
        situation: 'Помнить код домофона, пока ищете ключи',
        practiceLink: 'Рабочая память держит несколько знаков, пока руки заняты другой задачей.'
      }
    ]
  },
  attention: {
    domain: 'attention',
    label: 'Внимание',
    trains: 'Замечать нужный объект среди похожих и удерживать задачу, когда рядом есть отвлечение.',
    notClaimed: 'Не лечит СДВГ и не делает внимание «железным» на весь день.',
    situations: [
      {
        id: 'attention-paragraph',
        situation: 'Дочитать абзац, не соскакивая на уведомление',
        practiceLink: 'Удержание цели при помехе ближе к чтению письма, чем к «прокачке концентрации».'
      },
      {
        id: 'attention-typo',
        situation: 'Заметить опечатку в своём письме перед отправкой',
        practiceLink: 'Избирательное внимание тренирует поиск отличия среди похожих знаков.'
      },
      {
        id: 'attention-stop',
        situation: 'Не пропустить нужную остановку, когда в наушниках подкаст',
        practiceLink: 'Нужный сигнал среди фона — та же задача, что поиск цели на экране.'
      }
    ]
  },
  logic: {
    domain: 'logic',
    label: 'Логика',
    trains: 'Сравнивать условия, находить закономерность и проверять, что решение согласовано.',
    notClaimed: 'Не превращает в аналитика и не заменяет профессиональный счёт.',
    situations: [
      {
        id: 'logic-tariff',
        situation: 'Понять, какой из двух тарифов дешевле при вашей нагрузке',
        practiceLink: 'Сравнение условий на экране ближе к выбору тарифа, чем к «рост интеллекта».'
      },
      {
        id: 'logic-overlap',
        situation: 'Заметить, что в расписании два дела пересекаются',
        practiceLink: 'Проверка согласованности — тот же навык, что поиск противоречия в задаче.'
      },
      {
        id: 'logic-recipe',
        situation: 'Проверить, что шаги рецепта идут в рабочем порядке',
        practiceLink: 'Порядок и правило важнее скорости, когда цена ошибки — испорченный ужин.'
      }
    ]
  },
  speed: {
    domain: 'speed',
    label: 'Скорость',
    trains: 'Быстрее выбирать ответ, когда правило уже понятно.',
    notClaimed: 'Не обещает спортивную реакцию и не готовит к вождению.',
    situations: [
      {
        id: 'speed-board',
        situation: 'Успеть выбрать нужную строку на табло, пока оно не сменилось',
        practiceLink: 'Быстрый выбор среди знакомых вариантов — не «молниеносный мозг».'
      },
      {
        id: 'speed-button',
        situation: 'Быстро найти нужную кнопку в знакомом приложении',
        practiceLink: 'Скорость растёт, когда правило уже выучено. Новое меню так не ускорится.'
      },
      {
        id: 'speed-kettle',
        situation: 'Вовремя снять чайник, когда закипел',
        practiceLink: 'Короткое решение по понятному сигналу. Это не тренировка за рулём.'
      }
    ]
  },
  flexibility: {
    domain: 'flexibility',
    label: 'Гибкость',
    trains: 'Переключаться между правилами и не продолжать старое, когда задача сменилась.',
    notClaimed: 'Не делает характер гибче и не убирает стресс от внезапных перемен.',
    situations: [
      {
        id: 'flex-door',
        situation: 'Переключиться с письма на разговор у двери, затем вернуться',
        practiceLink: 'Смена правила на экране ближе к смене контекста, чем к «гибкости личности».'
      },
      {
        id: 'flex-route',
        situation: 'Поменять маршрут, когда остановку закрыли',
        practiceLink: 'Отпустить старое правило и взять новое — тот же жест, что в задаче на переключение.'
      },
      {
        id: 'flex-meeting',
        situation: 'Пересобрать час, когда встреча сдвинулась',
        practiceLink: 'Переключение помогает начать заново. Настроение от сдвига оно не чинит.'
      }
    ]
  }
};

export function isTransferDomain(id: string): id is TransferDomain {
  return (TRANSFER_DOMAINS as readonly string[]).includes(id);
}

export function getTransferEntry(domain: string): TransferEntry | null {
  if (!isTransferDomain(domain)) return null;
  return TRANSFER_MAP[domain];
}

export function startOfWeekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickSituation(domain: string, salt = ''): DailySituation | null {
  const entry = getTransferEntry(domain);
  if (!entry || entry.situations.length === 0) return null;
  const idx = hashString(`${domain}:${salt}`) % entry.situations.length;
  return entry.situations[idx];
}

export interface TransferTip {
  domain: TransferDomain;
  label: string;
  situation: string;
  practiceLink: string;
}

export function buildTransferTip(domain: string, salt = ''): TransferTip | null {
  const entry = getTransferEntry(domain);
  const situation = pickSituation(domain, salt);
  if (!entry || !situation) return null;
  return {
    domain: entry.domain,
    label: entry.label,
    situation: situation.situation,
    practiceLink: situation.practiceLink
  };
}

export function rotatingTipDomain(now: Date): TransferDomain {
  const key = startOfWeekKey(now);
  return TRANSFER_DOMAINS[hashString(key) % TRANSFER_DOMAINS.length];
}

export function weakestTransferDomain(domains: DomainIndex[]): TransferDomain | null {
  const ready = domains
    .filter((d) => isTransferDomain(d.domain) && d.value > 0)
    .sort((a, b) => a.value - b.value);
  return ready.length > 0 ? (ready[0].domain as TransferDomain) : null;
}

export function strongestTransferDomain(domains: DomainIndex[]): TransferDomain | null {
  const ready = domains
    .filter((d) => isTransferDomain(d.domain) && d.value > 0)
    .sort((a, b) => b.value - a.value);
  return ready.length > 0 ? (ready[0].domain as TransferDomain) : null;
}

/** Modest planner bias. Returns 0 when the weekly focus is missing — graceful no-op. */
export function weeklyFocusBias(exerciseDomain: string, focusOfTheWeek?: string | null): number {
  if (!focusOfTheWeek || !isTransferDomain(focusOfTheWeek)) return 0;
  return exerciseDomain === focusOfTheWeek ? WEEKLY_FOCUS_BIAS : 0;
}

export function ruPlural(n: number, one: string, few: string, many: string): string {
  const n10 = n % 10;
  const n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} ${one}`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}
