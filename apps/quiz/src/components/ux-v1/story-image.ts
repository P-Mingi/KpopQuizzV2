'use client';

// Default story image of the share sheet (X2-008; DESIGN-SPEC 16.7, prototype share
// tile "Saves a 1080 x 1920 story image"): a 1080 x 1920 PNG drawn in the browser
// from the sheet's own preview (picture, line 1, line 2). No server route, no upload,
// no write. A picture that does not allow CORS fails to load (crossOrigin anonymous)
// instead of tainting the canvas: the card is then the plain ground. Pages with a
// richer story (P4's result photocard) keep passing their own onStoryImage.

export interface StoryCard {
  image: string | null;
  line1: string;
  line2?: string | undefined;
  // v12 variants (share kit, result cards). All optional: a card without any of
  // them is drawn exactly as before.
  /** 'story' = 1080 x 1920 (default), 'square' = 1080 x 1080. */
  format?: StoryFormat | undefined;
  /** Small uppercase line above line 1: "KATSEYE quiz". */
  kicker?: string | undefined;
  /** Small uppercase label at the top right: "New quiz". */
  tag?: string | undefined;
  /** White pill at the bottom instead of the plain "kpopquiz.org": "Play at kpopquiz.org". */
  cta?: string | undefined;
  /** Two-colour ground (160deg) used when there is no picture: ['#C93868', '#6B4FD8']. */
  gradient?: readonly [string, string] | undefined;
  /** A QR picture (data: or same-origin URL) drawn bottom right on a white tile. */
  qr?: string | undefined;
}

export type StoryFormat = 'story' | 'square';

export const STORY_W = 1080;
export const STORY_H = 1920;
export const STORY_SQUARE_H = 1080;
export const STORY_FILE_NAME = 'kpopquiz-story.png';
export const STORY_SQUARE_FILE_NAME = 'kpopquiz-square.png';
/** The share kit's default ground (prototype `#kit-story`). */
export const STORY_KIT_GRADIENT = ['#C93868', '#6B4FD8'] as const;

/** Pixel size and file name of a format. */
export function storyFormat(format: StoryFormat | undefined): { width: number; height: number; fileName: string } {
  return format === 'square'
    ? { width: STORY_W, height: STORY_SQUARE_H, fileName: STORY_SQUARE_FILE_NAME }
    : { width: STORY_W, height: STORY_H, fileName: STORY_FILE_NAME };
}

/**
 * Where the v12 pieces go, in canvas pixels (pure, so it is unit tested): the text
 * block ends above the footer, or above the QR tile when there is one, and the
 * square format keeps fewer lines.
 */
