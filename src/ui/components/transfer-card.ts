import { storage } from '../../core/storage';
import { registry } from '../../exercises/manifest-registry';
import { TRANSFER_MAP, TRANSFER_DOMAINS } from '../../core/transfer';
import {
  buildTransferSurface,
  type TransferSurface
} from '../../core/transfer-insights';
import { L, getLocale } from '../../core/i18n';
import { domainLabel } from '../../core/labels';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function exerciseDomainMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of registry) {
    map[entry.manifest.id] = entry.manifest.domain;
  }
  return map;
}

function confidenceLabel(level: TransferSurface['insight']['confidence']): string {
  // Methodology v2: describes how much in-app data backs the note, never certainty about life outside the app.
  if (getLocale() === 'en') {
    if (level === 'high') return 'sufficient data';
    if (level === 'medium') return 'partial data';
    return 'sparse data';
  }
  if (level === 'high') return 'данных достаточно';
  if (level === 'medium') return 'данных частично';
  return 'данных мало';
}

export function renderTransferCard(
  surface: TransferSurface,
  opts?: { variant?: 'default' | 'guide' }
): string {
  const isEn = getLocale() === 'en';
  const variant = opts?.variant || 'default';
  const insight = surface.insight;
  const tip = surface.tip;
  const focus = surface.focus;

  const tipHtml = tip
    ? `<div class="transfer-tip">
        <div class="transfer-tip-kicker">${L('Где это встречается', 'Where this appears')}</div>
        <p class="transfer-tip-situation">${isEn ? 'Daily situations requiring focus and memory' : esc(tip.situation)}</p>
        <p class="transfer-tip-link">${isEn ? 'Regular practice helps maintain everyday sharpness.' : esc(tip.practiceLink)}</p>
      </div>`
    : '';

  if (variant === 'guide') {
    const list = TRANSFER_DOMAINS.map((id) => {
      const entry = TRANSFER_MAP[id];
      const example = entry.situations[0];
      const label = domainLabel(id);
      const sit = isEn ? 'Everyday tasks in this domain' : esc(example.situation);
      const notClaimed = isEn ? 'Does not promise supernatural memory or IQ jumps.' : esc(entry.notClaimed);
      return `<li>
        <strong>${esc(label)}</strong> — ${sit}.
        <span class="transfer-not">${notClaimed}</span>
      </li>`;
    }).join('');

    const focusHtml = focus
      ? `<div class="transfer-focus" role="status">
          <div class="transfer-kicker">${L('Фокус недели', 'Weekly focus')}</div>
          <p>${isEn ? `Focusing on ${domainLabel(focus.domain)} to keep training balanced.` : esc(focus.reason)}</p>
        </div>`
      : `<p class="transfer-muted">${L('Фокус недели появится, когда Fokus увидит устойчивый перекос между областями. Если профиль ровный — смещать набор не нужно.', 'Weekly focus appears when a lasting imbalance between domains is detected.')}</p>`;

    return `
      <section class="transfer-card transfer-card--guide" aria-labelledby="transfer-guide-title">
        <div class="transfer-kicker">${L('Честный перенос', 'Honest transfer')}</div>
        <h3 id="transfer-guide-title">${L('Что тренируем — и чего не обещаем', 'What we train — and what we don’t promise')}</h3>
        <p class="transfer-body">${L('Упражнения Fokus — конкретные задачи на экране. Перенос в быт скромный и ситуативный. Это не оценка интеллекта, не курс «прокачки мозга» и не лечение.', 'Fokus exercises are specific on-screen tasks. Everyday transfer is modest and situational. Not an IQ test or miracle cure.')}</p>
        <ul class="transfer-list">${list}</ul>
        ${focusHtml}
        ${tipHtml}
      </section>
    `;
  }

  const focusLine = focus
    ? `<p class="transfer-focus-line">${isEn ? `Weekly focus: ${domainLabel(focus.domain)}. Practice with regular short sessions.` : `${esc(focus.title)}. ${esc(focus.action)}`}</p>`
    : '';

  const insightTitle = isEn
    ? (insight.kind === 'warming_up' ? 'Too early to judge' : insight.kind === 'week_completion' ? 'Light week' : insight.kind === 'week_mix' ? 'Unbalanced week' : 'Weekly insight')
    : esc(insight.title);

  const insightBody = isEn
    ? (insight.kind === 'warming_up'
        ? 'Fokus tracks accuracy, response time, difficulty, and domain coverage. Specific observations appear after several sessions.'
        : insight.kind === 'week_completion'
          ? 'Regularity maintains skills better than session duration alone.'
          : insight.kind === 'week_mix'
            ? 'Training load shifted between domains. A balanced mix keeps all areas engaged.'
            : 'Consistent short sessions help maintain cognitive sharpness over time.')
    : esc(insight.body);

  const insightAction = isEn
    ? (insight.kind === 'warming_up'
        ? 'Complete 2–3 more sessions — without expecting miracle claims.'
        : insight.kind === 'week_completion'
          ? 'Set aside 5 minutes in your regular slot to keep the rhythm.'
          : 'Continue at your comfortable pace.')
    : esc(insight.action);

  return `
    <section class="transfer-card" aria-labelledby="transfer-card-title" data-insight-kind="${esc(insight.kind)}">
      <div class="transfer-kicker">${L('Где похожая задача встречается', 'Where a similar task appears')} · ${esc(confidenceLabel(insight.confidence))}</div>
      <h3 id="transfer-card-title">${insightTitle}</h3>
      <p class="transfer-body">${insightBody}</p>
      <p class="transfer-action">${insightAction}</p>
      ${focusLine}
      ${tipHtml}
    </section>
  `;
}

export function transferCardFromStorage(opts: { prefer: 'session' | 'week' | 'guide' }): string {
  const surface = buildTransferSurface({
    sessions: storage.getSessions(),
    daySummaries: storage.getDaySummaries(28),
    domains: storage.getDomains(),
    domainByExercise: exerciseDomainMap(),
    prefer: opts.prefer === 'guide' ? 'week' : opts.prefer
  });
  return renderTransferCard(surface, { variant: opts.prefer === 'guide' ? 'guide' : 'default' });
}
