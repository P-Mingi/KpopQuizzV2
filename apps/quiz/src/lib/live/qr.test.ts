import { describe, expect, it } from 'vitest';

import {
  encodeQr, qrBlocks, qrByteCapacity, qrDataCapacity, qrDataUrl, qrFormatBits, qrMaskBit, qrPath, qrPenalty, qrSvg,
  qrVersionBits, qrViewSize, rsRemainder,
} from './qr';

import type { QrCode, QrLevel } from './qr';

// ---------------------------------------------------------------------------
// An independent reader, written from the standard and sharing no code with the
// encoder: it finds the function modules itself, reads the format bits, removes
// the mask, walks the zigzag, undoes the interleaving, checks every block with
// Reed-Solomon syndromes (polynomial evaluation, not the encoder's division) and
// parses the byte segment. If it returns the text, the symbol is a valid QR code
// for that text.
// ---------------------------------------------------------------------------

const LEVELS: QrLevel[] = ['L', 'M', 'Q', 'H'];
const LEVEL_OF_BITS: Record<number, QrLevel> = { 1: 'L', 0: 'M', 3: 'Q', 2: 'H' };
const ALIGN: number[][] = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
// Total codewords per version, from the standard (table 1).
const TOTAL_CODEWORDS = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346];

// GF(256) by log tables (the encoder multiplies bit by bit).
const EXP: number[] = [];
const LOG: number[] = new Array<number>(256).fill(0);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
}
const mul = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : (EXP[((LOG[a] as number) + (LOG[b] as number)) % 255] as number));

function syndromesAreZero(block: number[], ec: number): boolean {
  for (let i = 0; i < ec; i++) {
    const alpha = EXP[i] as number;
    let acc = 0;
    for (const c of block) acc = mul(acc, alpha) ^ c;
    if (acc !== 0) return false;
  }
  return true;
}

function functionMap(version: number): boolean[][] {
  const n = 17 + 4 * version;
  const f = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  const mark = (x0: number, y0: number, w: number, h: number): void => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < n && y < n) (f[y] as boolean[])[x] = true;
  };
  mark(0, 0, 9, 9);          // top left finder, separator, format
  mark(n - 8, 0, 8, 9);      // top right
  mark(0, n - 8, 9, 8);      // bottom left
  mark(6, 0, 1, n);          // timing column
  mark(0, 6, n, 1);          // timing row
  const c = ALIGN[version] as number[];
  c.forEach((cy, i) => c.forEach((cx, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === c.length - 1) || (i === c.length - 1 && j === 0)) return;
    mark(cx - 2, cy - 2, 5, 5);
  }));
  if (version >= 7) {
    mark(n - 11, 0, 3, 6);
    mark(0, n - 11, 6, 3);
  }
  return f;
}

function readFormat(m: boolean[][]): { level: QrLevel; mask: number } {
  const at = (x: number, y: number): number => ((m[y] as boolean[])[x] ? 1 : 0);
  let bits = 0;
  for (let i = 0; i <= 5; i++) bits |= at(8, i) << i;
  bits |= at(8, 7) << 6;
  bits |= at(8, 8) << 7;
  bits |= at(7, 8) << 8;
  for (let i = 9; i < 15; i++) bits |= at(14 - i, 8) << i;
  // The second copy must say the same.
  const n = m.length;
  let copy = 0;
  for (let i = 0; i < 8; i++) copy |= at(n - 1 - i, 8) << i;
  for (let i = 8; i < 15; i++) copy |= at(8, n - 15 + i) << i;
  expect(copy).toBe(bits);
  const raw = bits ^ 0x5412;
  return { level: LEVEL_OF_BITS[raw >>> 13] as QrLevel, mask: (raw >>> 10) & 7 };
}

