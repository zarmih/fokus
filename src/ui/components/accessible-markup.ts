/** Small accessible markup builders shared by startup/error, Today quests and Program screens. */

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Startup / navigation error screen. `role="alert"` so it is announced, and the
 * theme danger token (dark #F291AB ≈ 8.4:1 on bg, light #B83E63 ≈ 4.9:1 on bg)
 * instead of hardcoded #f44336 (3.4:1 on the light background). The fallback
 * covers the case where the stylesheet itself failed to load (default white bg, 5.4:1).
 */
export function errorScreenHtml(title: string, message: string): string {
  return `<div class="startup-error" role="alert" style="padding: 20px; color: var(--danger, #B83E63); text-align: center;">
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
  </div>`;
}

export function questProgressValueText(progress: number, target: number): string {
  return `${progress} из ${target}`;
}

/** Named progressbar for a quest: aria-label carries the quest title, aria-valuetext reads in Russian. */
export function questProgressBarHtml(q: { title: string; progress: number; target: number }, pct: number): string {
  const label = escapeHtml(`Прогресс задания: ${q.title}`);
  const valueText = escapeHtml(questProgressValueText(q.progress, q.target));
  return `<div class="scale-track quest-track" style="height: 6px; border-radius: 3px; background: var(--track); overflow: hidden;" role="progressbar" aria-label="${label}" aria-valuenow="${q.progress}" aria-valuemin="0" aria-valuemax="${q.target}" aria-valuetext="${valueText}"><div class="scale-fill ritual-fill" style="--fill: ${pct}%; height: 100%; width: ${pct}%; background: var(--accent); transition: width 0.3s ease;"></div></div>`;
}

/** Program header trend chip: a labelled image-like badge, theme text colour (works on dark and light). */
export function programTrendChipHtml(chip: { label: string; aria: string }): string {
  return `<div class="trend-chip" role="img" aria-label="${escapeHtml(chip.aria)}" style="background: var(--surface-2); border-radius: 12px; padding: 4px 10px; font-size: 12px; font-weight: 500; color: var(--text);">${chip.label}</div>`;
}
