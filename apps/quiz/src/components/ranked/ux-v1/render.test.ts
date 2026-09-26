import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { applyRun } from '@/lib/ranked/season';
import { FixtureRunServer, sampleCard, sampleLadder, sampleRuns } from '@/lib/ranked/test-fixtures';
import { cardState } from '@/lib/ranked/view';

import { CardView } from './card';
import { RankedImpact } from './impact';
import { LadderBody } from './ladder';
import { HowRankedWorks, SeasonRewards } from './rules';
import { TierStrip } from './tiers';

import type { RankedApi } from './controller';

// RENDER TESTS (P7 brief): the populated ranked layout cannot be checked live until
// the owner applies docs/pending-migrations/v11-p7-ranked.sql (production answers
// 503 not_live today). These tests feed ENGINE OUTPUTS (seasonCard(), ladderView(),
// applyRun() and the run state machine, on the prototype's sample season) into the
// page components and check the server-rendered markup. What they prove: every
// number and sentence the page shows is the engine's, formatted as the prototype
// shows it, in the right element (one H1, the best 5 with the lowest flagged, the
// ladder rows with flair and your pinned row, the impact sentence). What they do not
// prove: pixels, live data, the network wiring (e2e/ux-v1/p7.spec.ts covers the
// wiring with stubbed routes; the live pixel check is NOT verified until the
// migration is applied).

const NOW = new Date('2026-10-08T12:00:00.000Z');

function api(over: Partial<RankedApi> = {}): RankedApi {
  return {
    status: 'live', card: null, scope: 'global', setScope: () => undefined, ladder: { status: 'idle', view: null },
    play: () => undefined, starting: false, signIn: () => undefined, retry: () => undefined, ...over,
  };
}

const decode = (s: string): string => s.replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
/** Text with a space between elements (rows of separate cells). */
const text = (html: string): string => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/** Inline text of the first <p> with class `cls` (a sentence with bold parts). */
function inline(html: string, cls: string): string {
  const start = html.indexOf(`<p class="${cls}"`);
  if (start < 0) return '';
  const end = html.indexOf('</p>', start);
  return decode(html.slice(start, end).replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

describe('season card, fed by seasonCard()', () => {
  it('placed (the prototype player): Gold I, 8,290, #412 of 18,204, 210 to Platinum III, best 5', async () => {
    const card = await sampleCard(NOW, 'player');
    const html = renderToStaticMarkup(h(CardView, { state: cardState(card, 'live'), r: api({ card }) }));
    const t = text(html);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>Gold I<\/h1>/);
    expect(t).toContain('Season 3 · ends in 19 days');
    expect(t).toContain('8,290 season points · #412 of 18,204');
    expect(t).toContain('210 points to Platinum III');
    expect(t).toContain('Play a ranked run');
    expect(t).toContain('Score over 1,420 to count · 12 of 15 runs left today');
    expect(t).toContain('Your best 5 runs: 1,910 1,780 1,640 1,540 1,420 (lowest) = 8,290');
    expect(html).toContain('class="is-low"');
    expect(html).toContain('p7-t-gold');
    expect(html).toMatch(/aria-valuenow="68\.5"/); // (8290 - 7834) / 666 of the way to Platinum III
  });

  it('placing: "3 / 5 placed", runs so far, no tier yet', async () => {
    const card = await sampleCard(NOW, 'placing');
    const t = text(renderToStaticMarkup(h(CardView, { state: cardState(card, 'live'), r: api({ card }) })));
    expect(t).toContain('3 / 5 placed');
    expect(t).toContain('2 placement runs to go');
    expect(t).toContain('Your runs so far:');
    expect(t).not.toContain('(lowest)');
  });

  it('no runs left today: the button is disabled and says so', async () => {
    const card = await sampleCard(NOW, 'limit');
    const html = renderToStaticMarkup(h(CardView, { state: cardState(card, 'live'), r: api({ card }) }));
    expect(text(html)).toContain('No ranked runs left today');
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>.*Play a ranked run/);
  });

  it('guest: season line and the sign-in call, no numbers', async () => {
    const card = await sampleCard(NOW, 'guest');
    const t = text(renderToStaticMarkup(h(CardView, { state: cardState(card, 'live'), r: api({ card }) })));
    expect(t).toContain('Season 3 · ends in 19 days');
    expect(t).toContain('Sign in to play ranked');
    expect(t).not.toMatch(/season points/);
  });

  it('not live (today, migration not applied): says so, links the blindtest', () => {
    const html = renderToStaticMarkup(h(CardView, { state: cardState(null, 'not_live'), r: api({ status: 'not_live' }) }));
    expect(html).toMatch(/<h1[^>]*>Not live yet<\/h1>/);
    expect(html).toContain('href="/blindtest"');
    expect(text(html)).not.toMatch(/\d,\d{3}/); // no invented numbers
  });

  it('loading (server render before the card answers): one neutral H1', () => {
    const html = renderToStaticMarkup(h(CardView, { state: { kind: 'loading' }, r: null }));
    expect(html).toMatch(/<h1[^>]*>Ranked<\/h1>/);
    expect(html).toContain('aria-busy="true"');
  });
});

