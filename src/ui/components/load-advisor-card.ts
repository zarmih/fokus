import {
  advisorConfidenceLabel,
  loadBandLabel,
  type RetentionAdvice
} from '../../core/retention-advisor';

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch
  ));
}

/** Dumb HTML for the G23 tomorrow-load card. Empty string if the core stayed quiet. */
export function renderLoadAdvisorCard(advice: RetentionAdvice): string {
  if (!advice.ready) return '';
  const { copy, focuses, band, confidence } = advice;
  const focusHtml = focuses.length
    ? `<ul class="load-advisor-focus">
        ${focuses
          .map(
            (f) =>
              `<li data-domain="${esc(f.domainId)}" data-source="${esc(f.source)}"><strong>${esc(f.label)}</strong> — ${esc(f.reason)}</li>`
          )
          .join('')}
      </ul>`
    : '';

  const aria = `Нагрузка на завтра: ${loadBandLabel(band)}. ${copy.body}`;

  return `
    <section
      class="load-advisor band-${esc(band)}"
      data-load-advisor="1"
      data-load-band="${esc(band)}"
      data-copy-situation="${esc(copy.situation)}"
      role="region"
      aria-labelledby="load-advisor-title"
      aria-label="${esc(aria)}"
    >
      <p class="intel-kicker" id="load-advisor-title">Коуч · завтра</p>
      <h3 class="load-advisor-primary">${esc(copy.title)}</h3>
      <p class="load-advisor-body">${esc(copy.body)}</p>
      ${focusHtml}
      <p class="load-advisor-meta">${esc(advisorConfidenceLabel(confidence))} · не балл способностей и не сравнение с другими</p>
    </section>
  `;
}
