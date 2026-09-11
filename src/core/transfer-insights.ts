import type { DaySummary, DomainIndex, Session, SessionItem } from './types';
import {
  TRANSFER_MAP,
  buildTransferTip,
  getTransferEntry,
  isTransferDomain,
  rotatingTipDomain,
  ruPlural,
  startOfWeekKey,
  strongestTransferDomain,
  weakestTransferDomain,
  type TransferDomain,
  type TransferTip
} from './transfer';

export type InsightKind =
  | 'session_accuracy'
  | 'session_rt'
  | 'session_tradeoff'
  | 'session_difficulty'
  | 'session_mix'
  | 'session_complete'
  | 'session_incomplete'
  | 'week_completion'
  | 'week_mix'
  | 'week_accuracy'
  | 'week_rt'
  | 'week_balance'
  | 'warming_up';

export type InsightConfidence = 'low' | 'medium' | 'high';

export interface TransferInsight {
  kind: InsightKind;
  title: string;
  body: string;
  action: string;
  domain: TransferDomain | null;
  confidence: InsightConfidence;
  signal: 'accuracy' | 'rt' | 'difficulty' | 'mix' | 'completion' | 'none';
  priority: number;
}

export interface FocusOfTheWeek {
  domain: TransferDomain;
  title: string;
  reason: string;
  action: string;
  tip: TransferTip;
}

export interface TransferSurface {
  insight: TransferInsight;
  tip: TransferTip | null;
  focus: FocusOfTheWeek | null;
}

export interface InsightInput {
  sessions: Session[];
  daySummaries: DaySummary[];
  domains: DomainIndex[];
  now?: Date;
  domainByExercise?: Record<string, string>;
  prefer?: 'session' | 'week';
}

const ACC_LOW = 0.72;
const ACC_HIGH = 0.9;
const RT_SLOW_RATIO = 1.2;
const RT_FAST_RATIO = 0.85;
const ACC_DIP = 0.08;
const DOMAIN_GAP = 50;
const MIN_WEEK_SESSIONS_FOR_FOCUS = 2;

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function daysAgoKey(now: Date, days: number): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function inLastDays(iso: string, now: Date, days: number): boolean {
  const key = dayKey(iso);
  const from = daysAgoKey(now, days);
  const to = now.toISOString().slice(0, 10);
  return key >= from && key <= to;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function itemStats(items: SessionItem[]): { avgAcc: number; avgRt: number; n: number } {
  const acc = items.map((i) => i.accuracy).filter((v) => Number.isFinite(v));
  const rt = items.map((i) => i.avgRtMs).filter((v) => Number.isFinite(v) && v > 0);
  return {
    avgAcc: acc.length ? mean(acc) : 0,
    avgRt: rt.length ? mean(rt) : 0,
    n: items.length
  };
}

function sessionItems(sessions: Session[]): SessionItem[] {
  return sessions.flatMap((s) => s.items || []);
}

function pct(accuracy: number): number {
  return Math.round(Math.max(0, Math.min(1, accuracy)) * 100);
}

function rtLabel(ms: number): string {
  return `${Math.round(ms)} мс`;
}

function domainLoad(summaries: DaySummary[]): Record<string, number> {
  const load: Record<string, number> = {};
  for (const d of summaries) {
    for (const [k, v] of Object.entries(d.domainDeltas || {})) {
      if (!isTransferDomain(k)) continue;
      load[k] = (load[k] || 0) + Math.abs(v);
    }
  }
  return load;
}

function sessionDomainCounts(
  session: Session,
  map?: Record<string, string>
): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!map) return counts;
  for (const item of session.items || []) {
    const domain = map[item.exerciseId];
    if (!domain || !isTransferDomain(domain)) continue;
    counts[domain] = (counts[domain] || 0) + 1;
  }
  return counts;
}

function dominantDomain(counts: Record<string, number>): TransferDomain | null {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  return entries[0][0] as TransferDomain;
}