export function storyLayout(card: Pick<StoryCard, 'format' | 'qr' | 'cta'>): { width: number; height: number; pad: number; textBottom: number; footerY: number; maxLines1: number; maxLines2: number; qr: { x: number; y: number; size: number } | null } {
  const { width, height } = storyFormat(card.format);
  const pad = 72;
  const square = card.format === 'square';
  const qrSize = 250;
  const qr = card.qr ? { x: width - pad - qrSize, y: height - pad - qrSize, size: qrSize } : null;
  const footerY = card.cta ? height - pad - 84 : height - 110;
  const textBottom = qr ? qr.y - 40 : card.cta ? footerY - 44 : height - 200;
  return { width, height, pad, textBottom, footerY, maxLines1: square ? 3 : 4, maxLines2: square ? 2 : 3, qr };
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Word-wrap to at most `max` lines; the last kept line ends with "..." when cut. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number, max: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  let used = 0;
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = w;
      if (lines.length === max) break;
    } else {
      line = next;
    }
    used++;
  }
  if (lines.length < max && line) { lines.push(line); line = ''; }
  const cut = used < words.length || line !== '';
  if (cut && lines.length) lines[lines.length - 1] = `${lines[lines.length - 1]!.replace(/\s*\S*$/, '')}...`;
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The PNG, or null when the browser cannot draw it. */
export async function renderStoryCard(card: StoryCard): Promise<Blob | null> {
  const L = storyLayout(card);
  const W = L.width;
  const H = L.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = getComputedStyle(document.body).fontFamily || 'Inter, system-ui, sans-serif';
  const PAD = 72;

  ctx.fillStyle = '#1B1524';
  ctx.fillRect(0, 0, W, H);
  const img = card.image ? await loadImage(card.image) : null;
  if (card.gradient && !(img && img.width > 0 && img.height > 0)) {
    // CSS linear-gradient(160deg, a, b): the gradient line through the centre.
    const rad = (160 * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const half = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
    const ground = ctx.createLinearGradient(W / 2 - dx * half, H / 2 - dy * half, W / 2 + dx * half, H / 2 + dy * half);
    ground.addColorStop(0, card.gradient[0]);
    ground.addColorStop(1, card.gradient[1]);
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, W, H);
  }
  if (img && img.width > 0 && img.height > 0) {
    if (img.height >= img.width * 0.9) {
      // portrait or square photo: full bleed, focal point high (faces), as P4's card
      const s = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) * 0.22, img.width * s, img.height * s);
    } else {
      // landscape (quiz covers, the passport card): the whole picture as a card up top
      const w = W - PAD * 2;
      const h = Math.min(img.height * (w / img.width), H * 0.42);
      const x = PAD;
      const y = 200;
      ctx.save();
      roundRect(ctx, x, y, w, h, 36);
      ctx.clip();
      const s = Math.max(w / img.width, h / img.height);
      ctx.drawImage(img, x + (w - img.width * s) / 2, y + (h - img.height * s) / 2, img.width * s, img.height * s);
      ctx.restore();
    }
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,.30)');
  g.addColorStop(0.26, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, 'rgba(0,0,0,.18)');
  g.addColorStop(1, 'rgba(0,0,0,.86)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.font = `600 40px ${font}`;
  ctx.fillText('KPOPQUIZ', PAD, PAD);
  if (card.tag) {
    ctx.textAlign = 'right';
    ctx.fillText(card.tag.toUpperCase(), W - PAD, PAD);
    ctx.textAlign = 'left';
  }

  // Text block anchored above the footer line: line 1 big, line 2 under it.
  ctx.font = `700 64px ${font}`;
  const l1 = wrap(ctx, card.line1, W - PAD * 2, L.maxLines1);
  ctx.font = `500 42px ${font}`;
  const l2 = card.line2 ? wrap(ctx, card.line2, W - PAD * 2, L.maxLines2) : [];
  const block = l1.length * 78 + (l2.length ? 28 + l2.length * 56 : 0);
  let y = L.textBottom - block;
  if (card.kicker) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = `700 36px ${font}`;
    ctx.fillText(card.kicker.toUpperCase(), PAD, y - 60);
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 64px ${font}`;
  for (const line of l1) { ctx.fillText(line, PAD, y); y += 78; }
  if (l2.length) {
    y += 28;
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = `500 42px ${font}`;
    for (const line of l2) { ctx.fillText(line, PAD, y); y += 56; }
  }
  if (card.cta) {
    ctx.font = `700 36px ${font}`;
    const w = Math.min(ctx.measureText(card.cta).width + 72, (L.qr ? L.qr.x - 32 : W - PAD) - PAD);
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, PAD, L.footerY, w, 84, 42);
    ctx.fill();
    ctx.fillStyle = '#1F1B17';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.cta, PAD + 36, L.footerY + 44, w - 72);
    ctx.textBaseline = 'top';
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = `600 36px ${font}`;
    ctx.fillText('kpopquiz.org', PAD, L.footerY);
  }
  if (L.qr) {
    const code = card.qr ? await loadImage(card.qr) : null;
    if (code && code.width > 0) {
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, L.qr.x, L.qr.y, L.qr.size, L.qr.size, 28);
      ctx.fill();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(code, L.qr.x + 20, L.qr.y + 20, L.qr.size - 40, L.qr.size - 40);
      ctx.imageSmoothingEnabled = true;
    }
  }

  try {
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return null;
  }
}

export async function storyCardFile(card: StoryCard): Promise<File | null> {
  const blob = await renderStoryCard(card);
  return blob ? new File([blob], storyFormat(card.format).fileName, { type: 'image/png' }) : null;
}

/** Saves the file on the viewer's device (a local download, no network). */
export function downloadFile(file: File): void {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
