import { L, getLocale } from './i18n';
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

const BANDS_EN: Record<string, { label: string; hint: string }> = {
  warmup: { label: 'Warm-up', hint: 'Easy start: getting used to the format, no chasing points.' },
  comfort: { label: 'Comfort', hint: 'Steady pace: hard enough to stay attentive, without overload.' },
  challenge: { label: 'Challenge', hint: 'Effort zone: mistakes are normal — this is how Fokus tunes the load.' },
  peak: { label: 'Peak', hint: 'High load: you may slow down or pause — that is not failure.' }
};

const DOMAIN_TIPS_EN: Record<Domain, string[]> = {
  attention: [
    'Track one feature at a time — coming back to the task matters more than “never drifting”.',
    'If your eyes wander, gently return to the target. The exercise trains returning, not perfect focus.',
    'For timing windows: a confident slightly-late tap beats a guess on the way in.'
  ],
  memory: [
    'Repeat the chain to yourself once before answering — a short series is easier to hold.',
    'Do not try to hold “everything”: the next step is enough.',
    'Two anchors are easier than a list: link the left and right symbol with a tiny story.'
  ],
  speed: [
    'Speed grows from calm correct answers, not from rushing in the first seconds.',
    'Slightly slower and more accurate is better: Fokus counts both accuracy and time.'
  ],
  flexibility: [
    'When the rule changes, take one breath, then answer.',
    'Rule switching is a narrow skill. Errors right after a switch are expected.'
  ],
  logic: [
    'Look for a simple rule in a short series — no elaborate stories needed.',
    'If stuck, compare the two obvious options and pick calmly.'
  ]
};

export const EXERCISE_TIPS_EN: Record<string, string> = {
  // Attention
  'odd-one': 'Scan the grid in small pairs by a single feature rather than trying to take in the whole field at once.',
  'go-no-go': 'Keep your finger relaxed above the screen; react to the confirmed target rather than the sudden appearance.',
  'tide-gate': 'Breathe evenly and watch the gate band, not the marker — peripheral vision will tell you when.',

  // Memory
  'grid-memory': 'Group the lit cells into simple shapes or lines — patterns are much easier to hold in memory.',
  'sequence': 'Hold the sequence as an inner rhythm or silent count: let each step cue the next.',
  'anchor-pair': 'Whisper “left …, right …” once — the pair lasts longer through the pause.',

  // Speed
  'math-sprint': 'Round to friendly tens and adjust the difference — calm arithmetic is more accurate than rushing.',
  'slip-mark': 'Focus on the motion between the objects — catch the sliding rhythm without tensing up.',
  'cut-bar': 'Wait until the fill crosses the threshold — this trains holding back an early impulse.',

  // Flexibility
  'stroop': 'Look at the color of the ink rather than reading the word — a calm micro-pause prevents automatic slips.',
  'switch-rule': 'When the rule flips, take one calm breath and verify the active header before tapping.',
  'helix-flip': 'Anchor onto one distinctive corner or feature rather than rotating the entire shape in your mind.',

  // Logic
  'pattern-next': 'Track how a single property shifts at a time — rotation, count, or color follow a steady progression.',
  'shape-equation': 'Find the row with identical shapes first — it gives you an immediate base value to unlock the rest.',
  'pulley': 'Trace motion through the chain starting from the drive wheel: direction flips with every direct contact.'
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
  const b = difficultyBand(difficulty);
  return getLocale() === 'en' ? BANDS_EN[b.id]?.label || b.label : b.label;
}

export const EXERCISE_TIPS: Record<string, string> = {
  // Attention
  'odd-one':
    'Не пытайтесь охватить всё поле сразу — сравнивайте элементы парами по одному признаку.',
  'go-no-go':
    'Держите палец расслабленным над экраном — реагируйте на подтверждение цели, а не на само появление фигуры.',
  'tide-gate':
    'Дышите ровно и смотрите на полосу ворот, а не на саму метку — периферия подскажет момент.',

  // Memory
  'grid-memory':
    'Группируйте подсвеченные клетки в простые фигуры или линии — так узор легче удержать в памяти.',
  'sequence':
    'Удерживайте цепочку внутренним ритмом или счётом: каждый шаг подсказывает следующий.',
  'anchor-pair':
    'Проговорите «слева …, справа …» шёпотом один раз — так пара держится дольше паузы.',

  // Speed
  'math-sprint':
    'Округляйте до круглых десятков и выравнивайте разницу — спокойный счёт точнее спешки.',
  'slip-mark':
    'Фокус на движении между объектами — ловите ритм скольжения без лишнего напряжения.',
  'cut-bar':
    'Дождитесь, когда заливка пересечет рубеж — это учит сдерживать ранний импульс.',

  // Flexibility
  'stroop':
    'Смотрите на оттенок букв, не читая само слово — короткая микропауза убережёт от автоматической ошибки.',
  'switch-rule':
    'Когда правило меняется, сделайте спокойный вдох и взгляните на плашку перед нажатием.',
  'helix-flip':
    'Опирайтесь на одну характерную деталь или угол, а не вращайте всю фигуру целиком.',

  // Logic
  'pattern-next':
    'Прослеживайте изменение одного свойства за раз — поворот, количество или цвет меняются по порядку.',
  'shape-equation':
    'Найдите строку с одинаковыми фигурами первой — она сразу даёт опорное значение для остальных.',
  'pulley':
    'Прослеживайте движение по цепочке от ведущего колеса: направление меняется при каждом прямом сцеплении.'
};

/** Stable tip pick from domain pool (no Math.random — uses floor(difficulty)). */
export function domainSessionTip(domain: Domain | string, difficulty = 1, exerciseId?: string): string {
  const en = getLocale() === 'en';
  if (exerciseId && (en ? EXERCISE_TIPS_EN[exerciseId] : EXERCISE_TIPS[exerciseId])) {
    return (en ? EXERCISE_TIPS_EN[exerciseId] : EXERCISE_TIPS[exerciseId])!;
  }
  const key = (DOMAIN_TIPS[domain as Domain] ? domain : 'attention') as Domain;
  const pool = en ? DOMAIN_TIPS_EN[key] : DOMAIN_TIPS[key];
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
    metaLine: L(`Блок ${params.blockIndex} · ${band.label}`, `Block ${params.blockIndex} · ${BANDS_EN[band.id]?.label || band.label}`),
    hintLine: L(`${band.hint} Область: ${domainName}. ${tip}`, `${BANDS_EN[band.id]?.hint || band.hint} Area: ${domainName}. ${tip}`)
  };
}

/** Banned competitor / FOMO tropes for tests and lint-style guards. */
export const CONTENT_BANNED =
  /wikium|lumosity|elevate|peak|neuronation|brain age|прокачай мозг|ваш IQ|гарантир.*IQ|не пропусти|last chance/i;

export function assertOriginalCopy(text: string): boolean {
  return !CONTENT_BANNED.test(text);
}
