/**
 * Client-side canvas generator for a 1080x1350 photocard-style share PNG.
 * The 3:4 ratio matches K-pop photocard proportions and plays well with
 * Instagram stories and Discord unfurls.
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
  /** Optional level title line, e.g. "Lv.12 · Stan". */
  levelTitle?: string;
  dailyNumber?: number;
}

const BG = '#0D0D0F';
const SURFACE = '#1A1A1E';
const TEXT_PRIMARY = '#E8E6E0';
const TEXT_SECONDARY = '#7A786E';
const TEXT_GHOST = '#5A584E';
const ACCENT = '#ED93B1';
const ACCENT_SOFT = 'rgba(237,147,177,0.1)';
const ACCENT_HOLO = 'rgba(237,147,177,0.15)';
const PURPLE_HOLO = 'rgba(127,119,221,0.1)';
const CORRECT = '#1D9E75';
const WRONG = '#E24B4A';
const TIMEOUT = '#2a2a2e';
const STREAK = '#EF9F27';

const FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function formatPlaylistLabel(playlist: string, mode: string, dailyNumber?: number): string {
  if (dailyNumber !== undefined) return `Daily #${dailyNumber}`;
  if (mode === 'challenge') return 'Challenge mode';
  if (playlist === 'all') return '';
  if (playlist === 'gg') return 'Girl groups';
  if (playlist === 'bg') return 'Boy groups';
  if (playlist === 'solo') return 'Solo';
  if (playlist.endsWith('-gen')) return playlist.replace('-gen', ' gen');
  return playlist;
}

function getBilingualLabel(correct: number, total: number): string {
  if (correct === total) return '\uC62C\uD0AC! PERFECT!';           // 올킬!
  if (correct === total - 1) return '\uC544\uAE4C\uB2E4! SO CLOSE!'; // 아깝다!
  if (correct >= Math.ceil(total * 0.7)) return '\uB300\uBC15!';     // 대박!
  if (correct >= Math.ceil(total * 0.5)) return '\uAD1C\uCC2E\uC544~'; // 괜찮아~
  return '\uB2E4\uC2DC!'; // 다시!
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
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
  ctx.font = `700 40px ${FONT_STACK}`;
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

function drawLightstickIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  // Head
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fill();
  // Stick
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.fillRect(cx - 4, cy + 28, 8, 40);
  // Eyes
  ctx.fillStyle = BG;
  ctx.beginPath();
  ctx.arc(cx - 7, cy - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 7, cy - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  // Smile
  ctx.strokeStyle = BG;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

export async function generateShareCard(data: ShareCardData): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('generateShareCard must run in the browser');
  }

  const W = 1080;
  const H = 1350; // 4:5 photocard-ish ratio
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas context unavailable');

  const correct = data.results.filter((r) => r.correct).length;
  const total = data.results.length;
  const subtitle = formatPlaylistLabel(data.playlist, data.mode, data.dailyNumber);
  const label = getBilingualLabel(correct, total);

  // ---- Background + holographic tint ----
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Multi-stop holographic sheen (subtle).
  const sheen = ctx.createLinearGradient(0, 0, W, H);
  sheen.addColorStop(0, 'rgba(237, 147, 177, 0.04)');
  sheen.addColorStop(0.3, 'rgba(127, 119, 221, 0.04)');
  sheen.addColorStop(0.6, 'rgba(239, 159, 39, 0.04)');
  sheen.addColorStop(1, 'rgba(237, 147, 177, 0.04)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, W, H);

  // ---- Holographic corner accents ----
  ctx.lineWidth = 2;
  // Top-right diamond
  ctx.save();
  ctx.translate(980, 90);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = ACCENT_HOLO;
  ctx.strokeRect(-32, -32, 64, 64);
  ctx.restore();
  // Bottom-left diamond
  ctx.save();
  ctx.translate(110, 1240);
  ctx.rotate(Math.PI / 6);
  ctx.strokeStyle = PURPLE_HOLO;
  ctx.strokeRect(-22, -22, 44, 44);
  ctx.restore();

  // ---- Lightstick mascot (top center) ----
  drawLightstickIcon(ctx, W / 2, 115);

  // ---- Logo ----
  drawLogo(ctx, W / 2, 240);

  // ---- Subtitle (daily/challenge/playlist) ----
  if (subtitle) {
    ctx.font = `500 24px ${FONT_STACK}`;
    ctx.fillStyle = TEXT_GHOST;
    ctx.textAlign = 'center';
    ctx.fillText(subtitle, W / 2, 280);
  }

  // ---- Emoji grid ----
  const gridY = 340;
  const sq = 64;
  const gap = 14;
  const gridWidth = total * sq + (total - 1) * gap;
  const startX = (W - gridWidth) / 2;
  data.results.forEach((r, i) => {
    const x = startX + i * (sq + gap);
    if (r.correct) ctx.fillStyle = CORRECT;
    else if (r.answered === null) ctx.fillStyle = TIMEOUT;
    else ctx.fillStyle = WRONG;
    roundedRect(ctx, x, gridY, sq, sq, 14);
    ctx.fill();
  });

  // ---- Big score ----
  ctx.font = `700 150px ${FONT_STACK}`;
  ctx.fillStyle = TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${correct}/${total}`, W / 2, 610);

  // ---- Korean + English label ----
  ctx.font = `700 34px ${FONT_STACK}`;
  ctx.fillStyle = ACCENT;
  ctx.fillText(label, W / 2, 670);

  // ---- Level title ----
  if (data.levelTitle) {
    ctx.font = `500 22px ${FONT_STACK}`;
    ctx.fillStyle = TEXT_GHOST;
    ctx.fillText(data.levelTitle, W / 2, 708);
  }

  // ---- Stats row (3 rounded cards) ----
  const statsY = 760;
  const cardW = 240;
  const cardH = 110;
  const cardGap = 22;
  const statsTotalW = cardW * 3 + cardGap * 2;
  const statsStartX = (W - statsTotalW) / 2;
  const stats: Array<{ value: string; label: string }> = [
    { value: data.totalScore.toLocaleString(), label: 'score' },
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

  // ---- Streak line ----
  if (data.streak > 0) {
    ctx.font = `600 30px ${FONT_STACK}`;
    ctx.fillStyle = STREAK;
    ctx.textAlign = 'center';
    // 🔥 N day streak 화이팅!
    ctx.fillText(`\uD83D\uDD25 ${data.streak} day streak \uD654\uC774\uD305!`, W / 2, 940);
  }

  // ---- CTA + URL (bottom) ----
  ctx.font = `500 28px ${FONT_STACK}`;
  ctx.fillStyle = TEXT_SECONDARY;
  ctx.textAlign = 'center';
  ctx.fillText(
    data.dailyNumber !== undefined ? 'How did you do?' : 'Can you beat me?',
    W / 2,
    1200,
  );
  ctx.font = `700 28px ${FONT_STACK}`;
  ctx.fillStyle = ACCENT;
  ctx.fillText(
    data.dailyNumber !== undefined ? 'kpopblindtest.com/daily' : 'kpopblindtest.com',
    W / 2,
    1248,
  );

  // ---- Thin accent border around the card ----
  ctx.strokeStyle = ACCENT_SOFT;
  ctx.lineWidth = 2;
  roundedRect(ctx, 4, 4, W - 8, H - 8, 26);
  ctx.stroke();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode share card as PNG'));
    }, 'image/png');
  });
}
