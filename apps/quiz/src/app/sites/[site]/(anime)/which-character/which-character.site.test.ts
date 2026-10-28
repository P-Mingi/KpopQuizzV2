// Run O1, lane PERS: the page /which-{series}-character-are-you of the anime build (internal route /which-character/<series>), with a
// quiz and without one. The data layer is faked at lib/personality/data; the page, the view builder, the quiz component and the
// about block are the real ones, so what is checked is what a reader gets.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isKnownRouteFor } from '@/lib/site/routing';

import type { SeriesWmaData } from '@/lib/personality/data';
import type { Axes } from '@/lib/personality/engine';

const data = vi.hoisted(() => ({ series: null as unknown }));
const groups = vi.hoisted(() => ({ rows: [{ slug: 'death-note', name: 'Death Note' }, { slug: 'attack-on-titan', name: 'Attack on Titan' }, { slug: 'naruto', name: 'Naruto' }] as Array<{ slug: string; name: string }> }));
vi.mock('@/lib/personality/data', () => ({
  getSeriesWmaData: async () => data.series,
  getWmaData: async () => data.series,
  getMemberCounts: async () => null,
  getBridgeCounts: async () => null,
  getBridgeGroups: async () => [],
  getWmaGroupSlugs: async () => ['attack-on-titan', 'death-note'],
}));
vi.mock('@/lib/ux-v1/p6/hub-data', () => ({
  getPlayableGroups: async () => [],
  settle: async <T>(read: () => Promise<T>, fallback: T) => {
    try { return { value: await read(), ok: true }; } catch { return { value: fallback, ok: false }; }
  },
}));
vi.mock('@/lib/db/queries/groups', () => ({ getAllGroups: async () => groups.rows }));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => true }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('404'); }, redirect: () => { throw new Error('redirect'); }, usePathname: () => '/which-death-note-character-are-you' }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => null, refreshUxMe: () => {} }));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => () => {} }));
vi.mock('@/components/ux-v1/toast', () => ({ useAnnounce: () => () => {}, useUxToast: () => () => {} }));

afterEach(() => {
  vi.unstubAllEnvs(); vi.resetModules(); data.series = null;
  groups.rows = [{ slug: 'death-note', name: 'Death Note' }, { slug: 'attack-on-titan', name: 'Attack on Titan' }, { slug: 'naruto', name: 'Naruto' }];
});

const AX = (energy: number): Axes => ({ energy, chaos: 50, care: 50, craft: 50, heart: 50, spotlight: 50 });
const question = (n: number): { text: string; options: Array<{ text: string; weights: Record<string, number> }> } => ({
  text: `Question ${n}?`,
  options: [
    { text: 'Quiet answer', weights: { energy: 0 } }, { text: 'Loud answer', weights: { energy: 5 } },
    { text: 'Calm answer', weights: { chaos: 0 } }, { text: 'Wild answer', weights: { chaos: 5 } },
  ],
});
const SERIES: SeriesWmaData = {
  group: { id: 7, slug: 'death-note', name: 'Death Note', fandom: null },
  questions: [1, 2, 3, 4, 5, 6, 7, 8].map(question),
  profiles: [
    { id: 'light-yagami', name: 'Light Yagami', axes: AX(60), lines: ['You plan ahead.', 'You keep a calm face.'], role: 'main', affiliation: 'Yagami family' },
    { id: 'l', name: 'L', axes: AX(10), lines: ['You crouch on chairs.'], role: 'main', affiliation: 'Kira investigation team' },
    { id: 'ryuk', name: 'Ryuk', axes: AX(30), lines: ['You watch from the edge.'], role: 'supporting', affiliation: 'Shinigami' },
    { id: 'soichiro-yagami', name: 'Soichiro Yagami', axes: AX(55), lines: ['You carry it quietly.'], role: 'supporting', affiliation: 'National Police Agency' },
    { id: 'touta-matsuda', name: 'Touta Matsuda', axes: AX(90), lines: ['You walk in smiling.'], role: 'supporting', affiliation: 'National Police Agency' },
    { id: 'kanzo-mogi', name: 'Kanzo Mogi', axes: AX(5), lines: ['You notice a lot.'], role: 'supporting', affiliation: 'National Police Agency' },
  ],
};

async function onAnime(): Promise<typeof import('./[group]/page')> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
  return import('./[group]/page');
}

