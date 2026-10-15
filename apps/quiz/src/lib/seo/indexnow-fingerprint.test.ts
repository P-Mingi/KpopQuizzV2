import { describe, expect, it } from 'vitest';

import { extractSignals, fingerprint, isIndexable, maskVolatile, visibleText } from './indexnow-fingerprint';

// SEO Mission 3 (CONTROLES): the fingerprint ignores volatile counters. Two renders of the
// same quiz page an hour apart differ in plays, average score, hall of fame, the rotating
// "Did you know" fact, the creator's level and "2 hours ago"; they must hash the same. A real
// edit (a question, the title, robots, canonical) must not.

interface Render {
  plays: number;
  avg: number;
  hof: Array<[string, string]>;
  dyk: string;
  level: string;
  ago: string;
  related: string[];
  question: string;
  title: string;
  robots?: string;
  canonical?: string;
}

const BASE: Render = {
  plays: 2535, avg: 51, hof: [['someone', '0:16'], ['mina', '0:17']], dyk: 'Suga was born in Daegu.', level: 'Lv 15 Ride-or-Die', ago: '2 hours ago',
  related: ['BTS solo era quiz', 'BTS lyrics quiz'], question: 'What was the first album to top the Billboard 200?', title: 'Ultimate BTS era quiz',
};

