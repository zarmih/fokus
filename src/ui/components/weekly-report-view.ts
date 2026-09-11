import { t, type Locale } from '../../core/i18n';
import {
  domainName,
  type WeeklyReport,
  type CalendarDayState
} from '../../core/weekly-report';

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function calLabel(state: CalendarDayState, locale: Locale): string {
  if (state === 'played') return t('weekly.cal_played', undefined, locale);
  if (state === 'forgiven') return t('weekly.cal_forgiven', undefined, locale);
  return t('weekly.cal_missed', undefined, locale);
}

export function renderWeekNarrative(report: WeeklyReport): string {
  const loc = report.locale;
  const paras = report.narrative.paragraphs.map((p) => `<p class="week-nar-p">${esc(p)}</p>`).join('');
  return `
    <section class="week-narrative surface" data-voice="${esc(report.narrative.voice)}" aria-labelledby="week-nar-title">
      <div class="week-kicker">${esc(t('weekly.narrative_kicker', undefined, loc))}</div>
      <h3 id="week-nar-title">${esc(report.narrative.headline)}</h3>
      ${paras}
    </section>
  `;
}

export function renderWeekDomains(report: WeeklyReport): string {
  const loc = report.locale;
  const cells = report.domains
    .map((d) => {
      const name = domainName(d.id, loc);
      const mark = d.trained ? t('weekly.trained', undefined, loc) : t('weekly.quiet', undefined, loc);
      const blocks = d.blocks > 0 ? String(d.blocks) : '—';
      return `<div class="week-domain${d.trained ? ' trained' : ' quiet'}" data-domain="${esc(d.id)}">
        <span class="week-domain-name">${esc(name)}</span>
        <span class="week-domain-n">${esc(blocks)}</span>
        <span class="week-domain-mark">${esc(mark)}</span>
      </div>`;
    })
    .join('');

  return `
    <section class="week-domains surface" data-mix="${esc(report.mix)}" aria-labelledby="week-dom-title">
      <div class="week-kicker">${esc(t('weekly.domains_kicker', undefined, loc))}</div>
      <h3 id="week-dom-title">${esc(t('weekly.domains_title', undefined, loc))}</h3>
      <div class="week-domain-grid">${cells}</div>
    </section>
  `;
}

export function renderWeekStreak(report: WeeklyReport): string {
  const loc = report.locale;
  const dots = report.streak.calendar
    .map((day) => {
      const label = `${day.date}: ${calLabel(day.state, loc)}`;
      return `<div class="week-cal-day ${day.state}" data-date="${esc(day.date)}" data-state="${esc(day.state)}" title="${esc(label)}" aria-label="${esc(label)}"></div>`;
    })
    .join('');

  return `
    <section class="week-streak surface" data-honesty="${esc(report.streak.kind)}" aria-labelledby="week-streak-title">
      <div class="week-kicker">${esc(t('weekly.streak_kicker', undefined, loc))}</div>
      <h3 id="week-streak-title">${esc(t('weekly.streak_kicker', undefined, loc))}</h3>
      <p class="week-streak-note">${esc(report.streak.note)}</p>
      <div class="week-cal" role="img" aria-label="${esc(t('weekly.a11y_calendar', undefined, loc))}">${dots}</div>
    </section>
  `;
}

export function renderWeekShare(report: WeeklyReport): string {
  const loc = report.locale;
  const rows = report.share.lines
    .map(
      (row) => `<div class="week-share-row">
        <span class="week-share-label">${esc(row.label)}</span>
        <span class="week-share-value">${esc(row.value)}</span>
      </div>`
    )
    .join('');

  return `
    <section class="week-share surface" aria-labelledby="week-share-title">
      <div class="week-kicker">${esc(t('weekly.share_kicker', undefined, loc))}</div>
      <h3 id="week-share-title">${esc(t('weekly.share_title', undefined, loc))}</h3>
      <div class="week-share-preview" aria-hidden="true">
        <div class="week-share-brand">Fokus</div>
        <div class="week-share-period">${esc(report.share.period)}</div>
        <div class="week-share-headline">${esc(report.share.headline)}</div>
        ${rows}
        <div class="week-share-foot">${esc(report.share.footer)}</div>
      </div>
      <p class="week-share-note">${esc(t('weekly.share_local_note', undefined, loc))}</p>
      <button type="button" class="btn-primary" id="btn-week-share" aria-label="${esc(t('weekly.a11y_share', undefined, loc))}">${esc(t('weekly.share_download', undefined, loc))}</button>
    </section>
  `;
}

export function renderWeeklyG18(report: WeeklyReport): { head: string; share: string } {
  const head = `${renderWeekNarrative(report)}${renderWeekDomains(report)}${renderWeekStreak(report)}`;
  const share = report.empty ? '' : renderWeekShare(report);
  return { head, share };
}
