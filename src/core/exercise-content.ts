/**
 * Original RU difficulty bands + session hints for exercise intro cards.
 * Fokus-owned copy — not Wikium/Lumosity/Peak tropes or IQ claims.
 */

import type { Domain } from '../exercises/contract';
import { domainLabel } from './labels';

export type DifficultyBandId = 'warmup' | 'comfort' | 'challenge' | 'peak';

export interface DifficultyBand {
  id: DifficultyBandId;
  /** Short uppercase-friendly label for instruction-meta. */
  label: string;
  /** One-line calm explanation under the band. */
  hint: string;
}

export interface SessionContent {
  band: DifficultyBand;
  /** Domain-flavoured tip shown on the intro card. */
  tip: string;
  /** Combined meta line: «Блок N · Разогрев». */
  metaLine: string;
  /** Full hint paragraph for the intro card. */
  hintLine: string;
}

const BANDS: DifficultyBand[] = [
  {
    id: 'warmup',
    label: 'Разогрев',
    hint: 'Мягкий вход: привыкаем к формату, без гонки за очками.'
  },
  {
    id: 'comfort',
    label: 'Комфорт',
    hint: 'Уверенный темп: достаточно сложно, чтобы быть внимательным, но без перегруза.'
  },
  {
    id: 'challenge',
    label: 'Вызов',
    hint: 'Зона усилия: ошибки нормальны — так Fokus подбирает нагрузку под вас.'
  },
  {
    id: 'peak',
    label: 'Пик',
    hint: 'Высокая нагрузка: можно снизить темп или сделать паузу — это не провал.'
  }
];

const DOMAIN_TIPS: Record<Domain, string[]> = {
  attention: [
    'Следите за одним признаком за раз — возвращаться к задаче важнее, чем «не отвлекаться».',
    'Если взгляд уплыл, мягко вернитесь к цели. Упражнение учит возврату, а не идеальной концентрации.',
    'Для задач с «окном» реакции: лучше чуть позже уверенно, чем тап наугад на подходе.'
  ],
  memory: [
    'Повторите цепочку про себя один раз перед ответом — так легче удержать короткий ряд.',
    'Не пытайтесь запомнить «всё сразу»: достаточно следующего шага.',
    'Два якоря проще, чем список: свяжите левый и правый знак короткой историей.'
  ],
  speed: [
    'Скорость растёт из спокойных правильных ответов, а не из спешки в первые секунды.',
    'Лучше чуть медленнее и точнее: Fokus учитывает и точность, и время.'
  ],
  flexibility: [
    'Когда правило меняется — сделайте паузу на один вдох, затем ответьте.',
    'Смена правила — узкий навык. Ошибки на переключении ожидаемы.'
  ],
  logic: [
    'Ищите простое правило в коротком ряду — сложные истории здесь не нужны.',
    'Если застряли, переберите два очевидных варианта и выберите спокойнее.'
  ]
};

/** Map continuous difficulty (1…30+) to a named RU band. */
export function difficultyBand(difficulty: number): DifficultyBand {
  const d = Number.isFinite(difficulty) ? difficulty : 1;
  if (d < 4) return BANDS[0];
  if (d < 10) return BANDS[1];
  if (d < 18) return BANDS[2];
  return BANDS[3];
}

export function difficultyBandLabel(difficulty: number): string {
  return difficultyBand(difficulty).label;
}

const EXERCISE_TIPS: Record<string, string> = {
  'tide-gate':
    'Дышите ровно и смотрите на полосу ворот, а не на саму метку — периферия подскажет момент.',
  'anchor-pair':
    'Проговорите «слева …, справа …» шёпотом один раз — так пара держится дольше паузы.'
};

/** Stable tip pick from domain pool (no Math.random — uses floor(difficulty)). */
export function domainSessionTip(domain: Domain | string, difficulty = 1, exerciseId?: string): string {
  if (exerciseId && EXERCISE_TIPS[exerciseId]) return EXERCISE_TIPS[exerciseId];
  const key = (DOMAIN_TIPS[domain as Domain] ? domain : 'attention') as Domain;
  const pool = DOMAIN_TIPS[key];
  const idx = Math.abs(Math.floor(difficulty)) % pool.length;
  return pool[idx];
}

/**
 * Build intro-card content for a session block.
 * Original Fokus wording; never claims IQ growth or competitor tropes.
 */
export function buildSessionContent(params: {
  blockIndex: number;
  difficulty: number;
  domain: Domain | string;
  instruction?: string;
  exerciseId?: string;
}): SessionContent {
  const band = difficultyBand(params.difficulty);
  const tip = domainSessionTip(params.domain, params.difficulty, params.exerciseId);
  const domainName = domainLabel(String(params.domain));
  return {
    band,
    tip,
    metaLine: `Блок ${params.blockIndex} · ${band.label}`,
    hintLine: `${band.hint} Область: ${domainName}. ${tip}`
  };
}

/** Banned competitor / FOMO tropes for tests and lint-style guards. */
export const CONTENT_BANNED =
  /wikium|lumosity|elevate|peak|neuronation|brain age|прокачай мозг|ваш IQ|гарантир.*IQ|не пропусти|last chance/i;

export function assertOriginalCopy(text: string): boolean {
  return !CONTENT_BANNED.test(text);
}
