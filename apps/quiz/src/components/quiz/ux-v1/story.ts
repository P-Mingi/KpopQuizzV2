'use client';

// Story image (DESIGN-SPEC 16.7 share sheet: "Story image", "More apps shares the
// story image as a file where supported"). A 1080 x 1920 PNG of the photocard, drawn
// in the browser from the run's own numbers: no server route, no upload, no write.
// The photo is the same-origin group photo (public/idols) so the canvas stays
// exportable; without one the card is the plain gradient.

export interface StoryInput {
  photo: string | null;
  groupName: string;
  title: string;
  score: number;
  maxScore: number;
  beatPct: number | null;
  stamp: string;
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

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = `${lines[maxLines - 1]!.replace(/\s*\S*$/, '')}...`;
  return lines;
}

export async function renderStory(input: StoryInput): Promise<Blob | null> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = getComputedStyle(document.body).fontFamily || 'Inter, system-ui, sans-serif';

  ctx.fillStyle = '#1B1524';
  ctx.fillRect(0, 0, W, H);
  const img = input.photo ? await loadImage(input.photo) : null;
  if (img) {
    const scale = Math.max(W / img.width, H / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (W - w) / 2, (H - h) * 0.22, w, h);
  }
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(0,0,0,.30)');
  g.addColorStop(0.26, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, 'rgba(0,0,0,.18)');
  g.addColorStop(1, 'rgba(0,0,0,.86)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.font = `600 40px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillText('KPOPQUIZ', 72, 72);
  ctx.textAlign = 'right';
  ctx.fillText(input.stamp.toUpperCase(), W - 72, 72);
  ctx.textAlign = 'left';

  let y = H - 640;
  ctx.fillStyle = 'rgba(255,255,255,.88)';
  ctx.font = `600 40px ${font}`;
  ctx.fillText(`${input.groupName} quiz`.toUpperCase(), 72, y);
  y += 64;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `600 56px ${font}`;
  for (const line of wrap(ctx, input.title, W - 144, 3)) { ctx.fillText(line, 72, y); y += 70; }
  y += 24;
  ctx.font = `700 240px ${font}`;
  const s = String(input.score);
  ctx.fillText(s, 64, y);
  const sw = ctx.measureText(s).width;
  ctx.font = `600 96px ${font}`;
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillText(`/${input.maxScore}`, 72 + sw, y + 118);
  y += 260;
  if (input.beatPct !== null) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `500 44px ${font}`;
    ctx.fillText(`You beat ${input.beatPct}% of players`, 72, y);
  }
  ctx.font = `600 36px ${font}`;
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillText('kpopquiz.org', 72, H - 110);

  try {
    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return null; // tainted canvas: no story image
  }
}

export async function storyFile(input: StoryInput): Promise<File | null> {
  const blob = await renderStory(input);
  return blob ? new File([blob], 'kpopquiz-story.png', { type: 'image/png' }) : null;
}

export async function downloadStory(input: StoryInput): Promise<boolean> {
  const blob = await renderStory(input);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kpopquiz-story.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
