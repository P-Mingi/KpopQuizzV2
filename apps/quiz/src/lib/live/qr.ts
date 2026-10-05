// A small QR Code encoder (ISO/IEC 18004, model 2). The repo has no QR generator
// and the V12 run adds no dependency, so this is hand-rolled and unit tested
// (qr.test.ts decodes what it encodes and checks the error correction).
//
// Scope, on purpose: byte mode (UTF-8), versions 1 to 10, the four error
// correction levels, the eight masks with the standard penalty score. Version 10
// holds 213 bytes at level M, far more than a join link, a share link or a
// profile link needs. A longer text throws.
//
// Pure and dependency free: it runs in the browser (the host screen draws the
// code client side), on the server and in tests.
//
// Users: the live lobby (components/live), and through `qrDataUrl()` any caller of
// A1's story image (`storyCardFile({ qr })`) or share kit.

export type QrLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrCode {
  version: number;
  level: QrLevel;
  mask: number;
  /** Modules per side: 17 + 4 x version. */
  size: number;
  /** `modules[y][x]` is true for a dark module. No quiet zone. */
  modules: boolean[][];
}

const MAX_VERSION = 10;

// Per version (index) and level: [ec codewords per block, blocks of group 1, data
// codewords of a group 1 block, blocks of group 2, data codewords of a group 2 block].
type Blocks = readonly [number, number, number, number, number];
const EC_TABLE: Record<QrLevel, readonly Blocks[]> = {
  L: [[0, 0, 0, 0, 0], [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0], [18, 2, 68, 2, 69]],
  M: [[0, 0, 0, 0, 0], [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44]],
  Q: [[0, 0, 0, 0, 0], [13, 1, 13, 0, 0], [22, 1, 22, 0, 0], [18, 2, 17, 0, 0], [26, 2, 24, 0, 0], [18, 2, 15, 2, 16],
    [24, 4, 19, 0, 0], [18, 2, 14, 4, 15], [22, 4, 18, 2, 19], [20, 4, 16, 4, 17], [24, 6, 19, 2, 20]],
  H: [[0, 0, 0, 0, 0], [17, 1, 9, 0, 0], [28, 1, 16, 0, 0], [22, 2, 13, 0, 0], [16, 4, 9, 0, 0], [22, 2, 11, 2, 12],
    [28, 4, 15, 0, 0], [26, 4, 13, 1, 14], [26, 4, 14, 2, 15], [24, 4, 12, 4, 13], [28, 6, 15, 2, 16]],
};

/** Centres of the alignment patterns, per version. */
const ALIGNMENT: readonly (readonly number[])[] = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
];

const FORMAT_BITS: Record<QrLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

export function qrBlocks(version: number, level: QrLevel): Blocks {
  const b = EC_TABLE[level][version];
  if (!b) throw new Error(`qr: no version ${version}`);
  return b;
}

/** Data codewords a version holds at a level. */
export function qrDataCapacity(version: number, level: QrLevel): number {
  const [, n1, d1, n2, d2] = qrBlocks(version, level);
  return n1 * d1 + n2 * d2;
}

/** Bytes of text a version holds in byte mode (mode and length header taken off). */
export function qrByteCapacity(version: number, level: QrLevel): number {
  const headerBits = 4 + (version < 10 ? 8 : 16);
  return Math.floor((qrDataCapacity(version, level) * 8 - headerBits) / 8);
}

// ---------------------------------------------------------------------------
// Reed-Solomon over GF(256), primitive polynomial x^8 + x^4 + x^3 + x^2 + 1.
// ---------------------------------------------------------------------------

function gfMul(a: number, b: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((b >>> i) & 1) * a;
  }
  return z & 0xff;
}

/** Coefficients of the generator polynomial of `degree`, highest power first, leading 1 left out. */
function rsDivisor(degree: number): number[] {
  const out: number[] = new Array<number>(degree).fill(0);
  out[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      out[j] = gfMul(out[j] ?? 0, root);
      if (j + 1 < degree) out[j] = (out[j] ?? 0) ^ (out[j + 1] ?? 0);
    }
    root = gfMul(root, 2);
  }
  return out;
}

