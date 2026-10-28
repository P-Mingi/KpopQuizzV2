import { createElement } from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildMixSlots, buildSeriesSlots } from '@/components/anime/series-hub-slots';
import { FIXTURE_SLUGS, hubFromFixture, readFixture } from '@/lib/anime/test-support';
import { isKnownRouteFor } from '@/lib/site/routing';

import type { SeriesHub } from '@/lib/anime/series';

// The hub as the anime page builds it: GroupHubV11 with the slots of a series, over the reads the page makes. The reads
// are stubbed (a hub is a server component over the database); what is checked is what reaches the HTML.

let quizzes: unknown[] = [];
vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => createElement('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizzesByGroup: async () => quizzes }));
vi.mock('@/lib/db/queries/related-quizzes', () => ({ getRelatedQuizzes: async () => [] }));
vi.mock('@/lib/db/queries/trivia', () => ({ hasTriviaPage: async () => { throw new Error('the kpop trivia read must not run for a series'); }, TRIVIA_MIN_FACTS: 9 }));
vi.mock('@/lib/db/queries/group-hub', () => ({
  getGroupNameAllGame: async () => { throw new Error('kpop read'); },
  getGroupBlindtestInfo: async () => { throw new Error('kpop read'); },
  getGroupWarRank: async () => { throw new Error('kpop read'); },
  getGroupActiveComeback: async () => { throw new Error('kpop read'); },
  getGroupMvPulse: async () => { throw new Error('kpop read'); },
  getGroupFanKnowledge: async () => ({ masteredCount: 0, avgAccuracy: null, trackedPlays: 0, topFans: [] }),
}));
vi.mock('@/lib/db/queries/group-freshness', async (orig) => ({ ...(await orig<object>()), getGroupContentDate: async () => '2026-10-01T00:00:00Z' }));
vi.mock('@/lib/ux-v1/p3/data', () => ({
  getHubQuizzes: async () => quizzes,
  getGroupsIndex: async () => { throw new Error('kpop read'); },
  getPlayableSongs: async () => { throw new Error('kpop read'); },
  getGroupCommentsWithTeam: async () => [],
}));
vi.mock('@/lib/ux-v1/p3/growth-data', () => ({ getHubGrowth: async () => ({ ways: { slug: 's', name: 'S', quizzes: 5, songs: 0, nameAll: null, whichMember: null, thisOrThat: null, live: false }, recentPlays: 3, btPlays: 0, firstCreator: null, fansPicked: null }) }));
vi.mock('./loader', async () => {
  const q = await import('./hub-quizzes');
  const n = await import('./hub-notify');
  return { HubQuizzesLoader: q.HubQuizzes, HubNotifyLoader: n.HubNotify, HubFansPickedLoader: () => null };
});
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => (globalThis as { __v12?: boolean }).__v12 === true }));

function render(el: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (c: Buffer) => { text += c.toString('utf8'); });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(el, { onAllReady: () => stream.pipe(out), onError: reject });
  });
}

const SITE = { origin: 'https://fandomverse.org/anime', brand: 'OtakuQuiz' };
const BANNED = /k-?pop|kpopquiz|[\u2013\u2014]|\p{Extended_Pictographic}/iu;

async function hubHtml(hub: SeriesHub, v12: boolean): Promise<string> {
  (globalThis as { __v12?: boolean }).__v12 = v12;
  quizzes = [...hub.quizzes];
  const { GroupHubV11 } = await import('./hub');
  const related = [{ slug: 'other-series', name: 'Other Series', quizzes: 4 }];
  return render(await GroupHubV11({ group: hub.group, slots: buildSeriesSlots(hub, related, SITE) }));
}

