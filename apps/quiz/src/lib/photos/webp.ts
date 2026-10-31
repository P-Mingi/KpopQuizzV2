// Daily games step 2: the width and height of a WebP file read from its header, so the admin routes check every file the browser made
// (the bucket keeps WebP only, 018) without decoding it. Pure. Formats: VP8 (lossy), VP8L (lossless), VP8X (extended: alpha, animation).

export interface WebpInfo { readonly width: number; readonly height: number; readonly animated: boolean }

const ascii = (b: Uint8Array, at: number, s: string): boolean => [...s].every((c, i) => b[at + i] === c.charCodeAt(0));
const u24 = (b: Uint8Array, at: number): number => b[at]! | (b[at + 1]! << 8) | (b[at + 2]! << 16);

/** The size of a WebP file, or null when the bytes are not one (a file that only says it is, a truncated header, another format). */
export function webpInfo(b: Uint8Array): WebpInfo | null {
  if (b.length < 30 || !ascii(b, 0, 'RIFF') || !ascii(b, 8, 'WEBP')) return null;
  if (ascii(b, 12, 'VP8 ')) {
    // Frame tag (3 bytes), then the start code 9d 01 2a, then 14 bits of width and of height.
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    const width = (b[26]! | (b[27]! << 8)) & 0x3fff;
    const height = (b[28]! | (b[29]! << 8)) & 0x3fff;
    return width > 0 && height > 0 ? { width, height, animated: false } : null;
  }
  if (ascii(b, 12, 'VP8L')) {
    if (b[20] !== 0x2f) return null;
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1, animated: false };
  }
  if (ascii(b, 12, 'VP8X')) {
    const flags = b[20]!;
    return { width: u24(b, 24) + 1, height: u24(b, 27) + 1, animated: (flags & 0x02) !== 0 };
  }
  return null;
}
