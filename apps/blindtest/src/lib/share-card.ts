/**
 * Client-side canvas generator for a 1080x1080 share card PNG.
 * Designed for Instagram stories / screenshot dumps.
 * Must run in the browser (uses document.createElement and canvas.toBlob).
 */

export interface ShareCardResult {
  correct: boolean;
  answered: string | null;
}

export interface ShareCardData {
  results: ShareCardResult[];
  totalScore: number;
  avgSpeed: number;
  bestCombo: number;
  streak: number;
  playlist: string;
  mode: string;
  dailyNumber?: number;
}

const BG = '#0D0D0F';
const SURFACE = '#1A1A1E';
const TEXT_PRIMARY = '#E8E6E0';
const TEXT_SECONDARY = '#7A786E';
const TEXT_GHOST = '#5A584E';
const ACCENT = '#ED93B1';
const CORRECT = '#1D9E75';
const WRONG = '#E24B4A';
const TIMEOUT = '#2a2a2e';
const STREAK = '#EF9F27';

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function formatPlaylistLabel(playlist: string, mode: string, dailyNumber?: number): string {
  if (dailyNumber !== undefined) return `Daily #${dailyNumber}`;
  if (mode === 'challenge') return 'Challenge Mode';
  if (playlist === 'all') return '';
  if (playlist === 'gg') return 'Girl groups';
  if (playlist === 'bg') return 'Boy groups';
  if (playlist === 'solo') return 'Solo';
  if (playlist.endsWith('-gen')) return playlist.replace('-gen', ' gen');
  return playlist;
}

function getScoreLabel(correct: number, total: number): string {
  if (correct === total) return 'PERFECT!';
  if (correct === total - 1) return 'SO CLOSE!';
  if (correct >= Math.ceil(total * 0.7)) return 'Great round!';
  if (correct >= Math.ceil(total * 0.5)) return 'Not bad!';
  return 'Keep trying!';
}

/**
 * Draw a rounded rectangle path. Falls back to a regular rect when
 * ctx.roundRect isn't available (older browsers).
 */
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawLogo(ctx: CanvasRenderingContext2D, cx: number, y: number): void {
  ctx.font = `700 36px ${FONT_STACK}`;
  ctx.textBaseline = 'alphabetic';

  const parts = [
    { text: 'kpop', color: TEXT_PRIMARY },
    { text: 'blind', color: ACCENT },
    { text: 'test', color: TEXT_PRIMARY },
  ];
  const widths = parts.map((p) => ctx.measureText(p.text).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  let x = cx - totalWidth / 2;
  parts.forEach((p, i) => {
    ctx.fillStyle = p.color;
    ctx.textAlign = 'left';
    ctx.fillText(p.text, x, y);
    x += widths[i] ?? 0;
  });
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('generateShareCard must run in the browser');
  }

  const W = 1080;
  const H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  const correct = data.results.filter((r) => r.correct).length;
  const total = data.results.length;
  const label = getScoreLabel(correct, total);
  const subtitle = formatPlaylistLabel(data.playlist, data.mode, data.dailyNumber);

  // Background + subtle diagonal gradient overlay.
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  const bgGradient = ctx.createLinearGradient(0, 0, W, H);
  bgGradient.addColorStop(0, 'rgba(30, 16, 32, 0.5)');
  bgGradient.addColorStop(1, 'rgba(26, 26, 62, 0.35)');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, W, H);

  // Logo (centered, top).
  drawLogo(ctx, W / 2, 110);

  // Subtitle under the logo.
  if (subtitle) {
    ctx.font = `500 24px ${FONT_STACK}`;
    ctx.fillStyle = TEXT_SECONDARY;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(subtitle, W / 2, 150);
  }

  // Emoji-style grid: one rounded square per result.
  const gridY = 240;
  const square = 64;
  const gap = 14;
  const gridWidth = total * square + (total - 1) * gap;
  const gridStartX = (W - gridWidth) / 2;
  data.results.forEach((r, i) => {
    const x = gridStartX + i * (square + gap);
    if (r.correct) {
      ctx.fillStyle = CORRECT;
    } else if (r.answered === null) {
      ctx.fillStyle = TIMEOUT;
    } else {
      ctx.fillStyle = WRONG;
    }
    roundedRect(ctx, x, gridY, square, square, 14);
    ctx.fill();
  });

  // Huge score.
  ctx.font = `700 160px ${FONT_STACK}`;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${correct}/${total}`, W / 2, 520);

  // Label.
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillStyle = ACCENT;
  ctx.fillText(label, W / 2, 575);

  // Stats row (3 cards).
  const statsY = 650;
  const cardW = 240;
  const cardH = 110;
  const cardGap = 24;
  const statsTotalW = cardW * 3 + cardGap * 2;
  const statsStartX = (W - statsTotalW) / 2;
  const stats: Array<{ value: string; label: string }> = [
    { value: data.totalScore.toLocaleString(), label: 'points' },
    { value: `${data.avgSpeed.toFixed(1)}s`, label: 'speed' },
    { value: `${data.bestCombo}x`, label: 'combo' },
  ];
  stats.forEach((stat, i) => {
    const x = statsStartX + i * (cardW + cardGap);
    ctx.fillStyle = SURFACE;
    roundedRect(ctx, x, statsY, cardW, cardH, 18);
    ctx.fill();

    ctx.font = `700 36px ${FONT_STACK}`;
    ctx.fillStyle = TEXT_PRIMARY;
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, x + cardW / 2, statsY + 55);

    ctx.font = `500 20px ${FONT_STACK}`;
    ctx.fillStyle = TEXT_GHOST;
    ctx.fillText(stat.label, x + cardW / 2, statsY + 85);
  });

  // Streak line.
  if (data.streak > 0) {
    ctx.font = `600 28px ${FONT_STACK}`;
    ctx.fillStyle = STREAK;
    ctx.textAlign = 'center';
    ctx.fillText(`\uD83D\uDD25 ${data.streak} day streak`, W / 2, 830);
  }

  // CTA + URL.
  ctx.font = `500 28px ${FONT_STACK}`;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.textAlign = 'center';
  const ctaY = data.streak > 0 ? 920 : 880;
  ctx.fillText(
    data.dailyNumber !== undefined ? 'How did you do?' : 'Can you beat me?',
    W / 2,
    ctaY,
  );
  ctx.font = `700 26px ${FONT_STACK}`;
  ctx.fillStyle = ACCENT;
  ctx.fillText(
    data.dailyNumber !== undefined ? 'kpopblindtest.com/daily' : 'kpopblindtest.com',
    W / 2,
    ctaY + 38,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode share card as PNG'));
    }, 'image/png');
  });
}
