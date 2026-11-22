import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { pickSurprise } from '@/lib/site/hub/data/surprise-pick';

import { HomeBlindtest } from './home-blindtest';
import { clockText, HomeCountdown, secondsToReset, wordsText } from './home-countdown';
import { HomeFans } from './home-fans';
import { bannerSource, gaugeBars, HomeHot, thumbSource } from './home-hot';
import { HomeSearch } from './home-search';
import { HomeQuestion } from './home-question';
import { HomeSurprise } from './home-surprise';

import type { HotCard, HotLabels, HotPanel } from './home-hot';

// Lot H2a: the islands of the new home, as the design's script has them. Their first render (what the server prints, before any click)
// and the rules of their small logic; the clicks themselves are driven in a browser (docs/o1/reports/H2/).
// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): the same islands as rows, the countdown as hours, minutes and
// seconds, a fourth Hot filter (Start easy) and the boards of Top fans per site.

describe('Surprise me', () => {
  const card = (id: string, site: 'kpop' | 'anime') => ({ id, tile: id.toUpperCase(), title: `Quiz ${id}`, href: `https://x.test/${id}`, site, pickLabel: `Your random pick on ${site}` });

  it('prints the line and the button beside it, and no pick row, before the first click', () => {
    const html = renderToStaticMarkup(createElement(HomeSurprise, {
      pool: [card('a', 'kpop')],
      playedIds: [],
      lede: 'Pick your side, or play both.',
      labels: { button: 'Surprise me', play: 'Play', another: 'Another' },
    }));
    expect(html).toMatch(/^<div class="hub-h2-lede-row"><p class="hub-h2-lede">Pick your side, or play both\.<\/p><button type="button" class="hub-h2-ghost hub-h2-btn">/);
    expect(html).toContain('Surprise me</button>');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('Another');
  });

  it('prints the line alone with no pool', () => {
    const html = renderToStaticMarkup(createElement(HomeSurprise, {
      pool: [], playedIds: [], lede: 'Pick your side, or play both.', labels: { button: 'Surprise me', play: 'Play', another: 'Another' },
    }));
    expect(html).toBe('<div class="hub-h2-lede-row"><p class="hub-h2-lede">Pick your side, or play both.</p></div>');
  });

  it('draws with pickSurprise of the data module: never a played quiz, never the same site twice in a row', () => {
    const pool = [card('k1', 'kpop'), card('k2', 'kpop'), card('a1', 'anime'), card('a2', 'anime')];
    let last: 'kpop' | 'anime' | null = null;
    for (let i = 0; i < 50; i++) {
      const pick: ReturnType<typeof card> | null = pickSurprise(pool, { playedIds: ['k1', 'a1'], lastSite: last });
      expect(pick).not.toBeNull();
      expect(['k1', 'a1']).not.toContain(pick!.id);
      if (last) expect(pick!.site).not.toBe(last);
      last = pick!.site;
    }
  });
});

describe('the search button of the top bar', () => {
  // Lot HUB-HOT-B: the filter of Popular this week is gone, so the button no longer follows it: it is the search of KpopQuiz, named after that site.
  it('is a link to the search page of KpopQuiz, named after that site', () => {
    const html = renderToStaticMarkup(createElement(HomeSearch, { href: 'https://k.test/search', label: 'Search KpopQuiz' }));
    expect(html).toBe('<a href="https://k.test/search" aria-label="Search KpopQuiz" class="hub-h2-iconbtn hub-h2-btn"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg></a>');
    expect(html).not.toContain('both');
  });
});