describe('ladder, fed by ladderView()', () => {
  it('Global: 8 rows with flair, tier and average, then your row pinned', async () => {
    const view = await sampleLadder(NOW, 'global');
    const html = renderToStaticMarkup(h(LadderBody, { view, r: api() }));
    const t = text(html);
    expect(html.match(/class="p7-lrow"/g)).toHaveLength(8);
    expect(t).toContain('1 kwangya_notes Karina Master · average 1.4s 13,240');
    expect(t).toContain('3 stay4life Felix Diamond I · average 1.6s 11,910');
    expect(t).toContain('8 jk_golden Jungkook Platinum III · average 1.9s 8,720');
    expect(html).toContain('href="/u/kwangya_notes"');
    expect(html).toContain('ux-acc-purple');
    expect(html).toContain('ux-pin is-you');
    expect(t).toContain('#412 M mingi · Gold I · average 2.1s 8,290');
    expect(html).not.toMatch(/user_?id|sample-player/);
  });

  it('My fandom without a main fandom: the Settings link, no rows', async () => {
    const view = await sampleLadder(NOW, 'fandom', 'player', null);
    const html = renderToStaticMarkup(h(LadderBody, { view, r: api() }));
    expect(text(html)).toContain('Pick your main fandom in Settings');
    expect(html).toContain('href="/settings"');
    expect(html).not.toContain('p7-lrow');
  });

  it('guests asking for a personal scope get the sign-in line', async () => {
    const view = await sampleLadder(NOW, 'following', 'guest');
    expect(text(renderToStaticMarkup(h(LadderBody, { view, r: api() })))).toContain('Sign in to see this ladder.');
  });
});

describe('season impact (results slot), fed by applyRun()', () => {
  it('prototype: Gold I -> Platinum III, "replaces your lowest best run (1,420). Season score 8,610"', () => {
    const impact = applyRun(sampleRuns(NOW), { id: 'new', points: 1_740, correct: 8, avgAnswerMs: 1_500, finishedAt: NOW.toISOString() });
    const result = { status: 'submitted' as const, points: 1_740, correct: 8, total: 10, bestCombo: 3, avgAnswerMs: 1_500, songs: [], impact, ladder: { before: 412, after: 398, total: 18_204 } };
    const html = renderToStaticMarkup(h(RankedImpact, { submit: { kind: 'done', result } }));
    // chips: before -> after (the arrow is an icon labelled "to"), the new tier ringed
    expect(text(html)).toMatch(/^Gold I Platinum III /);
    expect(html).toContain('p7-tierchip p7-t-gold"');
    expect(html).toContain('p7-tierchip p7-t-platinum is-gain');
    expect(html).toContain('aria-label="to"');
    expect(inline(html, 'p7-imp-text')).toBe(
      'This run replaces your lowest best run (1,420). Season score 8,610, and you reach Platinum III. You move from #412 to #398 on the ladder.',
    );
  });

  it('a full server run: the submit answer renders its own impact', () => {
    let clock = NOW.getTime();
    const server = new FixtureRunServer(() => new Date(clock));
    server.issue();
    for (let i = 0; i < 10; i++) {
      server.start(i);
      clock += 1_200;
      server.answer(i, server.correctIndex(i), 1_000);
      clock += 3_000;
    }
    const res = server.submit();
    if ('error' in res) throw new Error(res.error);
    expect(res.points).toBe(2_900);
    const html = renderToStaticMarkup(h(RankedImpact, { submit: { kind: 'done', result: res } }));
    // 8,290 - 1,420 + 2,900 = 9,770: Gold I -> Platinum II
    expect(inline(html, 'p7-imp-text')).toBe(
      'This run replaces your lowest best run (1,420). Season score 9,770, and you reach Platinum II. You move from #412 to #398 on the ladder.',
    );
  });

  it('saving and failed states are plain status lines', () => {
    expect(text(renderToStaticMarkup(h(RankedImpact, { submit: { kind: 'saving' } })))).toBe('Saving your run to the season');
    expect(renderToStaticMarkup(h(RankedImpact, { submit: { kind: 'failed' } }))).toContain('role="status"');
  });
});

describe('rules sections', () => {
  it('tiers strip: 7 stops, the current one marked', () => {
    const html = renderToStaticMarkup(h(TierStrip, { current: 'gold' }));
    expect(html.match(/<li/g)).toHaveLength(7);
    expect(html).toMatch(/p7-tk p7-t-gold is-on" aria-current="true"/);
    expect(html.match(/is-past/g)).toHaveLength(2);
    expect(renderToStaticMarkup(h(TierStrip, { current: null }))).not.toContain('is-on');
  });

  it('how ranked works: 6 native details, first open, numbers from the engine', () => {
    const html = renderToStaticMarkup(h(HowRankedWorks));
    expect(html.match(/<details/g)).toHaveLength(6);
    expect(html).toMatch(/<details class="p7-acc" open="">/);
    const t = text(html);
    expect(t).toContain('4 easy, 4 medium and 2 hard');
    expect(t).toContain('about 2,900 points');
    expect(t).toContain('You can play 15 ranked runs a day.');
  });

  it('season rewards: three rows', () => {
    const t = text(renderToStaticMarkup(h(SeasonRewards)));
    expect(t).toContain('A season badge');
    expect(t).toContain('Double fandom war points');
    expect(t).toContain('Your tier colour on your name');
  });
});
