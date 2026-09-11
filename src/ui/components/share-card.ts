import { t } from '../../core/i18n';

export async function shareSessionCard(params: {
  score: number;
  accuracy: number;
  streak: number;
  fokusIndex: number;
  focus?: string;
}): Promise<void> {
  const { score, accuracy, streak, fokusIndex, focus } = params;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    fallbackShare(params);
    return;
  }

  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, '#1e293b');
  bg.addColorStop(1, '#0f172a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(980, 100, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 56px Inter, system-ui, sans-serif';
  ctx.fillText('Fokus', 80, 140);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 32px Inter, system-ui, sans-serif';
  ctx.fillText(t('share.tagline'), 80, 190);

  ctx.fillStyle = '#f59e0b';
  ctx.font = '800 180px Inter, system-ui, sans-serif';
  ctx.fillText(String(Math.round(score)), 80, 460);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 36px Inter, system-ui, sans-serif';
  ctx.fillText(t('share.points'), 80, 520);

  const stats = [
    [t('share.accuracy'), `${accuracy}%`],
    [t('fi.kicker'), String(fokusIndex || '—')],
    [t('share.streak'), t('share.streak_n', { n: streak })]
  ];
  stats.forEach((row, i) => {
    const x = 80 + i * 320;
    ctx.fillStyle = '#334155';
    roundRect(ctx, x, 600, 280, 160, 28);
    ctx.fill();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText(row[0], x + 28, 660);
    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 48px Inter, system-ui, sans-serif';
    ctx.fillText(row[1], x + 28, 730);
  });

  ctx.fillStyle = '#64748b';
  ctx.font = '500 28px Inter, system-ui, sans-serif';
  ctx.fillText(focus ? t('share.focus', { focus }) : t('share.fallback_focus'), 80, 860);
  ctx.fillText('fokus', 80, 980);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob && navigator.share && navigator.canShare) {
    const file = new File([blob], 'fokus.png', { type: 'image/png' });
    const payload = {
      title: 'Fokus',
      text: t('share.text', { score: Math.round(score), acc: accuracy }),
      files: [file]
    };
    if (navigator.canShare(payload)) {
      await navigator.share(payload);
      return;
    }
  }

  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fokus.png';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  fallbackShare(params);
}

function fallbackShare(params: { score: number; accuracy: number }) {
  const text = t('share.text_plain', { score: Math.round(params.score), acc: params.accuracy });
  if (navigator.share) {
    navigator.share({ title: 'Fokus', text, url: window.location.origin }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
    alert(t('share.copied'));
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
