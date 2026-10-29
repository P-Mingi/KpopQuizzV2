import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { pickSurprise } from '@/lib/site/hub/data/surprise-pick';

import { HomeBlindtest } from './home-blindtest';
import { clockText, HomeCountdown, secondsToReset } from './home-countdown';
import { HomeFans } from './home-fans';
import { HomeFilterProvider, HomeSearch, searchSite } from './home-filter';
import { HomeHot } from './home-hot';
import { HomeQuestion } from './home-question';
import { HomeSurprise } from './home-surprise';

import type { HotCard } from './home-hot';

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

describe('the search button follows the Hot now filter', () => {
  it('opens the search of OtakuQuiz on the OtakuQuiz filter and the search of KpopQuiz on the two others', () => {
    expect(searchSite('all')).toBe('kpop');
    expect(searchSite('kpop')).toBe('kpop');
    expect(searchSite('anime')).toBe('anime');
  });

  it('starts on the search page of KpopQuiz (the filter is All), as a link with the design label', () => {
    const html = renderToStaticMarkup(createElement(HomeFilterProvider, null, createElement(HomeSearch, { hrefs: { kpop: 'https://k.test/search', anime: 'https://a.test/search' }, label: 'Search both sites' })));
    expect(html).toBe('<a href="https://k.test/search" aria-label="Search both sites" class="hub-h2-iconbtn hub-h2-btn"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg></a>');
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

  it('prints the words of the server before the clock takes over', () => {
    const html = renderToStaticMarkup(createElement(HomeCountdown, { template: 'New picks in {time}', fallback: 'a few hours', nextAt: NEXT }));
    expect(html).toBe('<span class="hub-h2-countdown">New picks in a few hours</span>');
  });
});

describe('the blindtest player', () => {
  it('starts on "press play" with a full labelled button and an empty bar, and loads no sound', () => {
    const html = renderToStaticMarkup(createElement(HomeBlindtest, {
      songs: 10, seconds: 10, previewUrl: 'https://cdn.test/first.mp3', href: 'https://k.test/blindtest?daily=true',
      labels: { title: 'Blind test of the day', playAria: 'Play a 10 second preview', pauseAria: 'Pause the preview', press: 'KpopQuiz · 10 songs, 10 s each', playing: 'x {sec}', done: 'y {rest}', all: 'All 10 songs' },
    }));
    expect(html).toContain('aria-label="Play a 10 second preview"');
    expect(html).toContain('Blind test of the day');
    expect(html).toContain('KpopQuiz · 10 songs, 10 s each');
    expect(html).toContain('style="width:0%"');
    expect(html).toContain('<a href="https://k.test/blindtest?daily=true" class="hub-h2-btall">All 10 songs</a>');
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
    expect(html.match(/<button type="button" class="hub-h2-line hub-h2-opt">/g)).toHaveLength(4);
    expect([...html.matchAll(/<span aria-hidden="true" class="hub-h2-key">([A-D])<\/span>/g)].map((m) => m[1])).toEqual(['A', 'B', 'C', 'D']);
    expect(html).toContain('<span class="hub-h2-optl">Third</span>');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('hub-h2-opt-ok');
  });
});

describe('Hot right now', () => {
  const card = (n: number, site: 'kpop' | 'anime', cover: string | null = null): HotCard => ({
    site, tile: `T${n}`, title: `Quiz ${n}`, href: `https://x.test/${n}`, line: `Site · G${n} · Easy`, plays: site === 'kpop' ? '1k plays' : '', isNew: site === 'anime', cover,
  });
  const labels = { title: 'Hot', sub: 'Sub', filter: 'Filter', all: 'All', kpop: 'KpopQuiz', anime: 'OtakuQuiz', easy: 'Start easy', newLabel: 'New' };
  const links = [{ site: 'kpop' as const, href: 'https://x.test/k', label: 'All K-pop' }, { site: 'anime' as const, href: 'https://x.test/a', label: 'All anime' }];
  it('starts on All, with four chips, the rows (rank, image or initials, title, line, plays or New) and the two ways to every quiz of a site', () => {
    const lists = { all: [card(1, 'kpop', 'https://img.test/1.jpg'), card(2, 'anime')], kpop: [card(1, 'kpop')], anime: [card(2, 'anime')], easy: [card(3, 'kpop')] };
    const html = renderToStaticMarkup(createElement(HomeHot, { lists, labels, allLinks: links }));
    expect(html).toContain('<section id="hot" aria-labelledby="hot-h" class="hub-h2-hot">');
    expect([...html.matchAll(/aria-pressed="(true|false)" class="hub-h2-segbtn"><span aria-hidden="true" class="[^"]+"><\/span>([^<]+)</g)].map((m) => [m[1], m[2]]))
      .toEqual([['true', 'All'], ['false', 'KpopQuiz'], ['false', 'OtakuQuiz'], ['false', 'Start easy']]);
    expect(html.match(/class="hub-h2-line hub-h2-hrow /g)).toHaveLength(2);
    expect(html).toContain('<img src="https://img.test/1.jpg" alt="" width="52" height="52" loading="lazy" decoding="async" class="hub-h2-th-img"/>');
    expect(html).toContain('<span aria-hidden="true" class="hub-h2-th hub-h2-hthumb">T2</span>');
    expect(html).toContain('<span class="hub-h2-hplays hub-h2-num">1k plays</span>');
    expect(html).toContain('<span class="hub-h2-newpill">New</span>');
    expect(html).toContain('Site · G1 · Easy');
    expect(html).toMatch(/>All K-pop<svg/);
  });

  it('leaves the Start easy chip out when there is no easy quiz', () => {
    const lists = { all: [card(1, 'kpop')], kpop: [card(1, 'kpop')], anime: [], easy: [] };
    const html = renderToStaticMarkup(createElement(HomeHot, { lists, labels, allLinks: links }));
    expect(html).not.toContain('Start easy');
    expect(html.match(/class="hub-h2-segbtn"/g)).toHaveLength(3);
  });
});

describe('Top fans', () => {
  const fan = (handle: string, level: number | null) => ({ handle, level });
  const labels = { title: 'Top fans this week', group: 'Leaderboard site', kpop: 'K-pop', anime: 'Anime', lv: 'Lv {level}' };
  it('starts on the K-pop board, with the two tabs, the rows linked to each fan\'s page on the hub, and the fan\'s own row marked', () => {
    const html = renderToStaticMarkup(createElement(HomeFans, { fans: { kpop: [fan('ann', 9), fan('me', 4), fan('cal', null)], anime: [fan('dee', 7)] }, me: 'me', labels }));
    expect([...html.matchAll(/aria-pressed="(true|false)"[^>]*>(K-pop|Anime)</g)].map((m) => [m[1], m[2]])).toEqual([['true', 'K-pop'], ['false', 'Anime']]);
    expect([...html.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1])).toEqual(['/u/ann', '/u/me', '/u/cal']);
    expect(html).toContain('class="hub-h2-line hub-h2-fan hub-h2-fan-me"');
    expect(html.match(/hub-h2-fan-me/g)).toHaveLength(1);
    expect(html).toContain('hub-h2-fan-av hub-h2-fan-av-top');
    expect(html.match(/class="hub-h2-fan-lv hub-h2-num"/g)).toHaveLength(2);
    expect(html).toContain('>Lv 9<');
    expect(html).not.toContain('dee');
  });

  it('has no tabs when only one site has public fans, and shows that board', () => {
    const html = renderToStaticMarkup(createElement(HomeFans, { fans: { kpop: [], anime: [fan('dee', 7)] }, me: null, labels }));
    expect(html).not.toContain('role="group"');
    expect(html).toContain('/u/dee');
    expect(html).not.toContain('hub-h2-fan-me');
  });
});
