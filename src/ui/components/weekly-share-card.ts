import type { WeeklyReport } from '../../core/weekly-report';
import { formatWeeklyShareText } from '../../core/weekly-report';

export const WEEKLY_SHARE_FILENAME = 'fokus-week.png';
export const WEEKLY_SHARE_TEXT_FILENAME = 'fokus-week.txt';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y, x, y + h, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3): number {
  const words = text.split(/\s+/);
  let line = '';
  let used = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + used * lineHeight);
      used += 1;
      line = word;
      if (used >= maxLines) return used;
    } else {
      line = test;
    }
  }
  if (line && used < maxLines) {
    ctx.fillText(line, x, y + used * lineHeight);
    used += 1;
  }
  return used;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Local-only: never calls navigator.share and never POSTs. */
export function paintWeeklyShareCard(ctx: CanvasRenderingContext2D, report: WeeklyReport, size = 1080): void {
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, '#1e293b');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath();
  ctx.arc(size - 80, 90, 160, 0, Math.PI * 2);
  ctx.globalAlpha = 0.35;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 56px Inter, system-ui, sans-serif';
  ctx.fillText('Fokus', 80, 130);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 28px Inter, system-ui, sans-serif';
  ctx.fillText(report.share.period, 80, 180);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 44px Inter, system-ui, sans-serif';
  wrapText(ctx, report.share.headline, 80, 250, size - 160, 52, 3);

  report.share.lines.forEach((row, i) => {
    const col = i % 2;
    const rowi = Math.floor(i / 2);
    const x = 80 + col * 480;
    const y = 470 + rowi * 180;
    ctx.fillStyle = '#334155';
    roundRect(ctx, x, y, 440, 150, 28);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillText(row.label, x + 28, y + 48);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 36px Inter, system-ui, sans-serif';
    const value = row.value.length > 22 ? `${row.value.slice(0, 21)}…` : row.value;
    ctx.fillText(value, x + 28, y + 104);
  });

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 24px Inter, system-ui, sans-serif';
  ctx.fillText(report.share.footer, 80, 980);
  ctx.fillStyle = '#64748b';
  ctx.font = '500 22px Inter, system-ui, sans-serif';
  ctx.fillText(report.share.disclaimer, 80, 1020);
}

export async function shareWeeklyCard(report: WeeklyReport): Promise<'downloaded' | 'text'> {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
    if (ctx) {
      paintWeeklyShareCard(ctx, report);
      const blob: Blob | null = await new Promise((resolve) => {
        if (typeof canvas.toBlob === 'function') {
          canvas.toBlob((b) => resolve(b), 'image/png');
        } else {
          resolve(null);
        }
      });
      if (blob) {
        downloadBlob(blob, report.share.filename || WEEKLY_SHARE_FILENAME);
        return 'downloaded';
      }
    }
  } catch {
    /* canvas can be incomplete in tests — fall through to a local text file */
  }

  const text = formatWeeklyShareText(report);
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), WEEKLY_SHARE_TEXT_FILENAME);
  return 'text';
}
