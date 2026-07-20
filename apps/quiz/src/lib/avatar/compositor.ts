import sharp from 'sharp';

import { selectionToLayers, type AvatarSelection, type AvatarTransform } from './manifest';

// Server-side flatten (Workstream M, M1.27 finalize). Composites the selected
// layers into ONE 1024 PNG, applying each layer's transform exactly as the live
// preview does (center-based scale + center offset + rotate), so the flattened
// image matches what the user saw in the editor.

export const AVATAR_CANVAS = 1024;

export type LayerLoader = (asset: string) => Promise<Buffer>;

interface Placed {
  input: Buffer;
  left: number;
  top: number;
}

// Scale + rotate one layer, then clamp it into the 1024 canvas (sharp.composite
// rejects negative offsets / overflow, which happen when scale > 1).
async function placeLayer(buf: Buffer, t: AvatarTransform): Promise<Placed | null> {
  const scaled = Math.max(1, Math.round(AVATAR_CANVAS * t.scale));
  let img = sharp(buf).ensureAlpha().resize(scaled, scaled, { fit: 'fill' });
  if (t.rotate) {
    img = img.rotate(t.rotate, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
  }
  const out = await img.png().toBuffer();
  const meta = await sharp(out).metadata();
  const w = meta.width ?? scaled;
  const h = meta.height ?? scaled;

  // Center the layer on the canvas, then apply the x/y offset (1024 units).
  const left = Math.round((AVATAR_CANVAS - w) / 2 + t.x);
  const top = Math.round((AVATAR_CANVAS - h) / 2 + t.y);

  // Crop the portion that lands inside [0, 1024).
  const sx = Math.max(0, -left);
  const sy = Math.max(0, -top);
  const dx = Math.max(0, left);
  const dy = Math.max(0, top);
  const cw = Math.min(w - sx, AVATAR_CANVAS - dx);
  const ch = Math.min(h - sy, AVATAR_CANVAS - dy);
  if (cw <= 0 || ch <= 0) return null; // fully off-canvas

  const cropped =
    sx === 0 && sy === 0 && cw === w && ch === h
      ? out
      : await sharp(out).extract({ left: sx, top: sy, width: cw, height: ch }).png().toBuffer();

  return { input: cropped, left: dx, top: dy };
}

export async function flattenAvatar(sel: AvatarSelection, load: LayerLoader): Promise<Buffer> {
  const layers = selectionToLayers(sel);
  const placed: Placed[] = [];
  for (const layer of layers) {
    const buf = await load(layer.asset);
    const p = await placeLayer(buf, layer.transform);
    if (p) placed.push(p);
  }
  return sharp({
    create: {
      width: AVATAR_CANVAS,
      height: AVATAR_CANVAS,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(placed)
    .png()
    .toBuffer();
}
