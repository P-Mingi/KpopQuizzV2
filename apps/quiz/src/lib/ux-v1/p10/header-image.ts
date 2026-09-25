// Passport header picture checks + re-encode (DESIGN-SPEC 17.8: JPG, PNG or WebP,
// 5 MB, stored in Supabase storage, 1500 x 300 crop). Server only (sharp).
// The declared type is never trusted: the bytes are sniffed, then decoded by
// sharp with a pixel cap (decompression bombs), EXIF orientation applied, cropped
// to 1500 x 300 and re-encoded as WebP, which also drops every metadata block.

import sharp from 'sharp';

export const HEADER_W = 1500;
export const HEADER_H = 300;
export const HEADER_MAX_BYTES = 5 * 1024 * 1024;
export const HEADER_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
/** Largest decoded image accepted (about 50 megapixels, e.g. 8660 x 5773). */
export const HEADER_MAX_PIXELS = 50_000_000;

export type HeaderKind = 'jpeg' | 'png' | 'webp';

/** Magic bytes: JPEG FF D8 FF, PNG 89 50 4E 47 0D 0A 1A 0A, WebP RIFF....WEBP. */
export function sniffImage(buf: Uint8Array): HeaderKind | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) return 'png';
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'webp';
  return null;
}

export type HeaderCheck = { ok: true; kind: HeaderKind } | { ok: false; status: 400 | 413 | 415; error: string };

/** Cheap checks before decoding: declared type, size, then the sniffed bytes. */
export function checkHeaderFile(file: { type?: string | null; size: number }, head: Uint8Array): HeaderCheck {
  if (file.size <= 0) return { ok: false, status: 400, error: 'That file is empty.' };
  if (file.size > HEADER_MAX_BYTES) return { ok: false, status: 413, error: 'That image is over 5 MB.' };
  const declared = (file.type ?? '').toLowerCase();
  if (declared && !(HEADER_MIME as readonly string[]).includes(declared)) return { ok: false, status: 415, error: 'Use a JPG, PNG or WebP image.' };
  const kind = sniffImage(head);
  if (!kind) return { ok: false, status: 415, error: 'Use a JPG, PNG or WebP image.' };
  return { ok: true, kind };
}

export type HeaderRender = { ok: true; out: Buffer; width: number; height: number } | { ok: false; status: 415 | 422; error: string };

/** Decode, crop to 1500 x 300 (cover, attention-weighted) and re-encode as WebP. */
export async function renderHeader(input: Buffer): Promise<HeaderRender> {
  const kind = sniffImage(input);
  if (!kind) return { ok: false, status: 415, error: 'Use a JPG, PNG or WebP image.' };
  let meta: sharp.Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: HEADER_MAX_PIXELS, failOn: 'error' }).metadata();
  } catch {
    return { ok: false, status: 422, error: 'We could not read that image.' };
  }
  if (meta.format !== kind) return { ok: false, status: 415, error: 'Use a JPG, PNG or WebP image.' };
  if (!meta.width || !meta.height) return { ok: false, status: 422, error: 'We could not read that image.' };
  try {
    const out = await sharp(input, { limitInputPixels: HEADER_MAX_PIXELS, failOn: 'error', animated: false })
      .rotate()
      .resize(HEADER_W, HEADER_H, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    return { ok: true, out: out.data, width: out.info.width, height: out.info.height };
  } catch {
    return { ok: false, status: 422, error: 'We could not process that image.' };
  }
}
