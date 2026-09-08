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
