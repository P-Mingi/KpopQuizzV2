// Verify the REAL type of an uploaded image from its magic bytes, so a route does
// not trust the client-supplied MIME (a text file renamed .png, or a forged
// content-type, must be rejected). Pure + unit-testable. Allowed types match the
// tier-list-assets extension allowlist; SVG is not sniffable to a safe raster type
// and is intentionally absent.

export type SniffedType = 'image/jpeg' | 'image/png' | 'image/webp';

function has(bytes: Uint8Array, offset: number, sig: number[]): boolean {
  if (bytes.length < offset + sig.length) return false;
  for (let i = 0; i < sig.length; i += 1) if (bytes[offset + i] !== sig[i]) return false;
  return true;
}

/** Return the real image type from the header bytes, or null if none matches. */
export function sniffImageType(bytes: Uint8Array): SniffedType | null {
  // JPEG: FF D8 FF
  if (has(bytes, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (has(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  // WEBP: "RIFF" ???? "WEBP" (RIFF at 0, WEBP at 8)
  if (has(bytes, 0, [0x52, 0x49, 0x46, 0x46]) && has(bytes, 8, [0x57, 0x45, 0x42, 0x50])) return 'image/webp';
  return null;
}
