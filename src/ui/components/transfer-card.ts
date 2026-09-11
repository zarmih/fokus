import { storage } from '../../core/storage';
import { registry } from '../../exercises/registry';
import { TRANSFER_MAP, TRANSFER_DOMAINS } from '../../core/transfer';
import {
  buildTransferSurface,
  type TransferSurface
} from '../../core/transfer-insights';

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
  if (level === 'high') return 'уверенный';
  if (level === 'medium') return 'подтверждается';
  return 'изучаем';
}

export function renderTransferCard(
  surface: TransferSurface,
  opts?: { variant?: 'default' | 'guide' }
): string {
  const variant = opts?.variant || 'default';
  const insight = surface.insight;
  const tip = surface.tip;
  const focus = surface.focus;

  const tipHtml = tip
    ? `<div class="transfer-tip">
        <div class="transfer-tip-kicker">Где это встречается</div>
        <p class="transfer-tip-situation">${esc(tip.situation)}</p>
        <p class="transfer-tip-link">${esc(tip.practiceLink)}</p>
      </div>`
    : '';

  if (variant === 'guide') {
    const list = TRANSFER_DOMAINS.map((id) => {
      const entry = TRANSFER_MAP[id];
      const example = entry.situations[0];
      return `<li>
        <strong>${esc(entry.label)}</strong> — ${esc(example.situation)}.
        <span class="transfer-not">${esc(entry.notClaimed)}</span>
      </li>`;
    }).join('');

    const focusHtml = focus
      ? `<div class="transfer-focus" role="status">
          <div class="transfer-kicker">Фокус недели</div>
          <p>${esc(focus.reason)}</p>
        </div>`
      : `<p class="transfer-muted">Фокус недели появится, когда Fokus увидит устойчивый перекос между областями. Если профиль ровный — смещать набор не нужно.</p>`;

    return `
      <section class="transfer-card transfer-card--guide" aria-labelledby="transfer-guide-title">
        <div class="transfer-kicker">Честный перенос</div>
        <h3 id="transfer-guide-title">Что тренируем — и чего не обещаем</h3>
        <p class="transfer-body">Упражнения Fokus — конкретные задачи на экране. Перенос в быт скромный и ситуативный. Это не оценка интеллекта, не курс «прокачки мозга» и не лечение.</p>
        <ul class="transfer-list">${list}</ul>
        ${focusHtml}
        ${tipHtml}
      </section>
    `;
  }

  const focusLine = focus
    ? `<p class="transfer-focus-line">${esc(focus.title)}. ${esc(focus.action)}</p>`
    : '';

  return `
    <section class="transfer-card" aria-labelledby="transfer-card-title" data-insight-kind="${esc(insight.kind)}">
      <div class="transfer-kicker">Навык в жизни · ${esc(confidenceLabel(insight.confidence))}</div>
      <h3 id="transfer-card-title">${esc(insight.title)}</h3>
      <p class="transfer-body">${esc(insight.body)}</p>
      <p class="transfer-action">${esc(insight.action)}</p>
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
