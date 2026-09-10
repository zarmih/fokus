import { DOMAIN_COLORS, domainLabel } from '../../core/labels';
import type { DomainSlice } from '../../core/fokus-index';

export function renderRadarChart(slices: DomainSlice[], opts?: { size?: number; max?: number }): string {
  const size = opts?.size ?? 280;
  const max = opts?.max ?? 1200;
  const pad = 36;
  const view = size + pad * 2;
  const cx = view / 2;
  const cy = view / 2;
  const radius = size * 0.32;
  const n = slices.length || 5;
  const toPoint = (i: number, r: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const rings = [0.33, 0.66, 1].map((t) => {
    const pts = slices.map((_, i) => toPoint(i, radius * t).join(',')).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="var(--line)" stroke-width="1" opacity="0.7"/>`;
  }).join('');

  const axes = slices.map((_, i) => {
    const [x, y] = toPoint(i, radius);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
  }).join('');

  const valuePts = slices.map((s, i) => {
    const t = s.ready ? Math.max(0.08, Math.min(1, s.value / max)) : 0.08;
    return toPoint(i, radius * t).join(',');
  }).join(' ');

  const dots = slices.map((s, i) => {
    const t = s.ready ? Math.max(0.08, Math.min(1, s.value / max)) : 0.08;
    const [x, y] = toPoint(i, radius * t);
    const color = DOMAIN_COLORS[s.id] || 'var(--accent)';
    return `<circle cx="${x}" cy="${y}" r="4" fill="${s.ready ? color : 'var(--muted)'}" />`;
  }).join('');

  const labels = slices.map((s, i) => {
    const [x, y] = toPoint(i, radius + 26);
    const anchor = x < cx - 8 ? 'end' : x > cx + 8 ? 'start' : 'middle';
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" fill="var(--muted)" font-size="11" font-weight="600">${domainLabel(s.id)}</text>`;
  }).join('');

  return `
    <svg class="radar-svg" viewBox="0 0 ${view} ${view}" role="img" aria-label="Когнитивный профиль">
      ${rings}
      ${axes}
      <polygon points="${valuePts}" fill="var(--accent-glow)" stroke="var(--accent)" stroke-width="2"/>
      ${dots}
      ${labels}
    </svg>
  `;
}

export function renderScatterPlot(data: {x: number, y: number}[], xLabel: string, yLabel: string): string {
  if (data.length === 0) return `<div style="text-align:center;color:var(--muted);padding:20px;">Нет данных</div>`;
  
  const width = 300;
  const height = 150;
  const padX = 30;
  const padY = 20;

  const minX = Math.min(...data.map(d => d.x));
  const maxX = Math.max(...data.map(d => d.x));
  const minY = Math.min(...data.map(d => d.y));
  const maxY = Math.max(...data.map(d => d.y));

  const rangeX = (maxX - minX) || 1;
  const rangeY = (maxY - minY) || 1;

  const points = data.map(d => {
    const cx = padX + ((d.x - minX) / rangeX) * (width - padX * 2);
    const cy = height - padY - ((d.y - minY) / rangeY) * (height - padY * 2);
    return `<circle cx="${cx}" cy="${cy}" r="4" fill="var(--accent)" opacity="0.8" />`;
  }).join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;overflow:visible;">
      <line x1="${padX}" y1="${height-padY}" x2="${width}" y2="${height-padY}" stroke="var(--line)" stroke-width="1" />
      <line x1="${padX}" y1="0" x2="${padX}" y2="${height-padY}" stroke="var(--line)" stroke-width="1" />
      ${points}
      <text x="${width/2}" y="${height}" text-anchor="middle" fill="var(--muted)" font-size="10">${xLabel}</text>
      <text x="10" y="${height/2}" text-anchor="middle" transform="rotate(-90 10 ${height/2})" fill="var(--muted)" font-size="10">${yLabel}</text>
    </svg>
  `;
}