function decode(qr: QrCode): { text: string; level: QrLevel; mask: number; version: number } {
  const m = qr.modules;
  const n = m.length;
  const version = (n - 17) / 4;
  const { level, mask } = readFormat(m);
  const fixed = functionMap(version);
  const bits: number[] = [];
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const up = ((right + 1) & 2) === 0;
        const y = up ? n - 1 - vert : vert;
        if ((fixed[y] as boolean[])[x]) continue;
        const dark = (m[y] as boolean[])[x] === true;
        bits.push((dark !== qrMaskBit(mask, x, y)) ? 1 : 0);
      }
    }
  }
  const total = TOTAL_CODEWORDS[version] as number;
  // What is left after the codewords are the remainder bits: 0 or 7 of them, all light before masking.
  expect(bits.length - total * 8).toBe(version >= 2 && version <= 6 ? 7 : 0);
  expect(bits.slice(total * 8).every((b) => b === 0)).toBe(true);
  const codewords: number[] = [];
  for (let i = 0; i < total; i++) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | (bits[i * 8 + j] as number);
    codewords.push(v);
  }
  const [ec, n1, d1, n2, d2] = qrBlocks(version, level);
  const count = n1 + n2;
  const blocks: number[][] = Array.from({ length: count }, () => []);
  let at = 0;
  for (let i = 0; i < Math.max(d1, d2); i++) {
    for (let b = 0; b < count; b++) {
      const len = b < n1 ? d1 : d2;
      if (i < len) (blocks[b] as number[]).push(codewords[at++] as number);
    }
  }
  const data = blocks.map((b) => [...b]);
  for (let i = 0; i < ec; i++) for (let b = 0; b < count; b++) (blocks[b] as number[]).push(codewords[at++] as number);
  expect(at).toBe(total);
  for (const b of blocks) expect(syndromesAreZero(b, ec)).toBe(true);

  const stream = data.flat();
  let pos = 0;
  const take = (len: number): number => {
    let v = 0;
    for (let i = 0; i < len; i++) {
      const byte = stream[pos >>> 3] as number;
      v = (v << 1) | ((byte >>> (7 - (pos & 7))) & 1);
      pos++;
    }
    return v;
  };
  expect(take(4)).toBe(0b0100);
  const length = take(version < 10 ? 8 : 16);
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) bytes[i] = take(8);
  return { text: new TextDecoder().decode(bytes), level, mask, version };
}

