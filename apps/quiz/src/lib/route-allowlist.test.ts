import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';
import { NOT_FOUND_REWRITE, isFilePath, isKnownRouteWith } from './route-allowlist';
import { legacyAnswer } from './seo/legacy-urls';

// Owner (2026-10-15): "Une URL inconnue doit répondre une vraie 404, plus jamais une
// redirection vers l'accueil." The middleware rewrites an unknown page path to
// NOT_FOUND_REWRITE (the site's not-found page, status 404) and hands an unknown file
// path to Next (the public/ file, or Next's own 404). These tests pin both halves.

const SITE_DIR = fileURLToPath(new URL('../app/(site)', import.meta.url));
const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));
const FLAGS = [{ v1: false, v12: false }, { v1: true, v12: false }, { v1: true, v12: true }];

describe('NOT_FOUND_REWRITE: a path only the group catch-all serves, and refuses', () => {
  const segment = NOT_FOUND_REWRITE.slice(1);

  it('is one segment without the -quiz or -trivia suffix, so [slug] calls notFound() and reads nothing', () => {
    expect(NOT_FOUND_REWRITE.startsWith('/')).toBe(true);
    expect(segment).toMatch(/^[a-z-]+$/);
    expect(segment.endsWith('-quiz')).toBe(false);
    expect(segment.endsWith('-trivia')).toBe(false);
  });

  it('no folder of app/(site) claims it, and the catch-all and its not-found page exist', () => {
    expect(existsSync(join(SITE_DIR, segment))).toBe(false);
    expect(existsSync(join(SITE_DIR, '[slug]', 'page.tsx'))).toBe(true);
    expect(existsSync(join(SITE_DIR, 'not-found.tsx'))).toBe(true);
  });

  it('is unknown in every flag state, so a direct hit is a 404 too', () => {
    for (const flags of FLAGS) expect(isKnownRouteWith(NOT_FOUND_REWRITE, flags), JSON.stringify(flags)).toBe(false);
  });

  it('no redirect, rewrite or legacy answer touches it', async () => {
    const redirects = await nextConfig.redirects!();
    const rewrites = await nextConfig.rewrites!();
    const list = Array.isArray(rewrites)
      ? rewrites
      : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? []), ...(rewrites.fallback ?? [])];
    for (const r of [...redirects, ...list]) expect(getPathMatch(r.source)(NOT_FOUND_REWRITE), r.source).toBe(false);
    expect(legacyAnswer(NOT_FOUND_REWRITE, true)).toBeNull();
  });
});

describe('isFilePath: an unknown file path goes on to Next', () => {
  it('names a file by the extension of its last segment', () => {
    for (const p of ['/site.webmanifest', '/fonts/Pretendard-Regular.woff2', '/fonts/Syne-Bold.ttf', '/.env',
      '/wp-login.php', '/_vercel/insights/script.js', '/feed.xml']) {
      expect(isFilePath(p), p).toBe(true);
    }
  });

  it('a page path is not a file, even with a dot higher up', () => {
    for (const p of ['/', '/zzz-totally-removed-xyz', '/random/deep/path', '/q', '/g', '/a.b/c', '/v1.0/x', '/bts.',
      '/which-bts-member-are-you', '/page-not-found']) {
      expect(isFilePath(p), p).toBe(false);
    }
  });

  it('every public/ file the middleware matcher still sees is served, never rewritten to the 404', () => {
    // The matcher skips these extensions; every other public file reaches the middleware.
    const skipped = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$/;
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((e) => (statSync(join(dir, e)).isDirectory() ? walk(join(dir, e)) : [join(dir, e)]));
    const seen = walk(PUBLIC_DIR).map((f) => `/${relative(PUBLIC_DIR, f)}`).filter((p) => !skipped.test(p));
    expect(seen).toContain('/site.webmanifest');
    for (const p of seen) {
      expect(isFilePath(p), p).toBe(true);
    }
  });
});
