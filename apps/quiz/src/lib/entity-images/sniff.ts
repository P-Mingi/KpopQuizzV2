// Run O1 (ADM back): the kind of an image file read from its first bytes (magic numbers), never from a name or a header.
// SVG is refused on purpose (it can carry script); so is every other format.

export type SniffedType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'image/avif';

const startsWith = (b: Uint8Array, bytes: readonly number[], at = 0): boolean => bytes.every((v, i) => b[at + i] === v);

/** The image type of `bytes`, or null when they are not one of JPEG, PNG, GIF, WebP or AVIF. */
export function sniffImage(bytes: Uint8Array): SniffedType | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38]) && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61) return 'image/gif';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  // ISO base media: bytes 4 to 7 are "ftyp", then the major brand "avif" or "avis".
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4) && (startsWith(bytes, [0x61, 0x76, 0x69, 0x66], 8) || startsWith(bytes, [0x61, 0x76, 0x69, 0x73], 8))) return 'image/avif';
  return null;
}