describe('the countdown to the rotation (00:05 UTC)', () => {
  const at = (iso: string): Date => new Date(iso);
  const NEXT = '2026-07-02T00:05:00.000Z';
  it('counts to the real instant, summer and winter alike', () => {
    // the picks change at 00:05 UTC whatever the Paris clock says (2:05 in summer, 1:05 in winter)
    expect(secondsToReset(at('2026-07-01T00:05:00Z'), NEXT)).toBe(86_400);
    expect(secondsToReset(at('2026-07-01T00:00:00Z'), '2026-07-01T00:05:00.000Z')).toBe(300);
    expect(secondsToReset(at('2026-07-01T10:05:00Z'), NEXT)).toBe(14 * 3600);
    expect(secondsToReset(at('2026-12-01T01:05:00Z'), '2026-12-02T00:05:00.000Z')).toBe(23 * 3600);
    expect(secondsToReset(at('2026-12-01T12:00:00Z'), '2026-12-02T00:05:00.000Z')).toBe(12 * 3600 + 300);
  });

  it('rolls to the next day once the instant has passed, as a page left open overnight does', () => {
    expect(secondsToReset(at('2026-07-02T00:04:30Z'), NEXT)).toBe(30);
    expect(secondsToReset(at('2026-07-02T00:05:00Z'), NEXT)).toBe(86_400);
    expect(secondsToReset(at('2026-07-02T00:06:00Z'), NEXT)).toBe(86_340);
    expect(secondsToReset(at('2026-07-05T12:05:00Z'), NEXT)).toBe(12 * 3600);
  });

  it('writes the time as hours, minutes and seconds, as the board does ("08:47:12")', () => {
    expect(clockText(at('2026-07-01T10:05:00Z'), NEXT)).toBe('14:00:00');
    expect(clockText(at('2026-07-01T15:17:48Z'), NEXT)).toBe('08:47:12');
    expect(clockText(at('2026-07-02T00:04:59Z'), NEXT)).toBe('00:00:01');
    expect(() => secondsToReset(at('2026-07-01T00:00:00Z'), 'not a date')).toThrow();
  });

  it('writes the time as hours and minutes on the home ("14 h 08 min"), the minutes rounded up (home v4: no per-second motion)', () => {
    expect(wordsText(at('2026-07-01T10:05:00Z'), NEXT)).toBe('14 h 00 min');
    expect(wordsText(at('2026-07-01T15:17:48Z'), NEXT)).toBe('8 h 48 min');
    expect(wordsText(at('2026-07-02T00:04:30Z'), NEXT)).toBe('1 min');
    expect(wordsText(at('2026-07-01T23:27:00Z'), NEXT)).toBe('38 min');
  });

  it('prints the words of the server before the clock takes over', () => {
    const html = renderToStaticMarkup(createElement(HomeCountdown, { template: 'New picks in {time}', fallback: 'a few hours', nextAt: NEXT }));
    expect(html).toBe('<span class="hub-h2-countdown">New picks in a few hours</span>');
  });
});

describe('the blindtest player', () => {
  it('starts on "press play" with a full labelled button and an empty bar, and loads no sound', () => {
    const html = renderToStaticMarkup(createElement(HomeBlindtest, {
      songs: 10, seconds: 10, previewUrl: 'https://cdn.test/first.mp3', href: 'https://k.test/blindtest?daily=true', mark: null,
      labels: { title: 'Blind test of the day', playAria: 'Play a 10 second preview', pauseAria: 'Pause the preview', press: 'KpopQuiz · 10 songs, 10 s each', playing: 'x {sec}', done: 'y {rest}', all: 'All 10 songs' },
    }));
    expect(html).toContain('aria-label="Play a 10 second preview"');
    expect(html).toContain('Blind test of the day');
    expect(html).toContain('KpopQuiz · 10 songs, 10 s each');
    expect(html).toContain('style="width:0%"');
    // Home v4: the way to the whole set is a text link with an arrow, in the foot of the tile, after the play button and the bar
    expect(html).toMatch(/<a href="https:\/\/k\.test\/blindtest\?daily=true" class="hub-h2-tl">All 10 songs<svg/);
    expect(html).toContain('<path d="M7 4.5v15l13-7.5z"></path>');
    // the preview address is not in the markup (an audio element is made on the first press only)
    expect(html).not.toContain('first.mp3');
    expect(html).not.toContain('<audio');
  });
});

