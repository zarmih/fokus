import { ruSessions, type LongitudinalCoach } from '../../core/coach-longitudinal';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch
  ));
}

const CONF_LABEL: Record<string, string> = {
  low: 'изучаем',
  medium: 'подтверждается',
  high: 'уверенный'
};

/** Dumb HTML for the G16 longitudinal card. Empty string if the core stayed quiet. */
export function renderLongitudinalCoachCard(coach: LongitudinalCoach): string {
  if (!coach.card) return '';
  const { primary, supporting } = coach.card;
  const conf = CONF_LABEL[coach.confidence] || CONF_LABEL.low;
  const supportHtml = supporting.length
    ? `<ul class="long-coach-support">
        ${supporting.map((line) => `<li>${esc(line.body)}</li>`).join('')}
      </ul>`
    : '';

  return `
    <section
      class="long-coach"
      data-long-coach="1"
      data-confidence="${esc(coach.confidence)}"
      data-focus="${esc(coach.focus?.domainId || '')}"
      aria-labelledby="long-coach-title"
    >
      <p class="intel-kicker" id="long-coach-title">Коуч · две недели</p>
      <h3 class="long-coach-primary">${esc(primary.title)}</h3>
      <p class="long-coach-body">${esc(primary.body)}</p>
      ${supportHtml}
      <p class="long-coach-meta">${esc(conf)} · ${esc(ruSessions(coach.sessionCount))}</p>
    </section>
  `;
}
