// KpopCards launch (2026-11-23): what the KpopCards tab of the admin draws, for each answer of the database.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_QUERY } from '@/lib/cards/admin-stats';

import { CardsStatsView } from './cards-stats-admin';

import type { StatsAnswer, StatsRow } from '@/lib/cards/admin-stats';

vi.mock('next/navigation', () => ({ usePathname: () => '/admin' }));

const row = (o: Partial<StatsRow>): StatsRow => ({ username: 'alice', first_seen: '2026-10-01T08:00:00Z', last_seen: '2026-11-23T09:30:00Z', last_pack: '2026-11-23T09:00:00Z', level: 2, packs: 1234, packs_7d: 4,
  src_stock: 5, src_focus: 1, src_daily: 1, src_shards: 1, src_bonus: 1, src_ad: 0, golden: 2, guarantee: 1, cards: 12, cards_in_packs: 12, pct: 1.36, copies: 15, dupes: 3, shards: 20,
  ads: 3, crafted: 2, recycled: 7, ...o });
const data = (rows: StatsRow[], total = rows.length): StatsAnswer => ({
  totals: { players: 2, packs_total: 12345, packs_today: 1, packs_7d: 4, ads_total: 3, ads_today: 1, cards_in_packs: 886, avg_pct: 4.25 }, total, rows, limit: 50, offset: 0, at: 'x' });
const view = (result: Parameters<typeof CardsStatsView>[0]['result'], q = DEFAULT_QUERY): string => renderToStaticMarkup(h(CardsStatsView, { result, query: q }));

describe('the KpopCards tab', () => {
  it('says plainly that SQL 128 has to be applied, and shows no figure', () => {
    const out = view({ state: 'missing' });
    expect(out).toContain('data-testid="cards-stats-missing"');
    expect(out).toContain('SQL 128 has to be applied');
    expect(out).not.toContain('<table');
    expect(out).not.toContain('cards-stats-totals');
  });
  it('says when the database could not be read', () => {
    const out = view({ state: 'error' });
    expect(out).toContain('data-testid="cards-stats-error"');
    expect(out).not.toContain('SQL 128');
  });
  it('draws the totals, the filters, one row each, with the numbers formatted', () => {
    const out = view({ state: 'ready', data: data([row({}), row({ username: null, packs: 0, last_pack: null, pct: 0 })]) });
    expect(out).toContain('data-testid="cards-stats-totals"');
    for (const s of ['12,345', 'Players', 'Packs today', 'Ads watched', 'Cards in packs', '886', 'Average collection', '4.3%']) expect(out).toContain(s);
    expect(out).toContain('name="tab" value="cards-stats"');
    for (const n of ['name="q"', 'name="w"', 'name="ads"', 'name="min"']) expect(out).toContain(n);
    expect(out).toContain('>1,234<');
    expect(out).toContain('1.4%');
    expect(out).toContain('2026-11-23 09:00');
    expect(out).toContain('no nickname');
    expect(out).toContain('>never<');
    expect(out).toContain('href="/kpopcards/u/alice"');
    expect(out).toContain('2 players match');
    expect(out.match(/<tr/g)).toHaveLength(3);
  });
  it('draws nothing private: no e-mail, no birth date, no IP, no account id', () => {
    const out = view({ state: 'ready', data: data([row({})]) });
    expect(out).not.toMatch(/e-?mail|birth|\bIP\b|user_id|@/i);
  });
  it('marks the sorted column and links every heading', () => {
    const out = view({ state: 'ready', data: data([row({})]) }, { ...DEFAULT_QUERY, sort: 'packs', dir: 'desc' });
    expect(out).toMatch(/aria-sort="descending"[^>]*><a[^>]*href="\/admin\?tab=cards-stats&amp;sort=packs&amp;dir=asc"/);
    expect(out.match(/aria-sort="none"/g)).toHaveLength(22);
  });
  it('pages: the next link on the first page, both on a middle page, a note when nothing matches', () => {
    const rows = [row({})];
    const first = view({ state: 'ready', data: data(rows, 120) }, DEFAULT_QUERY);
    expect(first).toContain('1 to 1 of 120 players'.replace('1 to 1', '1 to 50')) ;
    expect(first).toContain('Page 1 of 3');
    expect(first).toContain('page=2');
    expect(first).not.toContain('rel="prev"');
    const mid = view({ state: 'ready', data: data(rows, 120) }, { ...DEFAULT_QUERY, page: 2 });
    expect(mid).toContain('rel="prev"');
    expect(mid).toContain('rel="next"');
    const none = view({ state: 'ready', data: data([], 0) });
    expect(none).toContain('No player matches these filters.');
    expect(none).not.toContain('<table');
  });
  it('keeps the filters in the fields and the links', () => {
    const out = view({ state: 'ready', data: data([row({})], 3) }, { ...DEFAULT_QUERY, q: 'ali', window: '7d', ads: 'yes', min: 2, sort: 'cards', dir: 'asc' });
    expect(out).toContain('value="ali"');
    expect(out).toMatch(/<option value="7d" selected/);
    expect(out).toMatch(/<option value="yes" selected/);
    expect(out).toContain('value="2"');
    expect(out).toContain('q=ali&amp;w=7d&amp;ads=yes&amp;min=2');
  });
});
