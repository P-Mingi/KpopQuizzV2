import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { sampleCard, sampleLadder } from '@/lib/ranked/test-fixtures';

// RENDER TESTS (P9): the server-rendered boards, the rules copy, the community
// panels and every Ranked tab state, from fixtures shaped like the real reads
// (lib/ux-v1/p9/data.ts) and, for Ranked, P7's ENGINE OUTPUTS (sampleCard /
// sampleLadder: the prototype's sample season through the real seasonCard() and
// ladderView()). What they prove: the markup, the links, the floors and the copy.
// What they do not prove: pixels and live data (e2e/ux-v1/p9.spec.ts).

// The islands are next/dynamic wrappers that render nothing without the flag: use
// the real client components (server-rendered here like on a first paint).
vi.mock('./islands', async () => ({
  LbTabs: (await import('./tabs')).LbTabs,
  WarPin: (await import('./pins')).WarPin,
  PlayerPin: (await import('./pins')).PlayerPin,
  CreatorPin: (await import('./pins')).CreatorPin,
  RankedPane: (await import('./ranked')).RankedPane,
  CreatorsSwitch: (await import('./creators')).CreatorsSwitch,
}));
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T): T => fn }));

const { AroundCommunity } = await import('./around');
const { CreatorsPane, PlayersPane, WarPane } = await import('./panes');
const { HowPoints } = await import('./points');
const { RankedBody } = await import('./ranked');
const { LbTabs } = await import('./tabs');

import type { AroundData, CreatorsBoards, PersonRow, WarRow } from '@/lib/ux-v1/p9/data';

const NOW = new Date('2026-10-08T12:00:00.000Z');

const FANDOMS: Array<[string, string, string]> = [
  ['girls-generation', 'SONE', "Girls' Generation"], ['stray-kids', 'STAY', 'Stray Kids'], ['cortis', 'Cortis', ''],
  ['bts', 'ARMY', 'BTS'], ['illit', 'GLLIT', 'ILLIT'], ['enhypen', 'ENGENE', 'ENHYPEN'], ['blackpink', 'BLINK', 'BLACKPINK'],
  ['seventeen', 'CARAT', 'SEVENTEEN'], ['babymonster', 'MONSTIEZ', 'BABYMONSTER'], ['katseye', 'EYEKON', 'KATSEYE'],
];

function war(n = 30): WarRow[] {
  return Array.from({ length: n }, (_, i) => {
    const f = FANDOMS[i] ?? [`group-${i + 1}`, `Fandom ${i + 1}`, `Group ${i + 1}`];
    return {
      rank: i + 1, slug: f[0], href: `/${f[0]}-quiz`, name: f[1], sub: f[2], group: f[2] || f[1],
      points: 400 - i * 10, fans: 5, delta: i === 3 ? -29 : i === 4 ? 54 : i === 11 ? null : i === 12 ? 0 : 10,
      photo: i === 2 ? null : `/idols/${encodeURIComponent(f[1])}.jpg`, initials: f[1].slice(0, 2).toUpperCase(),
    };
  });
}

function people(n: number, unitSub: (i: number) => string, value: (i: number) => number): PersonRow[] {
  return Array.from({ length: n }, (_, i) => ({
    rank: i + 1, username: `fan_${i + 1}`, href: `/u/fan_${i + 1}`,
    avatar: i === 0 ? { src: 'https://lh3.googleusercontent.com/a/x', bg: null, fg: null } : { src: null, bg: null, fg: null },
    accent: i === 1 || i === 4 ? 'purple' : null, font: i === 4 ? 'mono' : null, bias: i === 1 || i === 4 ? 'Han' : null,
    value: value(i), sub: unitSub(i),
  }));
}

const html = (el: React.ReactElement): string => renderToStaticMarkup(el);
const hrefs = (s: string): string[] => [...s.matchAll(/<a\b[^>]*?\shref="([^"]*)"/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));
const text = (s: string): string => s.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const count = (s: string, needle: string): number => s.split(needle).length - 1;

