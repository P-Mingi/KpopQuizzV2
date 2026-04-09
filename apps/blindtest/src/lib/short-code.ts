/**
 * URL-safe short code generator for challenge links. 8 characters from a
 * 30-char alphabet (Crockford-like, no visually ambiguous 0/1/I/L/O), which
 * gives ~6.5e11 possible codes. Collisions are statistically negligible but
 * the create endpoint still retries on a unique-violation just in case.
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateShortCode(length = 8): string {
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[buf[i]! % ALPHABET.length];
  }
  return out;
}