/** The error correction codewords of one block. */
export function rsRemainder(data: readonly number[], degree: number): number[] {
  const divisor = rsDivisor(degree);
  const out: number[] = new Array<number>(degree).fill(0);
  for (const b of data) {
    const factor = b ^ (out.shift() ?? 0);
    out.push(0);
    for (let i = 0; i < degree; i++) out[i] = (out[i] ?? 0) ^ gfMul(divisor[i] ?? 0, factor);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Data: text to codewords.
// ---------------------------------------------------------------------------

function utf8(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

/** Byte mode segment, terminator, padding: the data codewords of `version`. */
function dataCodewords(bytes: readonly number[], version: number, level: QrLevel): number[] {
  const capacity = qrDataCapacity(version, level);
  const bits: number[] = [];
  const push = (value: number, length: number): void => {
    for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const total = capacity * 8;
  push(0, Math.min(4, total - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | (bits[i + j] ?? 0);
    out.push(v);
  }
  for (let pad = 0xec; out.length < capacity; pad ^= 0xec ^ 0x11) out.push(pad);
  return out;
}

/** Split into blocks, add error correction, interleave: the codewords in drawing order. */
function interleave(data: readonly number[], version: number, level: QrLevel): number[] {
  const [ec, n1, d1, n2, d2] = qrBlocks(version, level);
  const blocks: number[][] = [];
  const ecBlocks: number[][] = [];
  let at = 0;
  for (let i = 0; i < n1 + n2; i++) {
    const len = i < n1 ? d1 : d2;
    const block = data.slice(at, at + len);
    at += len;
    blocks.push(block);
    ecBlocks.push(rsRemainder(block, ec));
  }
  const out: number[] = [];
  const longest = Math.max(d1, d2);
  for (let i = 0; i < longest; i++) for (const b of blocks) if (i < b.length) out.push(b[i] ?? 0);
  for (let i = 0; i < ec; i++) for (const b of ecBlocks) out.push(b[i] ?? 0);
  return out;
}

// ---------------------------------------------------------------------------
// Matrix.
// ---------------------------------------------------------------------------

interface Grid {
  size: number;
  dark: boolean[][];
  /** Function modules: never data, never masked. */
  fixed: boolean[][];
}

function emptyGrid(size: number): Grid {
  const make = (): boolean[][] => Array.from({ length: size }, () => new Array<boolean>(size).fill(false));
  return { size, dark: make(), fixed: make() };
}

function setFixed(g: Grid, x: number, y: number, dark: boolean): void {
  if (x < 0 || y < 0 || x >= g.size || y >= g.size) return;
  (g.dark[y] as boolean[])[x] = dark;
  (g.fixed[y] as boolean[])[x] = true;
}

function drawFinder(g: Grid, cx: number, cy: number): void {
  for (let dy = -4; dy <= 4; dy++) {
    for (let dx = -4; dx <= 4; dx++) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      setFixed(g, cx + dx, cy + dy, dist !== 2 && dist !== 4);
    }
  }
}

function drawAlignment(g: Grid, cx: number, cy: number): void {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) setFixed(g, cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
}

/** The 15 format bits (level and mask) with their BCH code, masked with 0x5412. */
export function qrFormatBits(level: QrLevel, mask: number): number {
  const data = (FORMAT_BITS[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

/** The 18 version bits (versions 7 and up) with their BCH code. */
export function qrVersionBits(version: number): number {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

function drawFormat(g: Grid, level: QrLevel, mask: number): void {
  const bits = qrFormatBits(level, mask);
  const bit = (i: number): boolean => ((bits >>> i) & 1) === 1;
  const n = g.size;
  for (let i = 0; i <= 5; i++) setFixed(g, 8, i, bit(i));
  setFixed(g, 8, 7, bit(6));
  setFixed(g, 8, 8, bit(7));
  setFixed(g, 7, 8, bit(8));
  for (let i = 9; i < 15; i++) setFixed(g, 14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) setFixed(g, n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) setFixed(g, 8, n - 15 + i, bit(i));
  setFixed(g, 8, n - 8, true);
}

function drawVersion(g: Grid, version: number): void {
  if (version < 7) return;
  const bits = qrVersionBits(version);
  for (let i = 0; i < 18; i++) {
    const dark = ((bits >>> i) & 1) === 1;
    const a = g.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFixed(g, a, b, dark);
    setFixed(g, b, a, dark);
  }
}

function drawFunctionPatterns(g: Grid, version: number, level: QrLevel): void {
  const n = g.size;
  for (let i = 0; i < n; i++) {
    setFixed(g, 6, i, i % 2 === 0);
    setFixed(g, i, 6, i % 2 === 0);
  }
  drawFinder(g, 3, 3);
  drawFinder(g, n - 4, 3);
  drawFinder(g, 3, n - 4);
  const centres = ALIGNMENT[version] ?? [];
  const last = centres.length - 1;
  centres.forEach((cy, i) => {
    centres.forEach((cx, j) => {
      // The three corners that hold a finder pattern have no alignment pattern.
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      drawAlignment(g, cx, cy);
    });
  });
  drawFormat(g, level, 0);
  drawVersion(g, version);
}

function drawCodewords(g: Grid, codewords: readonly number[]): void {
  const n = g.size;
  let i = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? n - 1 - vert : vert;
        if ((g.fixed[y] as boolean[])[x]) continue;
        if (i < codewords.length * 8) {
          (g.dark[y] as boolean[])[x] = (((codewords[i >>> 3] ?? 0) >>> (7 - (i & 7))) & 1) === 1;
          i++;
        }
        // Remainder bits (versions 2 to 6 have seven) stay light, as the standard says.
      }
    }
  }
}

/** True when mask `mask` flips the module at x, y. */
export function qrMaskBit(mask: number, x: number, y: number): boolean {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

function applyMask(g: Grid, mask: number): void {
  for (let y = 0; y < g.size; y++) {
    const row = g.dark[y] as boolean[];
    const fixed = g.fixed[y] as boolean[];
    for (let x = 0; x < g.size; x++) if (!fixed[x] && qrMaskBit(mask, x, y)) row[x] = !row[x];
  }
}

/** The standard's penalty score of a finished symbol: lower reads better. */
export function qrPenalty(modules: readonly (readonly boolean[])[]): number {
  const n = modules.length;
  const at = (x: number, y: number): boolean => (modules[y] as readonly boolean[])[x] === true;
  let score = 0;
  // Rule 1: runs of five or more of one colour, in rows and in columns.
  for (let dir = 0; dir < 2; dir++) {
    for (let a = 0; a < n; a++) {
      let run = 1;
      for (let b = 1; b <= n; b++) {
        const same = b < n && (dir === 0 ? at(b, a) === at(b - 1, a) : at(a, b) === at(a, b - 1));
        if (same) { run++; continue; }
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
  }
  // Rule 2: 2 x 2 blocks of one colour.
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      const c = at(x, y);
      if (c === at(x + 1, y) && c === at(x, y + 1) && c === at(x + 1, y + 1)) score += 3;
    }
  }
  // Rule 3: the finder-like pattern 1:1:3:1:1 with four light modules on one side.
  const A = [true, false, true, true, true, false, true, false, false, false, false];
  const B = [false, false, false, false, true, false, true, true, true, false, true];
  for (let dir = 0; dir < 2; dir++) {
    for (let a = 0; a < n; a++) {
      for (let b = 0; b + 11 <= n; b++) {
        let isA = true;
        let isB = true;
        for (let k = 0; k < 11 && (isA || isB); k++) {
          const v = dir === 0 ? at(b + k, a) : at(a, b + k);
          if (v !== A[k]) isA = false;
          if (v !== B[k]) isB = false;
        }
        if (isA) score += 40;
        if (isB) score += 40;
      }
    }
  }
  // Rule 4: how far the share of dark modules is from one half.
  let dark = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (at(x, y)) dark++;
  const percent = (dark * 100) / (n * n);
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

export interface QrOptions {
  /** Error correction: M by default (15% of the code can be damaged). */
  level?: QrLevel | undefined;
  /** Force a mask (0 to 7); the best one is picked when absent. */
  mask?: number | undefined;
  /** Smallest version to use (1 to 10). */
  minVersion?: number | undefined;
}

/** Encode `text` (UTF-8, byte mode). Throws when it does not fit in version 10. */
export function encodeQr(text: string, options: QrOptions = {}): QrCode {
  const level = options.level ?? 'M';
  const bytes = utf8(text);
  let version = Math.max(1, Math.min(MAX_VERSION, Math.trunc(options.minVersion ?? 1)));
  while (version <= MAX_VERSION && qrByteCapacity(version, level) < bytes.length) version++;
  if (version > MAX_VERSION) throw new Error(`qr: ${bytes.length} bytes do not fit (version ${MAX_VERSION}, level ${level})`);

  const codewords = interleave(dataCodewords(bytes, version, level), version, level);
  const size = 17 + 4 * version;
  const base = emptyGrid(size);
  drawFunctionPatterns(base, version, level);
  drawCodewords(base, codewords);

  const forced = options.mask;
  const candidates = forced !== undefined && forced >= 0 && forced <= 7 ? [Math.trunc(forced)] : [0, 1, 2, 3, 4, 5, 6, 7];
  let best: { mask: number; score: number; modules: boolean[][] } | null = null;
  for (const mask of candidates) {
    const g: Grid = { size, dark: base.dark.map((r) => [...r]), fixed: base.fixed };
    applyMask(g, mask);
    drawFormat(g, level, mask);
    const score = qrPenalty(g.dark);
    if (!best || score < best.score) best = { mask, score, modules: g.dark };
  }
  const picked = best as { mask: number; score: number; modules: boolean[][] };
  return { version, level, mask: picked.mask, size, modules: picked.modules };
}

// ---------------------------------------------------------------------------
// Drawing.
// ---------------------------------------------------------------------------

/**
 * One SVG path for the dark modules, on a grid of `size + 2 x quiet` units (the
 * quiet zone is the light margin a reader needs: 4 by the standard). Use with
 * `viewBox="0 0 n n"`, n = `qrViewSize(qr, quiet)`, and `shape-rendering="crispEdges"`.
 */
export function qrPath(qr: QrCode, quiet = 4): string {
  let d = '';
  for (let y = 0; y < qr.size; y++) {
    const row = qr.modules[y] as boolean[];
    for (let x = 0; x < qr.size; x++) {
      if (!row[x]) continue;
      let w = 1;
      while (x + w < qr.size && row[x + w]) w++;
      d += `M${x + quiet} ${y + quiet}h${w}v1h-${w}z`;
      x += w - 1;
    }
  }
  return d;
}

export function qrViewSize(qr: QrCode, quiet = 4): number {
  return qr.size + quiet * 2;
}

/** A complete SVG document: dark modules on a light ground. */
export function qrSvg(qr: QrCode, opts: { quiet?: number; dark?: string; light?: string } = {}): string {
  const quiet = opts.quiet ?? 4;
  const n = qrViewSize(qr, quiet);
  const dark = opts.dark ?? '#000000';
  const light = opts.light ?? '#ffffff';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges">`
    + `<rect width="${n}" height="${n}" fill="${light}"/><path fill="${dark}" d="${qrPath(qr, quiet)}"/></svg>`;
}

/**
 * The code of `text` as an SVG data URL: a picture any <img>, canvas `drawImage`
 * or A1's `storyCardFile({ qr })` can take.
 */
export function qrDataUrl(text: string, options: QrOptions & { quiet?: number } = {}): string {
  const { quiet, ...rest } = options;
  return `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg(encodeQr(text, rest), quiet === undefined ? {} : { quiet }))}`;
}