describe('Fandom war pane', () => {
  const out = html(h(WarPane, { rows: war() }));

  it('podium in rank order in the DOM (#1, #2, #3), the grid places #1 in the centre', () => {
    const ranks = [...out.matchAll(/class="p9-pod" data-rank="(\d)"/g)].map((m) => m[1]);
    expect(ranks).toEqual(['1', '2', '3']);
    expect(out).toContain('aria-label="Top 3 fandoms"');
    expect(count(out, '<h3 class="p9-pname">')).toBe(3);
  });

  it('every one of the 30 fandoms links its group hub (the live war map links)', () => {
    const links = hrefs(out);
    for (const r of war()) expect(links).toContain(r.href);
    expect(new Set(links).size).toBe(30);
  });

  it('rows 4 to 10 in view, 11 to 30 in a native fold; weekly change with words for screen readers', () => {
    const [top, fold] = out.split('<details class="p9-more">');
    expect(count(top!, 'class="p9-lrow"')).toBe(7);
    expect(count(fold!, 'class="p9-lrow"')).toBe(20);
    expect(top).toContain('class="ux-rows p9-rows p9-rows-top"');
    expect(fold).toContain('Show all 30 fandoms');
    expect(fold).toContain('Show fewer');
    expect(out).toContain('<span aria-hidden="true">-29%</span><span class="ux-sr">down 29 percent since last week</span>');
    expect(out).toContain('<span aria-hidden="true">+54%</span><span class="ux-sr">up 54 percent since last week</span>');
    expect(out).toContain('<span aria-hidden="true">new</span>');
    expect(out).toContain('<span aria-hidden="true">0%</span>');
    expect(out).toContain('id="fandom-war"');
    expect(out).toContain('<h2 class="ux-sr">Fandom war, last 7 days</h2>');
    // a group without a photo gets its initials (16.8), never a redrawn logo
    expect(out).toContain('<span class="p9-ini">CO</span>');
    // a fandom without a group line keeps the line's height
    expect(out).toContain('<small class="p9-psub"> </small>');
  });

  it('below the live floor (4) it says so plainly, no podium', () => {
    const thin = html(h(WarPane, { rows: war(3) }));
    expect(thin).toContain('No fandom has points this week yet.');
    expect(thin).not.toContain('p9-podium');
  });

  it('the pinned row keeps its box while the session is unknown (no guest flash)', () => {
    expect(out).toContain('<div class="p9-pin-wait" aria-hidden="true"></div>');
  });
});

describe('Players and Creators panes', () => {
  it('players: passport links with flair, XP unit, level line', () => {
    const rows = people(10, (i) => (i === 3 ? 'Lv 9 · STAY' : 'Lv 13 · Bias'), (i) => 14360 - i * 100);
    const out = html(h(PlayersPane, { rows }));
    for (const r of rows) expect(hrefs(out)).toContain(r.href);
    expect(out).toContain('ux-acc-purple');
    expect(out).toContain('font-family');
    expect(out).toContain('<span class="ux-bias ux-acc-purple">');
    // the podium keeps the name alone (the bias chip is for rows and the pin)
    const podium = out.split('</ol>')[0]!;
    expect(podium).toContain('ux-who ux-acc-purple p9-link');
    expect(podium).not.toContain('ux-bias');
    expect(text(out)).toContain('14,360 XP');
    expect(text(out)).toContain('Lv 9 · STAY');
    expect(count(out, 'class="p9-lrow"')).toBe(7);
  });

  it('creators: one board = no switch; three boards = a switch, the others in the HTML but hidden', () => {
    const all = people(10, () => '46 quizzes', (i) => 9401 - i * 50);
    const boards: CreatorsBoards = { all, week: people(4, () => '9 quizzes', (i) => 50 - i), rising: people(5, () => 'Lv 5 · Stan', (i) => 12 - i) };
    const one = html(h(CreatorsPane, { boards: { ...boards, week: [], rising: [] }, views: ['all'] }));
    expect(one).not.toContain('ux-seg');
    expect(text(one)).toContain('9,401 plays');
    const three = html(h(CreatorsPane, { boards, views: ['all', 'week', 'rising'] }));
    expect(three).toContain('role="group" aria-label="Creators board"');
    expect(count(three, 'aria-pressed="true"')).toBe(1);
    expect(three).toContain('data-view="week" hidden=""');
    expect(three).toContain('data-view="rising" hidden=""');
    expect(text(three)).toContain('12 followers');
    // every creator of every board is linked (the live Hall of Fame links)
    for (const r of [...boards.all, ...boards.week, ...boards.rising]) expect(hrefs(three)).toContain(r.href);
  });
});

