import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Next merges metadata shallowly: an openGraph object without `images` drops the root
// layout's default picture (owner, 2026-10-13: SEO; 36 pages were shared with none).
// Every openGraph object under src/app and src/components carries an image.

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

function openGraphBlocks(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/openGraph:\s*\{/g)) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 1;
    while (depth > 0 && i < src.length) {
      if (src[i] === '{') depth += 1;
      else if (src[i] === '}') depth -= 1;
      i += 1;
    }
    out.push(src.slice(m.index, i));
  }
  return out;
}

describe('every openGraph object has an image', () => {
  it('src/app and src/components', () => {
    const root = join(__dirname, '../..');
    const missing: string[] = [];
    for (const f of [...files(join(root, 'app')), ...files(join(root, 'components'))]) {
      for (const block of openGraphBlocks(readFileSync(f, 'utf8'))) {
        if (!/\bimages\b/.test(block)) missing.push(f.slice(root.length));
      }
    }
    expect(missing).toEqual([]);
  });
});
