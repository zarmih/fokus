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

  // «Тихий свет» dark palette (canvas cannot read CSS vars reliably; values mirror src/styles/tokens.css).
  const QL = {
    surface: '#1A1B30', bg: '#0F1020', accent: '#FFC46B', text: '#F3F1FA',
    muted: '#B4B1C8', card: '#25263D', faint: '#8A87A0'
  };
  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, QL.surface);
  bg.addColorStop(1, QL.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = QL.accent;
  ctx.beginPath();
  ctx.arc(980, 100, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = QL.text;
  ctx.font = '800 56px Inter, system-ui, sans-serif';
  ctx.fillText('Fokus', 80, 140);

  ctx.fillStyle = QL.muted;
  ctx.font = '500 32px Inter, system-ui, sans-serif';
  ctx.fillText('Тренировка внимания и памяти', 80, 190);

  ctx.fillStyle = QL.accent;
  ctx.font = '800 180px Inter, system-ui, sans-serif';
  ctx.fillText(String(Math.round(score)), 80, 460);

  ctx.fillStyle = QL.muted;
  ctx.font = '600 36px Inter, system-ui, sans-serif';
  ctx.fillText('очков за сессию', 80, 520);

  const stats = [
    ['Точность', `${accuracy}%`],
    ['Fokus Index', String(fokusIndex || '—')],
    ['Серия', `${streak} дн.`]
  ];
  stats.forEach((row, i) => {
    const x = 80 + i * 320;
    ctx.fillStyle = QL.card;
    roundRect(ctx, x, 600, 280, 160, 28);
    ctx.fill();
    ctx.fillStyle = QL.muted;
    ctx.font = '600 24px Inter, system-ui, sans-serif';
    ctx.fillText(row[0], x + 28, 660);
    ctx.fillStyle = QL.text;
    ctx.font = '800 48px Inter, system-ui, sans-serif';
    ctx.fillText(row[1], x + 28, 730);
  });

  ctx.fillStyle = QL.faint;
  ctx.font = '500 28px Inter, system-ui, sans-serif';
  ctx.fillText(focus ? `Фокус: ${focus}` : 'Короткие тренировки каждый день', 80, 860);
  ctx.fillText('fokus', 80, 980);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob && navigator.share && navigator.canShare) {
    const file = new File([blob], 'fokus.png', { type: 'image/png' });
    const payload = {
      title: 'Fokus',
      text: `Я набрал ${Math.round(score)} очков в Fokus (точность ${accuracy}%).`,
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
  const text = `Я набрал ${Math.round(params.score)} очков с точностью ${params.accuracy}% в Fokus.`;
  if (navigator.share) {
    navigator.share({ title: 'Fokus', text, url: window.location.origin }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
    alert('Результат скопирован в буфер обмена');
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
