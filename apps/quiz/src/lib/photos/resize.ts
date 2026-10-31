// Daily games step 2 (RAPPORT-JEUX-DU-JOUR-v2.md 7.3): the thumbnails are computed in the admin's browser at upload, with the canvas
// (createImageBitmap, canvas.toBlob 'image/webp'): no Vercel image optimisation and no new dependency. Browser only (the admin's client
// components call it); the geometry is crop.ts. The admin routes check every file again from its bytes (store.ts).

import { MAX_OUTPUT_BYTES } from '@/lib/entity-images/constants';

import { cropToBox, fitWidth, tooSmall } from './crop';
import { ASSET_WIDTHS, MIN_SOURCE_FRACTION, PHOTO_BOX, SMALL_ASSET_WIDTHS, THUMB_BOX } from './slots';

import type { Rect } from './crop';
import type { AssetType, Box, Focal, PhotoKind } from './slots';

/** The most bytes of a source file (the rule of the anime admin). */
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

export class ResizeError extends Error {}

/** Decodes a picture, with its EXIF orientation applied. */
export async function decode(blob: Blob): Promise<ImageBitmap> {
  if (blob.size > MAX_SOURCE_BYTES) throw new ResizeError('Le fichier dépasse 8 Mo.');
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    throw new ResizeError('Ce fichier ne se lit pas comme une image (JPEG, PNG, WebP, GIF ou AVIF).');
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
}

/** Draws `rect` of the picture into an `out` box and encodes it as WebP, lowering the quality until it fits the bucket's 4 MB. */
export async function drawWebp(bitmap: ImageBitmap, rect: Rect, out: Box): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = out.w;
  canvas.height = out.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ResizeError('Le navigateur ne sait pas dessiner l\'image.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, out.w, out.h);
  for (const q of [0.86, 0.74, 0.6]) {
    const blob = await toBlob(canvas, q);
    // A browser that cannot write WebP answers a PNG instead (Safari before 17): refused, the bucket keeps WebP only.
    if (!blob || blob.type !== 'image/webp') throw new ResizeError('Ce navigateur ne sait pas écrire du WebP : utilise Chrome, Edge ou Firefox.');
    if (blob.size <= MAX_OUTPUT_BYTES) return blob;
  }
  throw new ResizeError('L\'image est trop détaillée pour tenir dans 4 Mo : choisis-en une plus simple.');
}

export interface PhotoBlobs { readonly x1: Blob; readonly x2: Blob; readonly thumb: Blob }

/** The three files of a picture of an entity: the 1x box and the 2x one cropped around the focal point, and the 96 px square. */
export async function makePhotoFiles(bitmap: ImageBitmap, kind: PhotoKind, focal: Focal): Promise<PhotoBlobs> {
  const box = PHOTO_BOX[kind];
  if (tooSmall(bitmap.width, bitmap.height, box, MIN_SOURCE_FRACTION)) {
    throw new ResizeError(`L'image est trop petite (${bitmap.width} par ${bitmap.height}) : il faut au moins ${Math.round(box.w * MIN_SOURCE_FRACTION)} par ${Math.round(box.h * MIN_SOURCE_FRACTION)}.`);
  }
  const rect = cropToBox(bitmap.width, bitmap.height, box, focal);
  const square = cropToBox(bitmap.width, bitmap.height, THUMB_BOX, focal);
  const [x1, x2, thumb] = [await drawWebp(bitmap, rect, box), await drawWebp(bitmap, rect, { w: box.w * 2, h: box.h * 2 }), await drawWebp(bitmap, square, THUMB_BOX)];
  return { x1, x2, thumb };
}

export interface AssetBlobs { readonly large: Blob; readonly mid: Blob | null; readonly thumb: Blob; readonly width: number; readonly height: number }

/**
 * The files of a site asset, whole (no crop: the focal point is applied where it is drawn, desktop and mobile frames differ): a banner or
 * card image at 1920, 400 and 96 px wide, an icon or a sticker at 400 and 96. Never enlarged.
 */
export async function makeAssetFiles(bitmap: ImageBitmap, type: AssetType): Promise<AssetBlobs> {
  const whole: Rect = { sx: 0, sy: 0, sw: bitmap.width, sh: bitmap.height };
  const big = type === 'banner' || type === 'card_image';
  const largeBox = fitWidth(bitmap.width, bitmap.height, big ? ASSET_WIDTHS.large : SMALL_ASSET_WIDTHS.large);
  const large = await drawWebp(bitmap, whole, largeBox);
  const mid = big ? await drawWebp(bitmap, whole, fitWidth(largeBox.w, largeBox.h, ASSET_WIDTHS.mid)) : null;
  const thumb = await drawWebp(bitmap, whole, fitWidth(largeBox.w, largeBox.h, ASSET_WIDTHS.thumb));
  return { large, mid, thumb, width: largeBox.w, height: largeBox.h };
}
