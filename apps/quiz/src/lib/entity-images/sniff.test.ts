import { describe, expect, it } from 'vitest';

import { sniffImage } from './sniff';
import { makeImage } from './test-support';

const bytes = (...b: number[]): Uint8Array => new Uint8Array([...b, ...new Array(Math.max(0, 16 - b.length)).fill(0)]);

describe('sniffImage', () => {
  it('names the format from the magic numbers of real files', async () => {
    expect(sniffImage(await makeImage(40, 40, 'jpeg'))).toBe('image/jpeg');
    expect(sniffImage(await makeImage(40, 40, 'png'))).toBe('image/png');
    expect(sniffImage(await makeImage(40, 40, 'webp'))).toBe('image/webp');
  });

  it('knows GIF and AVIF headers', () => {
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif');
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38, 0x37, 0x61))).toBe('image/gif');
    expect(sniffImage(new Uint8Array([0, 0, 0, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66, 0, 0, 0, 0]))).toBe('image/avif');
  });

  it('refuses SVG, HTML, text, PDF, a RIFF that is not WebP, an ftyp that is not AVIF and short input', () => {
    const enc = (s: string): Uint8Array => new TextEncoder().encode(s.padEnd(32, ' '));
    expect(sniffImage(enc('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(sniffImage(enc('<!doctype html><script>alert(1)</script>'))).toBeNull();
    expect(sniffImage(enc('GIF is not a file name here'))).toBeNull();
    expect(sniffImage(enc('%PDF-1.7'))).toBeNull();
    expect(sniffImage(enc('RIFF....WAVEfmt '))).toBeNull();
    expect(sniffImage(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x70, 0x34, 0x32, 0, 0, 0, 0]))).toBeNull();
    expect(sniffImage(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});