describe('QR tables', () => {
  it('every version and level adds up to the standard codeword count', () => {
    for (let v = 1; v <= 10; v++) {
      for (const level of LEVELS) {
        const [ec, n1, d1, n2, d2] = qrBlocks(v, level);
        expect(n1 * d1 + n2 * d2 + (n1 + n2) * ec, `v${v} ${level}`).toBe(TOTAL_CODEWORDS[v]);
        if (n2 > 0) expect(d2).toBe(d1 + 1);
      }
    }
  });

  it('capacities of the standard (byte mode)', () => {
    expect(qrDataCapacity(1, 'M')).toBe(16);
    expect(qrByteCapacity(1, 'L')).toBe(17);
    expect(qrByteCapacity(1, 'M')).toBe(14);
    expect(qrByteCapacity(1, 'H')).toBe(7);
    expect(qrByteCapacity(2, 'M')).toBe(26);
    expect(qrByteCapacity(3, 'M')).toBe(42);
    expect(qrByteCapacity(4, 'M')).toBe(62);
    expect(qrByteCapacity(5, 'Q')).toBe(60);
    expect(qrByteCapacity(9, 'L')).toBe(230);
    expect(qrByteCapacity(10, 'L')).toBe(271);
    expect(qrByteCapacity(10, 'M')).toBe(213);
    expect(qrByteCapacity(10, 'H')).toBe(119);
  });

  it('format bits of the standard', () => {
    expect(qrFormatBits('L', 0).toString(2).padStart(15, '0')).toBe('111011111000100');
    expect(qrFormatBits('M', 0).toString(2).padStart(15, '0')).toBe('101010000010010');
    expect(qrFormatBits('Q', 0).toString(2).padStart(15, '0')).toBe('011010101011111');
    expect(qrFormatBits('H', 0).toString(2).padStart(15, '0')).toBe('001011010001001');
  });

  it('version bits of the standard', () => {
    expect(qrVersionBits(7)).toBe(0x07c94);
    expect(qrVersionBits(8)).toBe(0x085bc);
    expect(qrVersionBits(9)).toBe(0x09a99);
    expect(qrVersionBits(10)).toBe(0x0a4d3);
  });

  it('Reed-Solomon: the textbook block (HELLO WORLD, 1-M)', () => {
    const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(rsRemainder(data, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });
});

describe('encodeQr', () => {
  const JOIN = 'https://kpopquiz.org/join/K7Q2PX';

  it('a join link fits version 3 at level M and reads back', () => {
    const qr = encodeQr(JOIN);
    expect(qr.version).toBe(3);
    expect(qr.size).toBe(29);
    expect(qr.modules).toHaveLength(29);
    expect(decode(qr)).toEqual({ text: JOIN, level: 'M', mask: qr.mask, version: 3 });
  });

  it('reads back in every version from 1 to 10 and at every level', () => {
    for (const level of LEVELS) {
      for (let v = 1; v <= 10; v++) {
        // Exactly the capacity of the version: the terminator and padding edge.
        const text = 'k'.repeat(qrByteCapacity(v, level));
        const qr = encodeQr(text, { level });
        expect(qr.version, `v${v} ${level}`).toBe(v);
        const got = decode(qr);
        expect(got.text).toBe(text);
        expect(got.level).toBe(level);
        // One byte short of the capacity too.
        expect(decode(encodeQr(text.slice(1), { level, minVersion: v })).text).toBe(text.slice(1));
      }
    }
  });

  it('reads back with each of the eight masks', () => {
    for (let mask = 0; mask < 8; mask++) {
      const qr = encodeQr(JOIN, { mask });
      expect(qr.mask).toBe(mask);
      const got = decode(qr);
      expect(got.mask).toBe(mask);
      expect(got.text).toBe(JOIN);
    }
  });

  it('picks the mask with the lowest penalty', () => {
    const best = encodeQr(JOIN);
    const scores = [0, 1, 2, 3, 4, 5, 6, 7].map((mask) => qrPenalty(encodeQr(JOIN, { mask }).modules));
    expect(qrPenalty(best.modules)).toBe(Math.min(...scores));
  });

  it('UTF-8 text reads back', () => {
    const text = 'https://kpopquiz.org/u/민기?ref=share';
    expect(decode(encodeQr(text)).text).toBe(text);
  });

  it('the three finder patterns, the timing lines and the dark module are in place', () => {
    const qr = encodeQr(JOIN);
    const n = qr.size;
    const at = (x: number, y: number): boolean => (qr.modules[y] as boolean[])[x] === true;
    for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]] as const) {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3));
          expect(at(ox + x, oy + y), `finder ${ox},${oy} at ${x},${y}`).toBe(ring !== 2);
        }
      }
    }
    for (let i = 8; i < n - 8; i++) {
      expect(at(i, 6)).toBe(i % 2 === 0);
      expect(at(6, i)).toBe(i % 2 === 0);
    }
    expect(at(8, n - 8)).toBe(true);
    // Version 3: one alignment pattern, centred on 22, 22.
    expect(at(22, 22)).toBe(true);
    expect(at(21, 22)).toBe(false);
    expect(at(20, 22)).toBe(true);
  });

  it('is deterministic', () => {
    expect(encodeQr(JOIN).modules).toEqual(encodeQr(JOIN).modules);
  });

  it('refuses a text that does not fit version 10', () => {
    expect(() => encodeQr('x'.repeat(214))).toThrow(/do not fit/);
    expect(encodeQr('x'.repeat(213)).version).toBe(10);
  });

  it('an empty text is a valid symbol', () => {
    expect(decode(encodeQr('')).text).toBe('');
  });
});

describe('drawing', () => {
  const qr = encodeQr('https://kpopquiz.org/join/K7Q2PX');

  it('the path covers exactly the dark modules, shifted by the quiet zone', () => {
    const quiet = 4;
    const n = qrViewSize(qr, quiet);
    expect(n).toBe(29 + 8);
    const painted = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
    const re = /M(\d+) (\d+)h(\d+)v1h-(\d+)z/g;
    let m: RegExpExecArray | null;
    let consumed = 0;
    const d = qrPath(qr, quiet);
    while ((m = re.exec(d))) {
      consumed += m[0].length;
      const x = Number(m[1]);
      const y = Number(m[2]);
      const w = Number(m[3]);
      expect(Number(m[4])).toBe(w);
      for (let i = 0; i < w; i++) (painted[y] as boolean[])[x + i] = true;
    }
    expect(consumed).toBe(d.length);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const inside = x >= quiet && y >= quiet && x < n - quiet && y < n - quiet;
        const dark = inside && (qr.modules[y - quiet] as boolean[])[x - quiet] === true;
        expect((painted[y] as boolean[])[x]).toBe(dark);
      }
    }
  });

  it('svg and data url', () => {
    const svg = qrSvg(qr);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 37 37"')).toBe(true);
    expect(svg).toContain('shape-rendering="crispEdges"');
    const url = qrDataUrl('https://kpopquiz.org/join/K7Q2PX');
    expect(url.startsWith('data:image/svg+xml;utf8,')).toBe(true);
    expect(decodeURIComponent(url.slice('data:image/svg+xml;utf8,'.length))).toBe(svg);
  });
});
