import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { HomeBlindtest } from './home-blindtest';
import { minutesToReset, resetText } from './home-countdown';
import { HomeHot } from './home-hot';
import { HomeQuestion } from './home-question';
import { HomeSurprise, nextPick } from './home-surprise';

import type { HotCard } from './home-hot';

// Lot H2a: the islands of the new home, as the design's script has them. Their first render (what the server prints, before any click)
// and the rules of their small logic; the clicks themselves are driven in a browser (docs/o1/reports/H2/).

describe('Surprise me', () => {
  it('never gives the same quiz twice in a row, and always stays inside the pool', () => {
    for (let size = 2; size <= 12; size++) {
      for (let cur = 0; cur < size; cur++) {
        for (const r of [0, 0.2, 0.5, 0.99999]) {
          const next = nextPick(cur, size, () => r);
          expect(next).not.toBe(cur);
          expect(next).toBeGreaterThanOrEqual(0);
          expect(next).toBeLessThan(size);
        }
      }
    }
    expect(nextPick(null, 12, () => 0.5)).toBe(6);
  });

  it('prints the button and the sentence, and no pick card, before the first click', () => {
    const html = renderToStaticMarkup(createElement(HomeSurprise, {
      pool: [{ tile: 'BTS', title: 'A quiz', href: 'https://kpopquiz.org/q/a', site: 'kpop', pickLabel: 'Your random pick on KpopQuiz' }],
      labels: { button: 'Surprise me', note: 'A random quiz.', play: 'Play', another: 'Another' },
    }));
    expect(html).toContain('Surprise me');
    expect(html).toContain('A random quiz.');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('Another');
  });
});

describe('the countdown to 2:05, Paris time', () => {
  const at = (iso: string): Date => new Date(iso);
  it('counts to the next 2:05 in Paris, summer and winter time', () => {
    // 2026-07-01 is summer time (UTC+2): 00:05 UTC is 02:05 in Paris, which is a full day away
    expect(minutesToReset(at('2026-07-01T00:05:00Z'))).toBe(1440);
    expect(minutesToReset(at('2026-07-01T00:00:00Z'))).toBe(5);
    expect(minutesToReset(at('2026-07-01T10:05:00Z'))).toBe(14 * 60);
    // 2026-12-01 is winter time (UTC+1): 01:05 UTC is 02:05 in Paris
    expect(minutesToReset(at('2026-12-01T01:05:00Z'))).toBe(1440);
    expect(minutesToReset(at('2026-12-01T12:00:00Z'))).toBe(13 * 60 + 5);
  });

  it('writes the time as "8 h 47 min"', () => {
    expect(resetText(at('2026-07-01T10:05:00Z'))).toBe('14 h 0 min');
    expect(resetText(at('2026-07-01T09:00:00Z'))).toBe('15 h 5 min');
  });
});

describe('the blindtest player', () => {
  it('starts on "press play" with a full labelled button and an empty bar', () => {
    const html = renderToStaticMarkup(createElement(HomeBlindtest, {
      songs: 5, seconds: 10,
      labels: { playAria: 'Play a 10 second preview', pauseAria: 'Pause the preview', press: 'Song 1 of 5 · press play', playing: 'x {sec}', done: 'y {rest}' },
    }));
    expect(html).toContain('aria-label="Play a 10 second preview"');
    expect(html).toContain('Song 1 of 5 · press play');
    expect(html).toContain('style="width:0%"');
    expect(html).toContain('<path d="M7 4.5v15l13-7.5z"></path>');
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
