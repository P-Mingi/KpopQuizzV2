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
}

export const STORY_W = 1080;
export const STORY_H = 1920;
export const STORY_FILE_NAME = 'kpopquiz-story.png';

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
  const W = STORY_W;
  const H = STORY_H;
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

  // Text block anchored above the footer line: line 1 big, line 2 under it.
  ctx.font = `700 64px ${font}`;
  const l1 = wrap(ctx, card.line1, W - PAD * 2, 4);
  ctx.font = `500 42px ${font}`;
  const l2 = card.line2 ? wrap(ctx, card.line2, W - PAD * 2, 3) : [];
  const block = l1.length * 78 + (l2.length ? 28 + l2.length * 56 : 0);
  let y = H - 200 - block;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 64px ${font}`;
  for (const line of l1) { ctx.fillText(line, PAD, y); y += 78; }
  if (l2.length) {
    y += 28;
    ctx.fillStyle = 'rgba(255,255,255,.82)';
    ctx.font = `500 42px ${font}`;
    for (const line of l2) { ctx.fillText(line, PAD, y); y += 56; }
  }
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.font = `600 36px ${font}`;
  ctx.fillText('kpopquiz.org', PAD, H - 110);

  try {
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return null;
  }
}

export async function storyCardFile(card: StoryCard): Promise<File | null> {
  const blob = await renderStoryCard(card);
  return blob ? new File([blob], STORY_FILE_NAME, { type: 'image/png' }) : null;
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
