// P5, CR-025, link 3, the Kpopdle result screen: "Quiz TWICE" and "Blind test TWICE", the target's group, in English and French. The blind test link exists only for a group whose playlist can be played
// (the rule of /blindtest/group-{slug}: ROUND_SIZE clean active songs), so it never leads to a page answering 404. The hub is closed with dailyGuess as a whole; the group page side is passerelles.test.ts.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { ROUND_SIZE } from '@/lib/blind-test-playlists';

import { dleCopy } from '../dle/copy';
import { blindLinksOf, readBlindtestSlugs } from '../dle/read';

import type { DleLocale } from '../dle/types';

vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'dm-sans-var' }, dmMono: { variable: 'dm-mono-var' } }));
vi.mock('@/components/hub/dle/dle-font', () => ({ dleMarquee: { variable: 'marquee-var' } }));

const LOCALES: readonly DleLocale[] = ['en', 'fr'];
const app = (rel: string): string => readFileSync(new URL(`../../${rel}`, import.meta.url), 'utf8');

/** A PostgREST builder that remembers its filters and answers `range` with the rows of its table. */
function fakeDb(tables: Record<string, unknown[]>) {
  const calls: { table: string; filters: string[] }[] = [];
  return {
    calls,
    from(table: string) {
      const rec = { table, filters: [] as string[] };
      calls.push(rec);
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'not', 'order']) b[m] = (...a: unknown[]) => { rec.filters.push(`${m}:${a.map(String).join(',')}`); return b; };
      b.range = async (from: number, to: number) => ({ data: (tables[table] ?? []).slice(from, to + 1), error: null });
      return b;
    },
  };
}

const songs = (groupId: number, n: number): unknown[] => Array.from({ length: n }, (_, i) => ({ id: groupId * 1000 + i, group_id: groupId }));

describe('the playable blind tests of the K-pop groups (readBlindtestSlugs)', () => {
  it('a group appears from ROUND_SIZE clean songs, and not below', async () => {
    expect(ROUND_SIZE).toBe(10);
    const db = fakeDb({
      groups: [{ id: 1, name: 'TWICE', slug: 'twice' }, { id: 2, name: 'NewGroup', slug: 'newgroup' }, { id: 3, name: 'BTS', slug: 'bts' }],
      songs: [...songs(1, 10), ...songs(2, 9), ...songs(3, 40)],
    });
    expect(await readBlindtestSlugs(db)).toEqual({ TWICE: 'twice', BTS: 'bts' });
  });
  it('the reads are KpopQuiz\'s own, the clean-song rule of the blind test, ordered for the pages', async () => {
    const db = fakeDb({ groups: [], songs: [] });
    await readBlindtestSlugs(db);
    const s = db.calls.find((c) => c.table === 'songs')!.filters;
    expect(s).toContain('eq:site_id,kpop');
    expect(s).toContain('eq:status,active');
    for (const w of ['remix', 'instrumental', 'inst.', 'karaoke']) expect(s).toContain(`not:title,ilike,%${w}%`);
    expect(s.some((f) => f.startsWith('order:id,'))).toBe(true);
    expect(db.calls.find((c) => c.table === 'groups')!.filters).toContain('eq:site_id,kpop');
  });
  it('counts past the 1000-row cap (the paginator, not one capped read)', async () => {
    const db = fakeDb({ groups: [{ id: 7, name: 'Big', slug: 'big' }], songs: songs(7, 2500) });
    expect(await readBlindtestSlugs(db)).toEqual({ Big: 'big' });
  });
  it('an error throws (the caller turns it into no link)', async () => {
    const db = { from: () => { const b: Record<string, unknown> = {}; for (const m of ['select', 'eq', 'not', 'order']) b[m] = () => b; b.range = async () => ({ data: null, error: { message: 'boom' } }); return b; } };
    await expect(readBlindtestSlugs(db)).rejects.toThrow(/boom/);
  });
  it('blindLinksOf: the address on KpopQuiz, a name it does not know gets none', () => {
    expect(blindLinksOf(['TWICE', 'Ghost'], { TWICE: 'twice' })).toEqual({ TWICE: 'https://kpopquiz.org/blindtest/group-twice' });
    expect(blindLinksOf(['TWICE'], {})).toEqual({});
  });
});

describe('the result screen of a Kpopdle game, EN and FR (DleAfter)', () => {
  const render = async (l: DleLocale, quiz?: string, blind?: string): Promise<string> => {
    const { DleAfter } = await import('@/components/hub/dle/dle-game');
    return renderToStaticMarkup(createElement(DleAfter, { locale: l, game: 'kpopdle-idol', quizHref: quiz, blindHref: blind, parentLabel: 'TWICE', kpopName: 'KpopQuiz', allDone: false, clockText: '01:02:03' }));
  };
  const hrefs = (s: string): string[] => [...s.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]!);
  const QUIZ = 'https://kpopquiz.org/twice-quiz';
  const BLIND = 'https://kpopquiz.org/blindtest/group-twice';

  it('the words: "TWICE quiz" and "TWICE blind test", "Quiz TWICE" and "Blind test TWICE" in French', () => {
    expect(dleCopy('en').quizOf('TWICE')).toBe('TWICE quiz');
    expect(dleCopy('en').blindOf('TWICE')).toBe('TWICE blind test');
    expect(dleCopy('fr').quizOf('TWICE')).toBe('Quiz TWICE');
    expect(dleCopy('fr').blindOf('TWICE')).toBe('Blind test TWICE');
  });
  for (const l of LOCALES) {
    it(`${l}: both gateways, each a real link to its page on KpopQuiz, after the next-game button`, async () => {
      const out = await render(l, QUIZ, BLIND);
      const t = dleCopy(l);
      expect(hrefs(out)).toContain(QUIZ);
      expect(hrefs(out)).toContain(BLIND);
      expect(out).toContain(`<strong>${t.quizOf('TWICE')}</strong>`);
      expect(out).toContain(`<strong>${t.blindOf('TWICE')}</strong>`);
      expect(out).toContain(t.onKpopQuiz);
      expect(out.indexOf(QUIZ)).toBeLessThan(out.indexOf(BLIND));
      expect(out).not.toMatch(/[\u2013\u2014]/);
    });
    it(`${l}: no blind test link for a group with no playable playlist, the quiz link stays`, async () => {
      const out = await render(l, QUIZ, undefined);
      expect(hrefs(out)).toContain(QUIZ);
      expect(out).not.toContain('/blindtest/');
      expect(out).not.toContain(dleCopy(l).blindOf('TWICE'));
    });
    it(`${l}: neither link, no gateways block at all`, async () => {
      const out = await render(l);
      expect(out).not.toContain('hub-dle-gateways');
    });
  }
  it('the page reads the playlists for the K-pop world only, and hands the links to the game', () => {
    const page = app('components/hub/dle/dle-game-page.tsx');
    expect(page).toContain("world.universe === 'kpop' ? getBlindtestSlugs() : Promise.resolve({})");
    expect(page).toContain("const blindLinks = world.universe === 'kpop' ? blindLinksOf(groupNames, blindSlugs) : {};");
    expect(page).toContain('blindLinks={blindLinks}');
    const game = app('components/hub/dle/dle-game.tsx');
    expect(game).toContain('const blindHref = targetParent ? blindLinks?.[targetParent] : undefined;');
    expect(game).toContain('blindHref={blindHref}');
  });
});
