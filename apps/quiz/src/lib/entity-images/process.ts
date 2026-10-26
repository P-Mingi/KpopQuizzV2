// Run O1 (ADM back): turns an uploaded or imported source file into the two stored WebP files of its kind. Server only (sharp).
// Checks, in order: size cap, the kind of file from its bytes (never the name or the declared type), that it decodes, that it is
// not tiny. Output: re-encoded WebP, EXIF and every other metadata dropped, orientation applied, cropped to the fixed 1x and 2x boxes.
import { createHash } from 'node:crypto';

import sharp from 'sharp';

import { MAX_OUTPUT_BYTES, MAX_SOURCE_BYTES, MAX_SOURCE_PIXELS, MIN_SOURCE_FRACTION, sizesOf } from './constants';
import { ImageError } from './errors';
import { sniffImage } from './sniff';

import type { ImageKind } from './constants';

export interface ProcessedImage {
  readonly x1: Buffer;
  readonly x2: Buffer;
  readonly width: number;
  readonly height: number;
  /** The first 16 hex digits of the sha256 of the 1x file: the name of both files, so a changed image is a new address. */
  readonly hash: string;
}

const READ = { limitInputPixels: MAX_SOURCE_PIXELS, failOn: 'error', animated: false } as const;

async function encode(source: Buffer, w: number, h: number): Promise<Buffer> {
  for (const quality of [82, 70, 55]) {
    const out = await sharp(source, READ).rotate().resize({ width: w, height: h, fit: 'cover', position: 'centre' }).webp({ quality, effort: 4 }).toBuffer();
    if (out.length <= MAX_OUTPUT_BYTES) return out;
  }
  throw new ImageError('too_large', 413, 'The picture is too detailed to store. Use a smaller or simpler one.');
}

export async function processImage(input: Uint8Array, kind: ImageKind): Promise<ProcessedImage> {
  if (input.length === 0) throw new ImageError('invalid_image', 422, 'The file is empty.');
  if (input.length > MAX_SOURCE_BYTES) throw new ImageError('too_large', 413, 'The file is larger than 8 MB.');
  if (!sniffImage(input)) throw new ImageError('unsupported_type', 415, 'Only JPEG, PNG, WebP, GIF and AVIF pictures are accepted.');
  const source = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const { x1, x2 } = sizesOf(kind);
  try {
    const meta = await sharp(source, READ).metadata();
    const swap = (meta.orientation ?? 1) >= 5;
    const sw = (swap ? meta.height : meta.width) ?? 0;
    const sh = (swap ? meta.width : meta.height) ?? 0;
    if (sw < 1 || sh < 1) throw new ImageError('invalid_image', 422, 'The file does not decode as a picture.');
    if (sw < x1.w * MIN_SOURCE_FRACTION || sh < x1.h * MIN_SOURCE_FRACTION) {
      throw new ImageError('image_too_small', 422, `The picture is too small (${sw} by ${sh}). Use one at least ${Math.round(x1.w * MIN_SOURCE_FRACTION)} by ${Math.round(x1.h * MIN_SOURCE_FRACTION)}.`);
    }
    const [b1, b2] = await Promise.all([encode(source, x1.w, x1.h), encode(source, x2.w, x2.h)]);
    return { x1: b1, x2: b2, width: x1.w, height: x1.h, hash: createHash('sha256').update(b1).digest('hex').slice(0, 16) };
  } catch (e) {
    if (e instanceof ImageError) throw e;
    throw new ImageError('invalid_image', 422, 'The file does not decode as a picture.');
  }
}
