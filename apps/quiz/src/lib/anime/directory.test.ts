// Run O1, lot (e) part 2 (E1a): the series directory of bunnyverse.org/anime lists the published series of the anime site.
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => { throw new Error('no network in a unit test'); } }));

import { loadSeriesDirectory, loadSeriesHubSlugs } from './directory';
import { FIXTURE_SLUGS, fakeDb, hubFromFixture } from './test-support';

const groupOf = (slug: (typeof FIXTURE_SLUGS)[number]) => hubFromFixture(slug).group;

describe('loadSeriesDirectory', () => {
  it('lists the 3 fixture series by name with their published quiz counts', async () => {
    const groups = FIXTURE_SLUGS.map(groupOf);
    const quizzes = groups.flatMap((g) => Array.from({ length: 5 }, () => ({ group_id: g.id })));
    const db = fakeDb({ series: { data: groups.map((g) => ({ group_id: g.id })) }, groups: { data: groups }, quizzes: { data: quizzes } });
    const rows = await loadSeriesDirectory(db);
    expect(rows.map((r) => r.group.name)).toEqual(['Death Note', 'One Piece', 'Spy x Family'].sort((a, b) => a.localeCompare(b, 'en')));
    expect(rows.every((r) => r.quizzes === 5)).toBe(true);
    expect([...new Set(db.calls)].sort()).toEqual(['groups', 'quizzes', 'series']);
  });

  it('leaves out a group with no published series row and a series with no quiz', async () => {
    const [a, b, c] = FIXTURE_SLUGS.map(groupOf);
    const db = fakeDb({
      series: { data: [{ group_id: a!.id }, { group_id: b!.id }] },
      groups: { data: [a, b, c] },
      quizzes: { data: [{ group_id: a!.id }, { group_id: c!.id }] },
    });
    const rows = await loadSeriesDirectory(db);
    expect(rows.map((r) => r.group.slug)).toEqual([a!.slug]);
  });

  it('throws when a read fails, so the failure is never cached', async () => {
    const db = fakeDb({ series: { data: [] }, groups: { error: { message: 'down' } }, quizzes: { data: [] } });
    await expect(loadSeriesDirectory(db)).rejects.toThrow(/groups: down/);
  });
});

describe('loadSeriesHubSlugs', () => {
  it('gives the quiz and trivia hub of every published series, sorted', async () => {
    const groups = FIXTURE_SLUGS.map(groupOf);
    const db = fakeDb({ series: { data: groups.map((g) => ({ group_id: g.id })) }, groups: { data: groups.map((g) => ({ id: g.id, slug: g.slug })) } });
    expect(await loadSeriesHubSlugs(db)).toEqual([
      'death-note-quiz', 'death-note-trivia', 'one-piece-quiz', 'one-piece-trivia', 'spy-x-family-quiz', 'spy-x-family-trivia',
    ]);
  });

  it('adds the Anime Mix hub when the site has that group, and skips a group with no published series', async () => {
    const [a] = FIXTURE_SLUGS.map(groupOf);
    const db = fakeDb({
      series: { data: [{ group_id: a!.id }] },
      groups: { data: [{ id: a!.id, slug: a!.slug }, { id: 900, slug: 'anime-mix' }, { id: 901, slug: 'draft-series' }] },
    });
    expect(await loadSeriesHubSlugs(db)).toEqual(['anime-mix-quiz', 'death-note-quiz', 'death-note-trivia']);
  });

  it('throws when a read fails', async () => {
    const db = fakeDb({ series: { error: { message: 'down' } }, groups: { data: [] } });
    await expect(loadSeriesHubSlugs(db)).rejects.toThrow(/series: down/);
  });
});
