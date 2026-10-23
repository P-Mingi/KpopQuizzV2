import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Run O1, lane O2: the series art reaches the shared components only through the SERIES_ART slot of lib/ux-v1/a0/group-photos.ts, which the
// anime-only components/anime/register-art.tsx fills (the anime layout imports it, and mounts components/anime/art-registry.tsx for
// the client graph). The kpop build must load the chunks it loaded before the art, so nothing the kpop pages import may name the
// art, its helpers or its CSS, not even lazily, and nothing on kpop may fill the slot.

const SRC = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name);
    if (statSync(f).isDirectory()) walk(f, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name)) out.push(f);
  }
  return out;
}

// Where the art may be named: the anime-only components, the anime lib and the pages of app/sites/ (the kpop pages under
// app/(site) are not on this list).
const ART_MODULE = /from\s+['"](?:@\/components\/anime\/|@\/lib\/anime\/series-art|\.{1,2}\/(?:[\w./-]*\/)?(?:series-art|series-cover|register-art|art-registry|dress-quiz-card))|import\(\s*['"][^'"]*(?:series-art|series-cover|register-art|art-registry|dress-quiz-card)['"]|import\s+['"][^'"]*(?:register-art|art-registry)['"]/;
const ART_CSS = /anime-o2-art|sites\/anime\/o2\.css/;
const ALLOWED = (file: string): boolean => {
  const rel = relative(SRC, file);
  return rel.startsWith('components/anime/') || rel.startsWith('lib/anime/') || rel.startsWith('app/sites/');
};
const read = (rel: string): string => readFileSync(join(SRC, rel), 'utf8');

describe('the series art stays out of the shared components', () => {
  it('no file outside the anime-only code imports the art module, the registrar or the series cover', () => {
    const offenders = walk(SRC).filter((f) => !ALLOWED(f) && ART_MODULE.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('the shared files that name the art classes read the art from the SERIES_ART slot of group-photos.ts', () => {
    const named = walk(SRC).filter((f) => !ALLOWED(f) && ART_CSS.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f)).sort();
    expect(named).toEqual([
      'components/home/ux-v1/groups-rail.tsx',
      'components/home/ux-v1/quiz-rows.tsx',
      'components/quizzes/ux-v1/results.tsx',
      'components/search/ux-v1/search-results.tsx',
    ]);
    for (const f of named) expect(read(f)).toMatch(/import \{[^}]*\bSERIES_ART\b[^}]*\} from '@\/lib\/ux-v1\/a0\/group-photos'/);
  });

  it('only the anime layout and the anime registrar fill the slot', () => {
    const fillers = walk(SRC).filter((f) => /\bSERIES_ART\.(avatar|dress)\s*=[^=]/.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f));
    expect(fillers).toEqual(['components/anime/register-art.tsx']);
    const importers = walk(SRC).filter((f) => /import\s+['"]@\/components\/anime\/register-art['"]|from\s+['"]\.\/register-art['"]|import\s+['"]\.\/register-art['"]/.test(readFileSync(f, 'utf8'))).map((f) => relative(SRC, f)).sort();
    expect(importers).toEqual(['app/sites/[site]/layout.tsx', 'components/anime/art-registry.tsx']);
  });

  it('the anime layout mounts the client registrar before the shell', () => {
    const layout = read('app/sites/[site]/layout.tsx');
    expect(layout).toContain("import { ArtRegistry } from '@/components/anime/art-registry'");
    expect(layout.indexOf('<ArtRegistry />')).toBeGreaterThan(layout.indexOf('<>'));
    expect(layout.indexOf('<ArtRegistry />')).toBeLessThan(layout.indexOf('<UxShell>'));
    expect(layout.indexOf('<ArtRegistry />')).toBeLessThan(layout.indexOf('application/ld+json'));
    expect(read('components/anime/art-registry.tsx').startsWith("'use client';")).toBe(true);
  });
});

describe('the slot', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('is empty on kpop', async () => {
    const { SERIES_ART } = await import('@/lib/ux-v1/a0/group-photos');
    expect(SERIES_ART).toEqual({ avatar: null, dress: null });
  });

  it('is filled by the registrar with the art of a series and the dressing of a card', async () => {
    const { SERIES_ART } = await import('@/lib/ux-v1/a0/group-photos');
    await import('./anime/register-art');
    const art = renderToStaticMarkup(SERIES_ART.avatar!('death-note', 'Death Note'));
    expect(art).toContain('anime-o2-art-avatar');
    expect(art).toContain('>DN<');
    expect(SERIES_ART.dress).toBeTypeOf('function');
  });

  it('leaves a card with a picture of its own, and anything it does not know, as it is', async () => {
    await import('./anime/register-art');
    const { UxQuizCard } = await import('@/components/ux-v1/quiz-card');
    const { SERIES_ART } = await import('@/lib/ux-v1/a0/group-photos');
    const quiz = { slug: 's', title: 'T', group_name: 'BTS', group_slug: 'bts', quiz_type: 'multiple_choice', difficulty: 'easy', play_count: 1, cover_image_url: null } as const;
    const withPhoto = renderToStaticMarkup(h(UxQuizCard, { quiz }));
    expect(withPhoto).not.toContain('anime-o2-art');
    const odd = h('p', null, 'x');
    expect(SERIES_ART.dress!(odd, quiz)).toBe(odd);
  });
});