describe('the question', () => {
  const props = {
    text: 'Which?', options: ['First', 'Second', 'Third', 'Fourth'], correct: 2, explain: 'Long.', href: 'https://kpopquiz.org/q/x',
    labels: { right: 'Right, well played.', wrong: 'Not this time.', markRight: 'Right', markPick: 'Your pick', again: 'Try again', full: 'Play the full quiz' },
  };
  it('prints four answers as rows lettered A to D, and no result before a pick', () => {
    const html = renderToStaticMarkup(createElement(HomeQuestion, props));
    expect(html.match(/<button type="button" class="hub-h2-opt">/g)).toHaveLength(4);
    expect([...html.matchAll(/<span aria-hidden="true" class="hub-h2-key">([A-D])<\/span>/g)].map((m) => m[1])).toEqual(['A', 'B', 'C', 'D']);
    expect(html).toContain('<span class="hub-h2-optl">Third</span>');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('hub-h2-opt-ok');
  });
});

describe('Popular this week', () => {
  const card = (n: number, site: 'kpop' | 'anime', over: Partial<HotCard> = {}): HotCard => ({
    site, tile: `T${n}`, title: `Quiz ${n}`, href: `https://x.test/${n}`, subject: `Group ${n}`, level: 'Medium', format: null, weekPlays: 1000 - n, isNew: false, cover: null, groupImage: null, ...over,
  });
  const labels: HotLabels = {
    title: 'Hot', sub: 'Sub', eyebrow: 'Week 47 · 16-22 Nov', seeAll: 'See all', rank: 'Rank', newLabel: 'New', empty: 'No plays yet', weekPlays: '{n} plays this week', weekShort: '{n} this week',
  };
  const panel = (site: 'kpop' | 'anime', items: HotCard[]): HotPanel => ({
    site, name: site === 'kpop' ? 'KpopQuiz' : 'OtakuQuiz', items, seeAllHref: `https://x.test/${site}`, seeAllLabel: `All quizzes on ${site}`,
  });
  const render = (panels: HotPanel[]): string => renderToStaticMarkup(createElement(HomeHot, { panels, labels }));

  it('prints the eyebrow, the h2, the sub, and one panel per site with an h3, a See all link with its own name, and three slots', () => {
    const html = render([panel('kpop', [card(1, 'kpop'), card(2, 'kpop'), card(3, 'kpop')]), panel('anime', [card(4, 'anime'), card(5, 'anime'), card(6, 'anime')])]);
    expect(html).toContain('<p class="hub-h2-eyebrow hub-h2-hot-eyebrow">Week 47 · 16-22 Nov</p>');
    expect(html).toContain('<h2 id="hot-h" class="hub-h2-h2">Hot</h2>');
    expect([...html.matchAll(/<h3 id="(hot-[ka]-h)" class="hub-h2-pnl-h3">(?:<span[^>]*><\/span>)?([^<]+)</g)].map((m) => [m[1], m[2]])).toEqual([['hot-k-h', 'KpopQuiz'], ['hot-a-h', 'OtakuQuiz']]);
    expect(html).toContain('aria-label="All quizzes on kpop" class="hub-h2-pnl-all">See all');
    expect(html.match(/class="hub-h2-t1 /g)).toHaveLength(2);
    expect(html.match(/class="hub-h2-t2 /g)).toHaveLength(4);
    expect(html).not.toContain('fchip');
    expect(html).not.toContain('aria-pressed');
  });

  it('shows the plays OF THE WEEK on every entry: "N plays this week" on the first place, "N this week" on the others, with a thousands separator', () => {
    const html = render([panel('kpop', [card(1, 'kpop', { weekPlays: 3412 }), card(2, 'kpop', { weekPlays: 1204 }), card(3, 'kpop', { weekPlays: 7 })]), panel('anime', [])]);
    expect(html).toContain('<span class="hub-h2-pc hub-h2-num">3,412 plays this week</span>');
    expect(html).toContain('<span class="hub-h2-pc hub-h2-num">1,204 this week</span>');
    expect(html).toContain('<span class="hub-h2-pc hub-h2-num">7 this week</span>');
  });

  it('keeps the line of the count (empty) when the week count is unknown, and puts the NEW tag on the line of the count, never on a line of its own', () => {
    const html = render([panel('kpop', [card(1, 'kpop', { weekPlays: null }), card(2, 'kpop', { isNew: true }), card(3, 'kpop')])]);
    expect(html).toContain('<span class="hub-h2-pc hub-h2-num"></span>');
    expect(html).toContain('<span class="hub-h2-t2-line"><span class="hub-h2-pc hub-h2-num">998 this week</span><span class="hub-h2-ntag">New</span></span>');
    expect(html.match(/hub-h2-ntag/g)).toHaveLength(1);
  });

  it('hides "Rank" for screen readers, draws the rank in the notch of the first place and beside the thumb of the others', () => {
    const html = render([panel('kpop', [card(1, 'kpop'), card(2, 'kpop'), card(3, 'kpop')])]);
    expect(html).toContain('<span class="hub-h2-t1-rank hub-h2-big"><span class="hub-h2-sr">Rank </span>1</span>');
    expect(html).toContain('<span class="hub-h2-t2-rank hub-h2-big"><span class="hub-h2-sr">Rank </span>2</span>');
    expect(html).toContain('<span class="hub-h2-t2-rank hub-h2-big"><span class="hub-h2-sr">Rank </span>3</span>');
  });

  it('keeps the three slots with fewer than three quizzes: the empty ones are hidden and keep the class of their height', () => {
    const one = render([panel('kpop', [card(1, 'kpop')])]);
    expect(one.match(/<li class="hub-h2-slot-1">/g)).toHaveLength(1);
    expect(one.match(/<li aria-hidden="true" class="hub-h2-slot-2"><\/li>/g)).toHaveLength(2);
    const two = render([panel('kpop', [card(1, 'kpop'), card(2, 'kpop')])]);
    expect(two.match(/<li aria-hidden="true" class="hub-h2-slot-2"><\/li>/g)).toHaveLength(1);
    expect(two.match(/class="hub-h2-t2 /g)).toHaveLength(1);
  });

  it('says "No plays yet this week" with See all when a site has no quiz', () => {
    const html = render([panel('kpop', []), panel('anime', [card(4, 'anime')])]);
    expect(html).toContain('<div class="hub-h2-pnl-list hub-h2-pnl-none"><p class="hub-h2-meta">No plays yet</p></div>');
    expect(html.match(/class="hub-h2-pnl-all"/g)).toHaveLength(2);
    expect(html.match(/class="hub-h2-t1 /g)).toHaveLength(1);
  });

  it('draws a difficulty gauge of three bars always followed by the word, and the format after it on the first place', () => {
    expect([gaugeBars('Easy'), gaugeBars('Medium'), gaugeBars('Hard'), gaugeBars('?')]).toEqual([1, 2, 3, 0]);
    const html = render([panel('kpop', [card(1, 'kpop', { level: 'Easy', format: 'True or false' }), card(2, 'kpop', { level: 'Hard' })])]);
    expect(html).toContain('<span aria-hidden="true" class="hub-h2-gauge hub-h2-gauge-1"><i class="hub-h2-gb"></i><i class="hub-h2-gb"></i><i class="hub-h2-gb"></i></span><span class="hub-h2-pm-w">Easy</span><span class="hub-h2-pm-f">· True or false</span>');
    expect(html).toContain('hub-h2-gauge hub-h2-gauge-3"><i class="hub-h2-gb"></i><i class="hub-h2-gb"></i><i class="hub-h2-gb"></i></span><span class="hub-h2-pm-w">Hard</span>');
  });

  it('picks the banner of the first place: the group or series picture, then the cover, then the name in type', () => {
    expect(bannerSource({ groupImage: '/g.jpg', cover: '/c.jpg' })).toBe('/g.jpg');
    expect(bannerSource({ groupImage: null, cover: '/c.jpg' })).toBe('/c.jpg');
    expect(bannerSource({ groupImage: null, cover: null })).toBeNull();
    const img = (items: HotCard[]): string => render([panel('kpop', items)]);
    expect(img([card(1, 'kpop', { groupImage: '/g.jpg', cover: '/c.jpg' })])).toContain('<img src="/g.jpg" alt="" width="420" height="150" loading="lazy" decoding="async" class="hub-h2-t1-img"/>');
    expect(img([card(1, 'kpop', { cover: '/c.jpg' })])).toContain('<img src="/c.jpg" alt="" width="420" height="150"');
    const type = img([card(1, 'kpop', { subject: 'Stray Kids' })]);
    expect(type).toContain('<span aria-hidden="true" class="hub-h2-t1-type hub-h2-big">Stray Kids</span>');
    expect(type).not.toContain('<img');
  });

  it('picks the thumbnail of the others: the cover, then the group or series picture, then the initials', () => {
    expect(thumbSource({ groupImage: '/g.jpg', cover: '/c.jpg' })).toBe('/c.jpg');
    expect(thumbSource({ groupImage: '/g.jpg', cover: null })).toBe('/g.jpg');
    expect(thumbSource({ groupImage: null, cover: null })).toBeNull();
    const html = render([panel('kpop', [card(1, 'kpop'), card(2, 'kpop', { cover: '/c.jpg', groupImage: '/g.jpg' }), card(3, 'kpop', { groupImage: '/g3.jpg' })]), panel('anime', [card(4, 'anime'), card(5, 'anime'), card(7, 'anime')])]);
    expect(html).toContain('<img src="/c.jpg" alt="" width="48" height="48"');
    expect(html).toContain('<img src="/g3.jpg" alt="" width="48" height="48"');
    expect(html).toContain('class="hub-h2-big hub-h2-t2-init">T7</span>');
  });
});

describe('Top fans', () => {
  const fan = (handle: string, level: number | null) => ({ handle, level });
  const labels = { title: 'Top fans this week', group: 'Leaderboard site', kpop: 'K-pop', anime: 'Anime', lv: 'Lv {level}', you: 'You' };
  it('starts on the K-pop board, with the two tabs, the rows linked to each fan\'s page on the hub, and the fan\'s own row marked', () => {
    const html = renderToStaticMarkup(createElement(HomeFans, { fans: { kpop: [fan('ann', 9), fan('me', 4), fan('cal', null)], anime: [fan('dee', 7)] }, me: 'me', labels }));
    expect([...html.matchAll(/aria-pressed="(true|false)"[^>]*>(K-pop|Anime)</g)].map((m) => [m[1], m[2]])).toEqual([['true', 'K-pop'], ['false', 'Anime']]);
    expect([...html.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1])).toEqual(['/u/ann', '/u/me', '/u/cal']);
    expect(html).toContain('class="hub-h2-frow hub-h2-frow-me"');
    expect(html.match(/hub-h2-frow-me/g)).toHaveLength(1);
    expect(html).toContain('>You</span>');
    expect(html).toContain('hub-h2-av hub-h2-av-sm hub-h2-av-top');
    expect(html.match(/class="hub-h2-meta hub-h2-num">Lv /g)).toHaveLength(2);
    expect(html).toContain('>Lv 9<');
    expect(html).not.toContain('dee');
  });

  it('has no tabs when only one site has public fans, and shows that board', () => {
    const html = renderToStaticMarkup(createElement(HomeFans, { fans: { kpop: [], anime: [fan('dee', 7)] }, me: null, labels }));
    expect(html).not.toContain('role="group"');
    expect(html).toContain('/u/dee');
    expect(html).not.toContain('hub-h2-frow-me');
  });
});
