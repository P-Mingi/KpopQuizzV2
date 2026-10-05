import { describe, expect, it } from 'vitest';

import { claimReload, isChunkLoadError, RELOAD_WINDOW_MS } from './chunk-reload';

function memStore(): { getItem(k: string): string | null; setItem(k: string, v: string): void } {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
}

describe('isChunkLoadError', () => {
  it('knows the Turbopack error Firefox raised on /blindtest/kpop-demon-hunters', () => {
    const e = new Error('Failed to load chunk /_next/static/chunks/0ia3tj7iv_-re.js from module 998296');
    e.name = 'ChunkLoadError';
    expect(isChunkLoadError(e)).toBe(true);
  });
  it('knows the webpack and ES import variants', () => {
    expect(isChunkLoadError(new Error('Loading chunk 123 failed.'))).toBe(true);
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module: http://x/a.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: http://x/a.js'))).toBe(true);
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
  });
  it('leaves every other error to the error screen', () => {
    expect(isChunkLoadError(new TypeError('q.reveal is undefined'))).toBe(false);
    expect(isChunkLoadError(new Error('Failed to fetch'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError('ChunkLoadError')).toBe(false);
  });
});

describe('claimReload', () => {
  it('reloads once per path, then shows the error (no loop)', () => {
    const s = memStore();
    expect(claimReload(s, '/blindtest/kpop-demon-hunters', 1000)).toBe(true);
    expect(claimReload(s, '/blindtest/kpop-demon-hunters', 2000)).toBe(false);
    expect(claimReload(s, '/blindtest/5th-gen', 2500)).toBe(true);
  });
  it('may reload the same path again after the window', () => {
    const s = memStore();
    expect(claimReload(s, '/blindtest', 0)).toBe(true);
    expect(claimReload(s, '/blindtest', RELOAD_WINDOW_MS + 1)).toBe(true);
  });
  it('never reloads without a working store', () => {
    expect(claimReload(null, '/blindtest', 0)).toBe(false);
    const broken = { getItem: (): string | null => { throw new Error('SecurityError'); }, setItem: (): void => { throw new Error('SecurityError'); } };
    expect(claimReload(broken, '/blindtest', 0)).toBe(false);
    const dropping = { getItem: (): string | null => null, setItem: (): void => {} };
    expect(claimReload(dropping, '/blindtest', 0)).toBe(false);
  });
  it('reads a garbled record as no record', () => {
    const s = memStore();
    s.setItem('kq-chunk-reload', '{not json');
    expect(claimReload(s, '/blindtest', 0)).toBe(true);
    expect(claimReload(s, '/blindtest', 1)).toBe(false);
  });
});
