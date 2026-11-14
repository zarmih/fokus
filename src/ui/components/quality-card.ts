import type { RecoverySnapshot } from '../../core/recovery';
import { loadLabel, recoveryConfidenceLabel } from '../../core/recovery';
import { QUALITY_WEIGHTS, qualityBand, qualityComponentLabel, type QualityComponent } from '../../core/sessionQuality';
import { L } from '../../core/i18n';

function sparkline(values: number[], w = 132, h = 36): string {
  if (values.length < 2) return '';
  const min = Math.min(0, ...values);
  const max = Math.max(100, ...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = values[values.length - 1];
  const lastX = w;
  const lastY = h - ((last - min) / range) * (h - 6) - 3;
  return `
    <svg class="quality-spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-hidden="true" focusable="false">
      <polyline fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" points="${pts}" />
      <circle cx="${lastX}" cy="${lastY.toFixed(1)}" r="3" fill="currentColor" />
    </svg>
  `;
}

export function renderQualityCard(snapshot: RecoverySnapshot, opts?: { detailed?: boolean }): string {
  const last = snapshot.lastQuality;
  if (!last && snapshot.qualities.length === 0) {
    if (!opts?.detailed) return '';
    return `
      <section class="quality-card tone-steady" role="region" aria-label="${L('Качество ритуала. Накапливаем данные.', 'Ritual quality. Gathering data.')}">
        <div class="quality-kicker">${L('Качество ритуала', 'Ritual quality')}</div>
        <p class="quality-hint">${L('Здесь будет оценка фокуса и чистоты прохождения. Фокус начнёт собирать её после вашей первой полной сессии.', 'Focus and execution quality will appear here after your first complete session.')}</p>
      </section>
    `;
  }

  const points = snapshot.qualities.map((q) => q.quality.score);
  const score = last ? last.score : 0;
  const delta = snapshot.qualityDelta;
  const deltaText =
    delta === null
      ? L('первая оценка', 'first score')
      : delta > 0
        ? L(`+${Math.round(delta)} к прошлой`, `+${Math.round(delta)} vs previous`)
        : delta < 0
          ? L(`${Math.round(delta)} к прошлой`, `${Math.round(delta)} vs previous`)
          : L('как в прошлый раз', 'same as last time');
  const tone = snapshot.recommendation;
  const aria = last
    ? L(`Качество последнего ритуала ${score} из 100, ${qualityBand(score)}. ${snapshot.hint.body}`, `Last ritual quality: ${score} of 100, ${qualityBand(score)}. ${snapshot.hint.body}`)
    : snapshot.hint.body;

  const breakdown = opts?.detailed && last
    ? `<ol class="quality-breakdown">
        ${(Object.keys(QUALITY_WEIGHTS) as QualityComponent[]).map((key) => {
          const value = last.breakdown[key];
          const w = Math.round(QUALITY_WEIGHTS[key] * 100);
          return `<li>
            <div class="quality-break-row">
              <span>${qualityComponentLabel(key)}</span>
              <span>${value}</span>
            </div>
            <div class="scale-track quality-track" aria-hidden="true">
              <div class="scale-fill" style="width:${value}%"></div>
            </div>
            <div class="quality-weight">${L(`вес ${w}%`, `weight ${w}%`)}</div>
          </li>`;
        }).join('')}
      </ol>
      <p class="quality-note">${L('Это оценка того, как прошёл ритуал, а не способностей и не «балла мозга».', 'This is an evaluation of the session flow, not ability or "brain score".')}</p>`
    : '';

  const loadLine = snapshot.qualities.length
    ? `<div class="quality-load">${L(`Нагрузка ${loadLabel(snapshot.loadEwma)} · ${recoveryConfidenceLabel(snapshot.confidence)}`, `Load: ${loadLabel(snapshot.loadEwma)} · ${recoveryConfidenceLabel(snapshot.confidence)}`)}</div>`
    : '';

  return `
    <section class="quality-card tone-${tone}" role="region" aria-label="${aria}">
      <div class="quality-head">
        <div>
          <div class="quality-kicker">${L('Качество ритуала', 'Ritual quality')}</div>
          <div class="quality-value">${last ? score : '—'}</div>
          <div class="quality-meta">${last ? `${qualityBand(score)} · ${deltaText}` : L('появится после сессии', 'appears after session')}</div>
        </div>
        ${sparkline(points)}
      </div>
      ${loadLine}
      <p class="quality-hint"><strong>${snapshot.hint.title}.</strong> ${snapshot.hint.body}</p>
      ${breakdown}
    </section>
  `;
}