describe('tabs', () => {
  it('four tabs, one selected, every pane server-rendered, the inactive ones hidden', () => {
    const out = html(h(LbTabs, {
      panes: [
        { id: 'war', label: 'Fandom war', icon: 'flag', hash: 'fandom-war', content: h('p', null, 'war pane') },
        { id: 'players', label: 'Players', icon: 'user', hash: 'players', content: h('p', null, 'players pane') },
        { id: 'ranked', label: 'Ranked', icon: 'trophy', hash: 'ranked', content: h('p', null, 'ranked pane') },
        { id: 'creators', label: 'Creators', icon: 'pen', hash: 'creators', content: h('p', null, 'creators pane') },
      ],
    }));
    expect(count(out, 'role="tab"')).toBe(4);
    expect(count(out, 'aria-selected="true"')).toBe(1);
    expect(out).toContain('id="lb-tab-war" aria-selected="true" aria-controls="lb-panel-war" tabindex="0"');
    expect(count(out, 'role="tabpanel"')).toBe(4);
    for (const p of ['players', 'ranked', 'creators']) expect(out).toMatch(new RegExp(`id="lb-panel-${p}"[^>]*hidden=""`));
    expect(out).toContain('war pane');
    expect(out).toContain('creators pane');
  });
});

describe('How points work (the real rules, 13.5)', () => {
  it('three native details, closed; the real numbers; no dash', () => {
    const out = html(h(HowPoints, { creatorViews: ['all'] }));
    expect(count(out, '<details class="p9-acc">')).toBe(3);
    const t = text(out);
    expect(t).toContain('How points work');
    expect(t).toContain('adds 1 point to that group\'s fandom');
    expect(t).toContain('last 7 days');
    expect(t).toContain('all-time XP');
    expect(t).toContain('10 XP');
    expect(t).toContain('plays their quizzes have received');
    expect(t).not.toContain('This week counts');
    expect(t).not.toMatch(/[\u2013\u2014]/);
    const all = text(html(h(HowPoints, { creatorViews: ['all', 'week', 'rising'] })));
    expect(all).toContain('This week counts the plays of the quizzes they published in the last 7 days.');
    expect(all).toContain('Rising counts new followers in the last 7 days.');
  });
});