function page(r: Render): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/>
<title>${r.title} | KpopQuiz</title>
<meta name="description" content="${r.title}: a medium 8-question K-pop quiz on BTS. ${r.plays.toLocaleString('en-US')} fans have played it, scoring ${r.avg}% on average."/>
${r.robots ? `<meta name="robots" content="${r.robots}"/>` : ''}
<link rel="canonical" href="${r.canonical ?? 'https://kpopquiz.org/q/ultimate-bts-era-quiz'}"/>
<script>self.__next_f.push([1,"plays ${r.plays}"])</script>
</head><body><header><nav><a href="/">Home</a></nav></header>
<main id="main"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/bts-quiz">BTS Quiz</a></nav>
<h1 class="p4-title">${r.title}</h1>
<div class="p4-meta"><span>${r.plays.toLocaleString('en-US')} plays</span><span>Average ${r.avg}%</span></div>
<div class="p4-author"><span class="ux-ava" aria-hidden="true">M</span><span>by <a href="/u/mina">mina</a> · ${r.level}</span></div>
<section class="ux-sec" aria-labelledby="p4-hof-h"><div class="p4-hof-h"><h2 id="p4-hof-h">Hall of fame</h2><small>${r.plays % 300} perfect scores</small></div>
<div class="ux-rows">${r.hof.map(([n, t], i) => `<div class="p4-hrow"><span class="p4-rk">${i + 1}</span><span class="p4-nm">${n}</span><span class="p4-tm">${t}</span></div>`).join('')}</div></section>
<section class="ux-sec p4-dyk" aria-label="Did you know?"><p>${r.dyk}</p></section>
<section class="p4-about"><p>Test your BTS knowledge. ${r.plays.toLocaleString('en-US')} fans have battled it (avg ${r.avg}%). Updated ${r.ago}.</p>
<p class="p4-counts">Pass rate ${r.avg - 20}% · ${r.plays % 50} likes</p></section>
<ol><li><p>1. ${r.question}</p><ul><li>Wings</li><li>Love Yourself: Tear</li></ul></li></ol>
<section><h2>More BTS quizzes</h2>${r.related.map((t) => `<a class="ux-tcard" href="/q/${t}"><span>${t}</span><i>${r.plays % 97} plays</i></a>`).join('')}</section>
<button type="button">Start quiz</button>
</main><footer><a href="/about">About</a></footer></body></html>`;
}

const fp = (r: Render, path = '/q/ultimate-bts-era-quiz'): string => fingerprint(extractSignals(page(r), path));

describe('IndexNow fingerprint', () => {
  it('two renders that differ only in counters, rankings, rotating cards and relative times hash the same', () => {
    const later: Render = {
      ...BASE, plays: 2536, avg: 52, hof: [['newfan', '0:15'], ['someone', '0:16']], dyk: 'RM learned English from a TV show.',
      level: 'Lv 16 Day-One', ago: '3 hours ago', related: ['BTS lyrics quiz', 'BTS solo era quiz'],
    };
    expect(fp(later)).toBe(fp(BASE));
    // "1 fan" and "2 fans": the plural after a count is not a change either
    expect(maskVolatile('1 fan played today')).toBe(maskVolatile('2 fans played today'));
  });

  it('a real edit changes it: a question, the title, the robots directive, the canonical', () => {
    const base = fp(BASE);
    expect(fp({ ...BASE, question: 'Which album was the first to top the Billboard 200?' })).not.toBe(base);
    expect(fp({ ...BASE, title: 'The ultimate BTS era quiz' })).not.toBe(base);
    expect(fp({ ...BASE, robots: 'noindex, follow' })).not.toBe(base);
    expect(fp({ ...BASE, canonical: 'https://kpopquiz.org/bts-quiz' })).not.toBe(base);
  });

  it('reads title, description, H1, robots and canonical from the page', () => {
    const s = extractSignals(page({ ...BASE, robots: 'noindex, follow' }), '/q/ultimate-bts-era-quiz', 'noarchive');
    expect(s.title).toBe('Ultimate BTS era quiz | KpopQuiz');
    expect(s.description).toBe('Ultimate BTS era quiz: a medium #-question K-pop quiz on BTS. # fan have played it, scoring #% on average.');
    expect(s.h1).toBe('Ultimate BTS era quiz');
    expect(s.robots).toBe('follow,noarchive,noindex');
    expect(s.canonical).toBe('https://kpopquiz.org/q/ultimate-bts-era-quiz');
    // main content: no script, no link text, no button, no hall of fame, no rotating fact
    expect(s.main).toContain('What was the first album to top the Billboard #?');
    for (const gone of ['Home', 'BTS solo era quiz', 'Start quiz', 'Hall of fame', 'Suga', 'mina', 'Ride-or-Die', 'perfect scores', 'likes', 'self.__next_f']) {
      expect(s.main).not.toContain(gone);
    }
  });

  it('pages whose main content is a moving ranking are fingerprinted on their head only', () => {
    const board = (names: string): string => `<html><head><title>Leaderboard | KpopQuiz</title></head><body><main><h1>Community</h1><ol><li>${names}</li></ol></main></body></html>`;
    const a = fingerprint(extractSignals(board('alice bob'), '/leaderboard'));
    const b = fingerprint(extractSignals(board('carol dave'), '/leaderboard'));
    expect(a).toBe(b);
    expect(fingerprint(extractSignals(board('alice bob'), '/articles/x'))).not.toBe(fingerprint(extractSignals(board('carol dave'), '/articles/x')));
  });

  it('visibleText keeps nested text, skips skipped subtrees whole and survives stray markup', () => {
    expect(visibleText('<div>a <b>b</b><a href="/x">link <i>deep</i></a> c</div>')).toBe('a b c');
    expect(visibleText('<p>x</p><svg><text>svg text</text></svg><p>y &amp; z &#39;q&#39;</p>')).toBe("x y & z 'q'");
    expect(visibleText('<p>1 < 2 <span data-volatile>gone</span></p><br/><img alt="a"/>end')).toBe('1 < 2 end');
  });

  it('indexable: 200, no noindex, canonical to itself (trailing slash and the home page included)', () => {
    const ok = extractSignals(page(BASE), '/q/ultimate-bts-era-quiz');
    expect(isIndexable(200, ok, 'https://kpopquiz.org/q/ultimate-bts-era-quiz')).toBe(true);
    expect(isIndexable(404, ok, 'https://kpopquiz.org/q/ultimate-bts-era-quiz')).toBe(false);
    expect(isIndexable(200, { ...ok, robots: 'follow,noindex' }, 'https://kpopquiz.org/q/ultimate-bts-era-quiz')).toBe(false);
    expect(isIndexable(200, { ...ok, canonical: 'https://kpopquiz.org/blindtest/classic' }, 'https://kpopquiz.org/blindtest/intro-challenge')).toBe(false);
    expect(isIndexable(200, { ...ok, canonical: 'https://kpopquiz.org' }, 'https://kpopquiz.org/')).toBe(true);
    expect(isIndexable(200, { ...ok, canonical: '' }, 'https://kpopquiz.org/x')).toBe(true);
  });
});