const hrefsOf = (html: string): string[] => [...html.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]!);
const text = (html: string): string => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('a series with a quiz', () => {
  it('answers with the quiz of the series: its h1, its start button, the six characters and their profile text in the page', async () => {
    data.series = SERIES;
    const page = await onAnime();
    const html = renderToString(await page.default({ params: Promise.resolve({ group: 'death-note' }) }));
    expect(html).toMatch(/<h1>Which <em>Death Note<\/em> character are you\?<\/h1>/);
    expect(text(html)).toContain('8 questions');
    expect(html).toMatch(/data-testid="pers-intro"/);
    // the about block lists every possible result with its role and its profile text, in a closed details (crawlable)
    expect(text(html)).toContain('The 6 possible results');
    for (const p of SERIES.profiles) {
      expect(text(html)).toContain(p.name);
      for (const line of p.lines) expect(text(html)).toContain(line);
    }
    expect(text(html)).toContain('Main character, Yagami family');
    expect(text(html)).toContain('Supporting character, Shinigami');
  });

  it('is the anime site everywhere: no kpop host, no blind test, no picture, one h1', async () => {
    data.series = SERIES;
    const page = await onAnime();
    const html = renderToString(await page.default({ params: Promise.resolve({ group: 'death-note' }) }));
    expect(html).not.toMatch(/kpopquiz\.org/i);
    expect(html).toContain('https://fandomverse.org/anime/series');
    expect(html).toContain('https://fandomverse.org/anime/death-note-quiz');
    expect(html).not.toMatch(/blind ?test|openings quiz/i);
    expect(html).not.toMatch(/<img\b|\.png|\.jpe?g|\.webp/i);
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it('its links are routes of the site, and the other series are not linked with a kpop URL', async () => {
    data.series = SERIES;
    const page = await onAnime();
    const html = renderToString(await page.default({ params: Promise.resolve({ group: 'death-note' }) }));
    const internal = hrefsOf(html).filter((u) => u.startsWith('/') && !u.startsWith('//'));
    expect(internal.length).toBeGreaterThan(2);
    for (const u of internal) expect(isKnownRouteFor('anime', u.split(/[?#]/)[0]!, { v1: true, v12: true }), u).toBe(true);
    expect(html).not.toMatch(/member-are-you/);
  });

  it('is indexable at its pretty URL: the canonical and the share URL are /which-death-note-character-are-you on fandomverse.org/anime', async () => {
    data.series = SERIES;
    const page = await onAnime();
    const meta = await page.generateMetadata({ params: Promise.resolve({ group: 'death-note' }) });
    expect(meta.alternates?.canonical).toBe('/which-death-note-character-are-you');
    expect(meta.title).toMatch(/^Which Death Note character are you\?/);
    expect(String(meta.title).length).toBeLessThanOrEqual(60);
    expect(meta.robots).toBeUndefined();
    expect(meta.openGraph).toMatchObject({ url: '/which-death-note-character-are-you', type: 'website' });
    expect(String((meta.openGraph as { title?: string }).title)).toContain('| OtakuQuiz');
    expect(String(meta.description)).toContain('Death Note character');
  });
});

describe('the other series', () => {
  it('lists the series that have a quiz, with character and series words and their own pretty URLs, never the series itself or one without a set', async () => {
    data.series = SERIES;
    const page = await onAnime();
    const html = renderToString(await page.default({ params: Promise.resolve({ group: 'death-note' }) }));
    expect(text(html)).toContain('Which character are you, for another series');
    expect(text(html)).toContain('Which Attack on Titan character are you?');
    expect(hrefsOf(html)).toContain('/which-attack-on-titan-character-are-you');
    expect(hrefsOf(html)).not.toContain('/which-death-note-character-are-you');
    expect(text(html)).not.toContain('Which Naruto');
    expect(text(html)).toContain('your result is the Death Note character whose profile is closest');
    expect(text(html)).toContain('answer for yourself, not for your oshi');
    expect(text(html)).not.toMatch(/\bmember|\bbias\b|another group/i);
  });

  it('shows no block when no other series has a quiz', async () => {
    data.series = SERIES;
    groups.rows = [{ slug: 'death-note', name: 'Death Note' }];
    const page = await onAnime();
    const html = renderToString(await page.default({ params: Promise.resolve({ group: 'death-note' }) }));
    expect(text(html)).not.toContain('for another series');
  });
});

describe('a series without a quiz', () => {
  it('is a 404 for the metadata and for the page, never an empty quiz', async () => {
    data.series = null;
    const page = await onAnime();
    await expect(page.generateMetadata({ params: Promise.resolve({ group: 'naruto' }) })).rejects.toThrow('404');
    await expect(page.default({ params: Promise.resolve({ group: 'naruto' }) })).rejects.toThrow('404');
  });
});

describe('the static params', () => {
  it('prerender nothing: a quiz renders on its first hit (no database call at build)', async () => {
    const page = await onAnime();
    expect(await page.generateStaticParams({ params: { site: 'anime' } })).toEqual([]);
    expect(h).toBeTypeOf('function');
  });
});