describe('Around the community (the live page\'s other links)', () => {
  const person = (u: string): AroundData['comments'][number]['person'] => ({ username: u, href: `/u/${u}`, avatar: { src: null, bg: null, fg: null }, accent: null, font: null, bias: null });
  const data: AroundData = {
    today: { plays: 1204, quizzes: 3, masters: 0, hot: { name: 'Cortis', href: '/cortis-quiz', photo: null, initials: 'CO' } },
    qotd: { title: 'MAMAMOO: The Curtain Call Era', href: '/q/mamamoo-the-curtain-call-era?daily=quiz', note: 'Quiz of the day · replay of the April 21 pick' },
    happening: [
      { id: 1, person: person('ilikebread'), name: 'ilikebread', phrase: 'scored a perfect 7/7', href: '/tws-quiz', ago: '1h' },
      { id: 2, person: null, name: 'someone', phrase: 'hit a 7-day streak', href: null, ago: 'just now' },
    ],
    fresh: [{ id: 'q1', title: 'BABYMON FAN QUIZ FREYA', href: '/q/babymon-fan-quiz-freya', by: 'freyaa', plays: 9, group: 'BABYMONSTER' }],
    comments: [{ id: 'c1', person: person('mingi'), quizTitle: 'Loona true or false', quizHref: '/q/loona-true-or-false', content: 'Love it', score: 'after scoring 13/16', ago: '11d' }],
    badges: [{ id: 'b1', badgeId: 'perfect_score', badgeName: 'Perfect score', person: person('ajmyoi'), ago: '12h' }],
  };

  it('keeps every link: daily quiz and blindtest, hot hub, stats, feed, fresh quizzes, create, comments, badges', () => {
    const links = hrefs(html(h(AroundCommunity, { data })));
    for (const l of ['/q/mamamoo-the-curtain-call-era?daily=quiz', '/blindtest?daily=true', '/cortis-quiz', '/stats', '/u/ilikebread', '/tws-quiz',
      '/q/babymon-fan-quiz-freya', '/create', '/u/mingi', '/q/loona-true-or-false', '/u/ajmyoi']) expect(links).toContain(l);
  });

  it('truthful lines: counts without zeros, a replay is a replay, anonymous stays anonymous', () => {
    const out = html(h(AroundCommunity, { data }));
    const t = text(out);
    expect(t).toContain('1,204 plays today · 3 quizzes made');
    expect(t).not.toContain('0 groups mastered');
    expect(t).toContain('Quiz of the day · replay of the April 21 pick');
    expect(t).toContain('someone hit a 7-day streak');
    expect(t).toContain('BABYMONSTER · by freyaa · 9 plays');
    expect(t).toContain('after scoring 13/16 · 11d ago');
    expect(out).toContain('ux-bmed');
    expect(t).not.toMatch(/[\u2013\u2014]/);
  });

  it('each panel hides below its floor (data already gated); the blindtest of the day always shows', () => {
    const out = html(h(AroundCommunity, { data: { today: null, qotd: null, happening: [], fresh: [], comments: [], badges: [] } }));
    expect(hrefs(out)).toEqual(['/blindtest?daily=true']);
    expect(text(out)).not.toContain('Happening now');
    expect(text(out)).not.toContain('Fresh quizzes');
  });
});

describe('Ranked tab states (P7 API as it is)', () => {
  const retry = (): void => undefined;

  it('not live today: says so, links How ranked works, no number', () => {
    const out = html(h(RankedBody, { status: { kind: 'not_live' }, retry }));
    expect(text(out)).toBe('Ranked is not live yet: the first season has not started, so there is no ladder to show. How ranked works');
    expect(hrefs(out)).toEqual(['/blindtest/ranked']);
  });

  it('error: a retry, no number', () => {
    const out = html(h(RankedBody, { status: { kind: 'error' }, retry }));
    expect(text(out)).toContain('The ranked ladder could not load.');
    expect(out).toContain('Try again');
  });

  it('live (engine outputs of the sample season): season line, podium, rows, your pinned row', async () => {
    const card = await sampleCard(NOW, 'player');
    const ladder = await sampleLadder(NOW, 'global', 'player');
    const out = html(h(RankedBody, { status: { kind: 'live', season: card.season, ladder }, retry }));
    const t = text(out);
    expect(t).toMatch(/^Season 3 · ends in \d+ days?\. How ranked works/);
    expect(count(out, 'class="p9-pod"')).toBe(3);
    expect(count(out, 'class="p9-lrow"')).toBe(ladder.rows.length - 3);
    expect(out).toContain('p7-gem p7-t-');
    expect(out).toContain('ux-pin is-you');
    expect(t).toContain(`#${ladder.me!.scopePosition.toLocaleString('en-US')}`);
    expect(t).toContain(`· ${ladder.me!.tier.label}`);
    expect(t).toContain(ladder.me!.seasonScore.toLocaleString('en-US'));
    for (const e of ladder.rows) if (e.username) expect(hrefs(out)).toContain(`/u/${e.username}`);
  });
});
