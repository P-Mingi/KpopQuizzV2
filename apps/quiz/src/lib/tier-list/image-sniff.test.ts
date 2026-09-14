import { describe, it, expect } from 'vitest';

import { sniffImageType } from './image-sniff';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const text = new Uint8Array([...'hello world, not an image'].map((c) => c.charCodeAt(0)));
const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // GIF89a - not allowed

describe('sniffImageType (magic bytes, not client MIME)', () => {
  it('accepts a real JPEG', () => { expect(sniffImageType(jpeg)).toBe('image/jpeg'); });
  it('accepts a real PNG', () => { expect(sniffImageType(png)).toBe('image/png'); });
  it('accepts a real WEBP (RIFF....WEBP)', () => { expect(sniffImageType(webp)).toBe('image/webp'); });
  it('rejects a text file renamed .png', () => { expect(sniffImageType(text)).toBeNull(); });
  it('rejects a disallowed real type (GIF)', () => { expect(sniffImageType(gif)).toBeNull(); });
  it('rejects RIFF that is not WEBP', () => {
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]))).toBeNull();
  });
  it('rejects empty/short input', () => { expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull(); });
});
