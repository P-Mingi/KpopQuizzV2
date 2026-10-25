import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { pickSurprise } from '@/lib/site/hub/data/surprise-pick';

import { HomeBlindtest } from './home-blindtest';
import { HomeCountdown, minutesToReset, resetText } from './home-countdown';
import { HomeFilterProvider, HomeSearch, searchSite } from './home-filter';
import { HomeHot } from './home-hot';
import { HomeQuestion } from './home-question';
import { HomeSurprise } from './home-surprise';

import type { HotCard } from './home-hot';

// Lot H2a: the islands of the new home, as the design's script has them. Their first render (what the server prints, before any click)
// and the rules of their small logic; the clicks themselves are driven in a browser (docs/o1/reports/H2/).

describe('Surprise me', () => {
  const card = (id: string, site: 'kpop' | 'anime') => ({ id, tile: id.toUpperCase(), title: `Quiz ${id}`, href: `https://x.test/${id}`, site, pickLabel: `Your random pick on ${site}` });

  it('prints the button and the sentence, and no pick card, before the first click', () => {
    const html = renderToStaticMarkup(createElement(HomeSurprise, {
      pool: [card('a', 'kpop')],
      playedIds: [],
      labels: { button: 'Surprise me', note: 'A random quiz.', play: 'Play', another: 'Another' },
    }));
    expect(html).toContain('Surprise me');
    expect(html).toContain('A random quiz.');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('Another');
  });

  it('prints nothing with no pool', () => {
    const html = renderToStaticMarkup(createElement(HomeSurprise, {
      pool: [], playedIds: [], labels: { button: 'Surprise me', note: 'A random quiz.', play: 'Play', another: 'Another' },
    }));
    expect(html).toBe('');
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
    expect(minutesToReset(at('2026-07-01T00:05:00Z'), NEXT)).toBe(1440);
    expect(minutesToReset(at('2026-07-01T00:00:00Z'), '2026-07-01T00:05:00.000Z')).toBe(5);
    expect(minutesToReset(at('2026-07-01T10:05:00Z'), NEXT)).toBe(14 * 60);
    expect(minutesToReset(at('2026-12-01T01:05:00Z'), '2026-12-02T00:05:00.000Z')).toBe(23 * 60);
    expect(minutesToReset(at('2026-12-01T12:00:00Z'), '2026-12-02T00:05:00.000Z')).toBe(12 * 60 + 5);
  });

  it('rolls to the next day once the instant has passed, as a page left open overnight does', () => {
    expect(minutesToReset(at('2026-07-02T00:04:30Z'), NEXT)).toBe(1);
    expect(minutesToReset(at('2026-07-02T00:05:00Z'), NEXT)).toBe(1440);
    expect(minutesToReset(at('2026-07-02T00:06:00Z'), NEXT)).toBe(1439);
    expect(minutesToReset(at('2026-07-05T12:05:00Z'), NEXT)).toBe(12 * 60);
  });

  it('writes the time as "8 h 47 min"', () => {
    expect(resetText(at('2026-07-01T10:05:00Z'), NEXT)).toBe('14 h 0 min');
    expect(resetText(at('2026-07-01T09:00:00Z'), NEXT)).toBe('15 h 5 min');
  });

  it('prints the words of the server before the clock takes over, with the Paris time of the module', () => {
    const html = renderToStaticMarkup(createElement(HomeCountdown, { template: 'New picks in {time} (1:05, Paris time)', fallback: 'a few hours', nextAt: NEXT }));
    expect(html).toContain('New picks in a few hours (1:05, Paris time)');
  });
});

describe('the blindtest player', () => {
  it('starts on "press play" with a full labelled button and an empty bar, and loads no sound', () => {
    const html = renderToStaticMarkup(createElement(HomeBlindtest, {
      songs: 10, seconds: 10, previewUrl: 'https://cdn.test/first.mp3',
      labels: { playAria: 'Play a 10 second preview', pauseAria: 'Pause the preview', press: 'Song 1 of 10 · press play', playing: 'x {sec}', done: 'y {rest}' },
    }));
    expect(html).toContain('aria-label="Play a 10 second preview"');
    expect(html).toContain('Song 1 of 10 · press play');
    expect(html).toContain('style="width:0%"');
    expect(html).toContain('<path d="M7 4.5v15l13-7.5z"></path>');
    // the preview address is not in the markup (an audio element is made on the first press only)
    expect(html).not.toContain('first.mp3');
    expect(html).not.toContain('<audio');
  });
});

describe('the question', () => {
  const props = {
    site: 'kpop' as const, text: 'Which?', options: ['A', 'B', 'C', 'D'], correct: 2, explain: 'Long.', explainShort: 'Short.', href: 'https://kpopquiz.org/q/x',
    fromLabel: 'From X', labels: { question: 'Quick question', right: 'Right', wrong: 'Wrong', markRight: 'Right answer', markPick: 'Your pick', again: 'Try again', full: 'Play the full quiz on KpopQuiz', fullShort: 'Play the full quiz' },
  };
  it('prints four answers and no result before a pick', () => {
    const html = renderToStaticMarkup(createElement(HomeQuestion, props));
    expect(html.match(/<button type="button" class="hub-h2-opt"/g)).toHaveLength(4);
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('hub-h2-opt-ok');
  });
});

describe('Hot right now', () => {
  const card = (n: number, site: 'kpop' | 'anime'): HotCard => ({ site, tile: `T${n}`, title: `Quiz ${n}`, href: `https://x.test/${n}`, line: `Site · G${n}`, meta: 'Easy · True or false', phoneMeta: 'Easy', plays: site === 'kpop' ? '1k plays' : '', isNew: site === 'anime' });
  const labels = { title: 'Hot', sub: 'Sub', filter: 'Filter by site', all: 'All', kpop: 'KpopQuiz', anime: 'OtakuQuiz', kpopShort: 'K-pop', animeShort: 'Anime', newLabel: 'New' };
  it('starts on All, with the two ways to every quiz of a site and the phone line of each card', () => {
    const lists = { all: [card(1, 'kpop'), card(2, 'anime')], kpop: [card(1, 'kpop')], anime: [card(2, 'anime')] };
    const html = renderToStaticMarkup(createElement(HomeHot, { lists, labels, allLinks: [{ site: 'kpop', href: 'https://x.test/k', label: 'All K-pop' }, { site: 'anime', href: 'https://x.test/a', label: 'All anime' }] }));
    expect(html).toContain('aria-pressed="true" class="hub-h2-segbtn"><span aria-hidden="true" class="hub-h2-segdot"></span><span class="hub-h2-nophone">All</span>');
    expect(html.match(/aria-pressed="false"/g)).toHaveLength(2);
    expect(html).toContain('Easy · New');
    expect(html).toContain('Easy · 1k plays');
    expect(html).toContain('>All K-pop</a>');
  });
});