function warmingUp(): TransferInsight {
  return {
    kind: 'warming_up',
    title: 'Пока рано судить',
    body: 'Fokus смотрит на точность, время ответа, сложность и набор областей. После нескольких сессий появятся конкретные наблюдения.',
    action: 'Пройдите ещё 2–3 ритуала — без ожидания «прокачки мозга».',
    domain: null,
    confidence: 'low',
    signal: 'none',
    priority: 10
  };
}

export function generateSessionInsight(
  session: Session | undefined,
  recent: Session[] = [],
  domainByExercise?: Record<string, string>
): TransferInsight {
  if (!session || !session.items || session.items.length === 0) {
    return warmingUp();
  }

  const stats = itemStats(session.items);
  const candidates: TransferInsight[] = [];
  const mix = sessionDomainCounts(session, domainByExercise);
  const mixDomain = dominantDomain(mix);
  const recentItems = sessionItems(recent.filter((s) => s.id !== session.id));
  const baseline = recentItems.length >= 4 ? itemStats(recentItems) : null;
  const completed = !!session.finishedAt;

  if (!completed) {
    candidates.push({
      kind: 'session_incomplete',
      title: 'Сессия оборвалась',
      body: 'Незавершённый блок не ломает прогресс. Важнее вернуться, чем навёрстывать сейчас.',
      action: 'Завтра достаточно короткого ритуала.',
      domain: mixDomain,
      confidence: 'high',
      signal: 'completion',
      priority: 90
    });
  }

  if (baseline && baseline.avgRt > 0 && stats.avgRt > 0) {
    const faster = stats.avgRt <= baseline.avgRt * RT_FAST_RATIO;
    const lessAccurate = stats.avgAcc <= baseline.avgAcc - ACC_DIP;
    if (faster && lessAccurate) {
      candidates.push({
        kind: 'session_tradeoff',
        title: 'Спешка съела точность',
        body: 'Ответы стали быстрее, ошибки — чаще. В жизни это как отправить письмо, не дочитав.',
        action: 'Одна пауза перед ответом вернёт точность быстрее, чем ещё одна сессия.',
        domain: mixDomain,
        confidence: baseline.n >= 8 ? 'high' : 'medium',
        signal: 'accuracy',
        priority: 85
      });
    }
  }

  if (stats.n >= 1 && stats.avgAcc > 0 && stats.avgAcc < ACC_LOW) {
    candidates.push({
      kind: 'session_accuracy',
      title: 'Точность сегодня ниже',
      body: `Средняя точность ${pct(stats.avgAcc)}%. В быту это похоже на день, когда перечитываете сообщение дважды — сигнал нагрузки, не «сломанного» навыка.`,
      action: 'Завтра не ускоряйтесь: сначала точность, потом темп.',
      domain: mixDomain,
      confidence: stats.n >= 3 ? 'high' : 'medium',
      signal: 'accuracy',
      priority: 80
    });
  }

  const heldDifficulty = session.items.some((item) => {
    const before = item.difficultyBefore;
    const after = item.difficultyAfter;
    if (before == null || after == null) return false;
    return after >= before + 0.2 && item.accuracy >= 0.8;
  });
  if (heldDifficulty) {
    candidates.push({
      kind: 'session_difficulty',
      title: 'Сложность выросла — точность на месте',
      body: 'Fokus поднял сложность, а доля верных ответов удержалась. Это рабочий шаг, не скачок способностей.',
      action: 'Продолжайте в том же ритме. Резко добавлять минуты не нужно.',
      domain: mixDomain,
      confidence: 'medium',
      signal: 'difficulty',
      priority: 75
    });
  }

  if (baseline && baseline.avgRt > 0 && stats.avgRt >= baseline.avgRt * RT_SLOW_RATIO) {
    candidates.push({
      kind: 'session_rt',
      title: 'Реакция сегодня медленнее',
      body: `Средний ответ ${rtLabel(stats.avgRt)} — медленнее обычных ${rtLabel(baseline.avgRt)}. Так бывает при усталости или спешке вокруг.`,
      action: 'Не догоняйте скорость сегодня. Короткий блок внимания завтра полезнее.',
      domain: mixDomain,
      confidence: baseline.n >= 8 ? 'high' : 'medium',
      signal: 'rt',
      priority: 70
    });
  }

  const mixValues = Object.values(mix);
  const mixTotal = mixValues.reduce((s, v) => s + v, 0);
  const maxMix = mixValues.length ? Math.max(...mixValues) : 0;
  if (mixDomain && mixTotal >= 2 && maxMix / mixTotal >= 0.75) {
    const label = getTransferEntry(mixDomain)?.label || mixDomain;
    candidates.push({
      kind: 'session_mix',
      title: 'Сессия была узкой',
      body: `Почти всё время ушло в «${label}». Навыки в жизни не живут по отдельности.`,
      action: 'Завтра Fokus подмешает другую область.',
      domain: mixDomain,
      confidence: 'medium',
      signal: 'mix',
      priority: 65
    });
  }

  if (stats.avgAcc >= ACC_HIGH && stats.n >= 2) {
    candidates.push({
      kind: 'session_accuracy',
      title: 'Точность держится',
      body: `${pct(stats.avgAcc)}% без гонки за рекордом. Устойчивость важнее пика.`,
      action: 'Можно чуть поднять сложность — если не в ущерб точности.',
      domain: mixDomain,
      confidence: 'medium',
      signal: 'accuracy',
      priority: 55
    });
  }

  if (completed) {
    candidates.push({
      kind: 'session_complete',
      title: 'Сессия собрана',
      body: `Точность ${pct(stats.avgAcc)}%, среднее время ответа ${rtLabel(stats.avgRt || 0)}. Fokus фиксирует форму, не выставляет диагноз.`,
      action: 'Завтра тот же ритуал. Длину увеличивать не обязательно.',
      domain: mixDomain,
      confidence: stats.n >= 2 ? 'medium' : 'low',
      signal: 'completion',
      priority: 40
    });
  }

  if (candidates.length === 0) return warmingUp();
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

export function generateWeekInsight(
  sessions: Session[],
  daySummaries: DaySummary[],
  domains: DomainIndex[],
  now = new Date()
): TransferInsight {
  const weekSessions = sessions.filter((s) => inLastDays(s.startedAt, now, 7));
  const weekDays = daySummaries.filter((d) => inLastDays(d.date, now, 7));
  const priorSessions = sessions.filter((s) => {
    const key = dayKey(s.startedAt);
    return key < daysAgoKey(now, 7) && key >= daysAgoKey(now, 21);
  });

  const activeDates = new Set<string>();
  weekSessions.forEach((s) => {
    if (s.items && s.items.length > 0) activeDates.add(dayKey(s.startedAt));
  });
  weekDays.forEach((d) => {
    if (!d.skipped && d.totalScore > 0) activeDates.add(dayKey(d.date));
  });
  const activeCount = activeDates.size;

  if (weekSessions.length === 0 && activeCount === 0) {
    return warmingUp();
  }

  const items = sessionItems(weekSessions);
  const stats = itemStats(items);
  const priorItems = sessionItems(priorSessions);
  const baseline = priorItems.length >= 4 ? itemStats(priorItems) : null;
  const load = domainLoad(weekDays);
  const loadEntries = Object.entries(load).sort((a, b) => b[1] - a[1]);
  const weak = weakestTransferDomain(domains);
  const strong = strongestTransferDomain(domains);
  const candidates: TransferInsight[] = [];

  if (activeCount > 0 && activeCount <= 2) {
    candidates.push({
      kind: 'week_completion',
      title: 'Неделя почти пустая',
      body: `${ruPlural(activeCount, 'день', 'дня', 'дней')} с тренировкой за 7 дней. Навык держит регулярность, не длительность.`,
      action: 'Поставьте 5 минут в привычный слот — этого достаточно, чтобы не терять ритм.',
      domain: weak,
      confidence: 'medium',
      signal: 'completion',
      priority: 82
    });
  }

  if (loadEntries.length >= 2 && weak && strong && weak !== strong) {
    const topLoad = loadEntries[0][0];
    const weakLoad = load[weak] || 0;
    const topVal = loadEntries[0][1];
    if (topLoad !== weak && topVal > 0 && weakLoad * 1.6 < topVal) {
      const weakLabel = TRANSFER_MAP[weak].label;
      const strongLabel = getTransferEntry(topLoad)?.label || topLoad;
      const situation = buildTransferTip(weak, startOfWeekKey(now));
      candidates.push({
        kind: 'week_mix',
        title: 'Неделя перекошена',
        body: `Больше всего ушло в «${strongLabel}», меньше — в «${weakLabel}». ${weakLabel} ближе к задаче: ${situation?.situation || 'повседневной мелочи, где легко сбиться'}.`,
        action: `На этой неделе Fokus чуть сместит набор в сторону «${weakLabel}».`,
        domain: weak,
        confidence: 'medium',
        signal: 'mix',
        priority: 80
      });
    }
  }

  if (baseline && stats.n >= 3 && stats.avgAcc > 0 && stats.avgAcc <= baseline.avgAcc - ACC_DIP) {
    candidates.push({
      kind: 'week_accuracy',
      title: 'Точность на неделе ниже',
      body: `Средняя точность ${pct(stats.avgAcc)}% — ниже недавней. Часто это сон, темп или спешка, а не откат навыка.`,
      action: 'Снизьте темп на пару сессий. Не удлиняйте тренировку.',
      domain: weak,
      confidence: baseline.n >= 8 ? 'high' : 'medium',
      signal: 'accuracy',
      priority: 78
    });
  }

  if (baseline && baseline.avgRt > 0 && stats.avgRt >= baseline.avgRt * RT_SLOW_RATIO && stats.n >= 3) {
    candidates.push({
      kind: 'week_rt',
      title: 'Ответы на неделе медленнее',
      body: `Среднее время ${rtLabel(stats.avgRt)}. Скорость плавает день ото дня — это форма, не «потеря реакции».`,
      action: 'Держите короткие сессии. Гнаться за миллисекундами не нужно.',
      domain: weak,
      confidence: 'medium',
      signal: 'rt',
      priority: 70
    });
  }

  if (activeCount >= 5) {
    candidates.push({
      kind: 'week_completion',
      title: 'Ритуал держится',
      body: `${activeCount} дней из 7. Это уже привычка, а не марафон.`,
      action: 'Не добавляйте сессии «за компанию». Завтрашний ритуал важнее сегодняшнего бонуса.',
      domain: weak,
      confidence: 'high',
      signal: 'completion',
      priority: 68
    });
  }

  if (loadEntries.length >= 2) {
    const vals = loadEntries.map(([, v]) => v);
    const max = Math.max(...vals);
    const min = Math.min(...vals);
    if (max > 0 && min * 1.35 >= max) {
      candidates.push({
        kind: 'week_balance',
        title: 'Области распределились ровно',
        body: 'За неделю нет явного перекоса. Так и задумано: поддерживаем форму, а не качаем одну черту.',
        action: 'Продолжайте ритуал. Фокус недели не обязателен, когда профиль ровный.',
        domain: null,
        confidence: 'medium',
        signal: 'mix',
        priority: 50
      });
    }
  }

  if (candidates.length === 0 && weekSessions.length > 0) {
    candidates.push({
      kind: 'week_completion',
      title: 'Неделя в работе',
      body: `${ruPlural(weekSessions.length, 'сессия', 'сессии', 'сессий')} за 7 дней. Fokus фиксирует точность и темп, не выставляет оценку личности.`,
      action: 'Держите тот же слот. Длину сессии увеличивать не обязательно.',
      domain: weak,
      confidence: 'low',
      signal: 'completion',
      priority: 35
    });
  }

  if (candidates.length === 0) return warmingUp();
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}

export function suggestFocusOfTheWeek(
  domains: DomainIndex[],
  daySummaries: DaySummary[] = [],
  sessions: Session[] = [],
  now = new Date()
): FocusOfTheWeek | null {
  const ready = domains
    .filter((d) => isTransferDomain(d.domain) && d.value > 0)
    .sort((a, b) => a.value - b.value);
  if (ready.length < 2) return null;

  const weekSessions = sessions.filter((s) => inLastDays(s.startedAt, now, 7));
  const weekDays = daySummaries.filter((d) => inLastDays(d.date, now, 7) && !d.skipped && d.totalScore > 0);
  if (weekSessions.length < MIN_WEEK_SESSIONS_FOR_FOCUS && weekDays.length < MIN_WEEK_SESSIONS_FOR_FOCUS) {
    return null;
  }

  const strongest = ready[ready.length - 1];
  const gap = strongest.value - ready[0].value;
  if (gap < DOMAIN_GAP) return null;

  const load = domainLoad(weekDays);
  const loadVals = Object.values(load);
  const median =
    loadVals.length === 0
      ? 0
      : [...loadVals].sort((a, b) => a - b)[Math.floor(loadVals.length / 2)];

  const neglected = ready.filter((d) => (load[d.domain] || 0) <= median);
  const pick = (neglected[0] || ready[0]).domain as TransferDomain;
  const entry = TRANSFER_MAP[pick];
  const salt = startOfWeekKey(now);
  const tip = buildTransferTip(pick, salt);
  if (!tip) return null;

  return {
    domain: pick,
    title: `Фокус недели — ${entry.label}`,
    reason: `«${entry.label}» пока слабее остальных. В быту это ближе к: ${tip.situation}.`,
    action: 'Сессии этой недели чуть сместятся сюда. Это не курс лечения и не обещание быстрого скачка.',
    tip
  };
}

export function buildTransferSurface(input: InsightInput): TransferSurface {
  const now = input.now || new Date();
  const sessions = input.sessions || [];
  const focus = suggestFocusOfTheWeek(input.domains || [], input.daySummaries || [], sessions, now);

  const sorted = [...sessions].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  const last = sorted[0];
  const recent = sorted.slice(0, 8);

  let insight: TransferInsight;
  if (input.prefer === 'week') {
    insight = generateWeekInsight(sessions, input.daySummaries || [], input.domains || [], now);
    if (insight.kind === 'warming_up' && last) {
      insight = generateSessionInsight(last, recent, input.domainByExercise);
    }
  } else {
    insight = generateSessionInsight(last, recent, input.domainByExercise);
    if (insight.kind === 'warming_up') {
      insight = generateWeekInsight(sessions, input.daySummaries || [], input.domains || [], now);
    }
  }

  const salt = startOfWeekKey(now);
  const tipDomain =
    focus?.domain ||
    insight.domain ||
    weakestTransferDomain(input.domains || []) ||
    rotatingTipDomain(now);
  const tip = buildTransferTip(tipDomain, salt);

  return { insight, tip, focus };
}

export function collectGeneratedCopy(surface: TransferSurface): string[] {
  const bits = [
    surface.insight.title,
    surface.insight.body,
    surface.insight.action
  ];
  if (surface.tip) {
    bits.push(surface.tip.situation, surface.tip.practiceLink, surface.tip.label);
  }
  if (surface.focus) {
    bits.push(surface.focus.title, surface.focus.reason, surface.focus.action);
  }
  return bits;
}