describe.each(FIXTURE_SLUGS)('the %s hub with the anime slots', (slug) => {
  const hub = hubFromFixture(slug, { trivia: 10 });

  for (const v12 of [false, true]) {
    it(`prints every block, the series' own texts and URLs, and nothing of kpop (v12 ${v12})`, async () => {
      const out = await hubHtml(hub, v12);
      const name = hub.group.name;
      // header: H1, title card in the photo column, facts
      expect(out).toContain('p3-h1-tail');
      expect(out).toContain(`Test How Well You Know <!-- -->${name}`);
      expect(out).toContain('anime-o2-card');
      expect(out).toContain('anime-o2-dl');
      // A5 and A2: shield, story map, quizzes by arc
      expect(out).toContain('Spoiler shield');
      expect(out).toContain('Story map');
      expect(out).toContain('Quizzes by arc');
      for (const q of hub.quizzes) expect(out, q.slug).toContain(`href="/q/${q.slug}"`);
      // A3, facts, FAQ, related
      expect(out).toContain('anime-o2-characters');
      expect(out).toContain(`${name} facts`);
      expect(out).toContain('Questions fans ask');
      expect(out).toContain('Related series');
      expect(out).toContain('Other Series');
      expect(out).toContain('/series');
      // the series' JSON-LD and links are the site's
      expect(out).toContain('"url":"https://fandomverse.org/anime/' + hub.group.slug + '-quiz"');
      expect(out).toContain(`Ways to play ${name} on OtakuQuiz`);
      expect(out).toContain(`href="/${hub.group.slug}-trivia"`);
      // nothing of kpop: no war, no MV pulse, no comeback, no Verse, no fans picked, no K-pop text
      for (const kpop of ['Comeback', 'fandom war', 'MV pulse', '/verse/', 'Fans also play', 'Debut', 'blindtest songs']) expect(out, kpop).not.toContain(kpop);
      expect(out).not.toMatch(BANNED);
      // no tagged question
      for (const quiz of readFixture(slug).quizzes) for (const x of quiz.questions) if ((x.spoiler?.arc ?? 0) > 0) expect(out).not.toContain(x.question ?? '\u0000');
      // locked characters have no name in the HTML
      for (const c of hub.characters) if (c.spoiler_level > 0) expect(out).not.toContain(c.name + '<');
    });
  }

  it('is a hub with no blind test and no openings quiz link, whatever the number of playable themes, and no dead link', async () => {
    const many = { ...hub, themes: Array.from({ length: 15 }, (_, i) => ({ ...hub.themes[0]!, id: 800 + i, number: i + 1, deezer_playable: true })) };
    for (const h of [hub, many]) {
      const out = await hubHtml(h, false);
      expect(out).not.toMatch(/blind ?test|openings-quiz|openings quiz/i);
      const hrefs = [...out.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/g)].map((m) => m[1]!).filter((u) => u.startsWith('/'));
      expect(hrefs.length).toBeGreaterThan(3);
      for (const u of hrefs) expect(isKnownRouteFor('anime', u.split(/[?#]/)[0]!, { v1: true, v12: true }), u).toBe(true);
    }
  });
});

describe('the hub of a series with no quiz yet', () => {
  it('prints the empty hub and the facts of the header, and no quizzes list', async () => {
    const hub = hubFromFixture('death-note');
    const out = await hubHtml({ ...hub, quizzes: [], group: { ...hub.group, quiz_count: 0 } }, false);
    expect(out).toContain('No quiz yet');
    expect(out).toContain('Make the first quiz');
    expect(out).not.toContain('Quizzes by arc');
  });
});

describe('the Anime Mix hub', () => {
  it('has its own title and lede, and none of the series blocks', async () => {
    (globalThis as { __v12?: boolean }).__v12 = false;
    quizzes = [];
    const group = { ...hubFromFixture('death-note').group, slug: 'anime-mix', name: 'Anime Mix', quiz_count: 12 };
    const { GroupHubV11 } = await import('./hub');
    const out = await render(await GroupHubV11({ group, slots: buildMixSlots(group, SITE) }));
    expect(out).toContain('Anime Mix Quiz');
    expect(out).toContain('Test how well you know anime');
    expect(out).toContain('One quiz, many series.');
    for (const block of ['Spoiler shield', 'Story map', 'Characters', 'Openings and endings']) expect(out, block).not.toContain(block);
    expect(out).not.toMatch(BANNED);
  });
});
