import { createElement } from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildTriviaVariant } from '@/components/anime/series-hub-slots';
import { FIXTURE_SLUGS, hubFromFixture } from '@/lib/anime/test-support';

import { GroupTriviaPage } from './group-trivia-page';

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => createElement('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/lib/trivia/facts', () => ({ getOverriddenFacts: async () => { throw new Error('the quiz-derived facts must not be read for a series'); } }));
vi.mock('@/lib/db/queries/group-hub', () => ({
  getGroupNameAllGame: async () => { throw new Error('kpop read'); },
  getGroupBlindtestInfo: async () => { throw new Error('kpop read'); },
}));
vi.mock('@/lib/db/queries/group-freshness', async (orig) => ({ ...(await orig<object>()), getGroupContentDate: async () => '2026-10-01T00:00:00Z' }));

function render(el: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    const out = new PassThrough();
    let text = '';
    out.on('data', (c: Buffer) => { text += c.toString('utf8'); });
    out.on('end', () => resolve(text));
    const stream = renderToPipeableStream(el, { onAllReady: () => stream.pipe(out), onError: reject });
  });
}

const SITE = { origin: 'https://otakuquiz.org', brand: 'OtakuQuiz' };
const BANNED = /k-?pop|kpopquiz|[\u2013\u2014]|\p{Extended_Pictographic}/iu;

describe.each(FIXTURE_SLUGS)('the %s trivia page', (slug) => {
  it('prints the series facts with their sources, in the site words and URLs', async () => {
    const hub = hubFromFixture(slug, { trivia: 10 });
    const out = await render(await GroupTriviaPage({ group: hub.group, variant: buildTriviaVariant(hub, SITE) }));
    const name = hub.group.name;
    expect(out).toContain(`${name} trivia and fun facts`);
    expect(out).toContain('anime-o2-card');
    expect(out).toContain('Where these facts come from');
    expect(out).toContain('href="https://en.wikipedia.org/wiki/Special:Search"');
    expect(out).toContain(`${name} Trivia`);
    expect(out).toContain('"@type":"TVSeries"');
    expect(out).toContain(`"url":"https://otakuquiz.org/${hub.group.slug}-trivia"`);
    expect(out).toContain('"name":"OtakuQuiz"');
    expect(out).not.toContain('trivia-fact-link');
    expect(out).not.toContain('/verse/');
    expect(out).not.toMatch(BANNED);
    // ten facts, each printed
    for (let i = 1; i <= 10; i++) expect(out).toContain(`fact number ${i} is stored`);
  });

  it('is a 404 under nine facts', async () => {
    const hub = hubFromFixture(slug, { trivia: 8 });
    await expect(GroupTriviaPage({ group: hub.group, variant: buildTriviaVariant(hub, SITE) })).rejects.toMatchObject({ digest: expect.stringContaining('NEXT_HTTP_ERROR_FALLBACK;404') });
  });
});
