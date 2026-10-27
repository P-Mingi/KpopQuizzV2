import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { topResults, WmaAbout } from './about';

import type { QuizView } from '@/lib/personality/view';

// The most common results printed below a Which member are you quiz (owner, 2026-10-13:
// SEO): the top three only, never the member fans get least (SYSTEM.md 5.1).

describe('topResults', () => {
  const d = { total: 140, rows: [
    { id: 'rm', label: 'RM', pct: 6.43 }, { id: 'jin', label: 'Jin', pct: 11.43 }, { id: 'suga', label: 'Suga', pct: 5 },
    { id: 'j-hope', label: 'J-Hope', pct: 0.4 }, { id: 'jimin', label: 'Jimin', pct: 54.29 }, { id: 'v', label: 'V', pct: 22.45 },
  ] };
  it('the three biggest, rounded, biggest first', () => {
    expect(topResults(d)).toEqual([{ label: 'Jimin', pct: 54 }, { label: 'V', pct: 22 }, { label: 'Jin', pct: 11 }]);
  });
  it('nothing under the floor, and never a 0%', () => {
    expect(topResults(null)).toEqual([]);
    expect(topResults({ total: 30, rows: [{ id: 'a', label: 'A', pct: 99.8 }, { id: 'b', label: 'B', pct: 0.2 }] }, 3)).toEqual([{ label: 'A', pct: 100 }]);
  });
});

// Run O1 (PERS-2): the words and the paths of the block are props, and today's are the defaults (the kpop render tree is pinned by
// o1-kpop-personality-tree.test.ts, written from the base commit).
const VIEW = {
  results: [{ id: 'rm', name: 'RM', role: 'Leader', description: 'About RM.', traits: ['Calm'] }],
  distribution: null,
  questions: [], // main's kpop block counts them
} as unknown as QuizView;
const GROUP = { slug: 'bts', name: 'BTS' };
const NAMES = new Map([['bts', 'BTS'], ['twice', 'TWICE']]);
const text = (html: string): string => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const hrefs = (html: string): string[] => [...html.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]!);

describe('WmaAbout words and paths', () => {
  it('default: member, bias, group and /which-<slug>-member-are-you', () => {
    const html = renderToString(h(WmaAbout, { group: GROUP, view: VIEW, wmaSlugs: ['bts', 'twice'], names: NAMES }));
    // Fusion A5: the kpop block is main's (sourced members, how the result is calculated); its prose says member and group.
    expect(text(html)).toContain('Your result is the BTS member whose quiz profile is closest to your answers, across six scales.');
    expect(text(html)).toContain('Which member are you, for another group');
    expect(text(html)).toContain('Which TWICE member are you?');
    expect(hrefs(html)).toContain('/which-twice-member-are-you');
  });

  it('words and pathFor: the anime page says character, oshi and series and links the pretty URL of the other series', () => {
    const html = renderToString(h(WmaAbout, {
      group: { slug: 'death-note', name: 'Death Note' }, view: VIEW, wmaSlugs: ['death-note', 'twice'], names: new Map([['death-note', 'Death Note'], ['twice', 'TWICE']]),
      words: { member: 'character', bias: 'oshi', topic: 'series' }, pathFor: (s: string) => `/which-${s}-character-are-you`,
    }));
    expect(text(html)).toContain('your result is the Death Note character whose profile is closest. There are no right answers and no timer: answer for yourself, not for your oshi.');
    expect(text(html)).toContain('Which character are you, for another series');
    expect(text(html)).toContain('Which TWICE character are you?');
    expect(hrefs(html)).toContain('/which-twice-character-are-you');
    expect(text(html)).not.toMatch(/\bmember|\bbias\b|another group/i);
  });

  it('the topic word is optional: words without it keep group', () => {
    const html = renderToString(h(WmaAbout, { group: GROUP, view: VIEW, wmaSlugs: ['bts', 'twice'], names: NAMES, words: { member: 'idol', bias: 'bias' } }));
    expect(text(html)).toContain('Which idol are you, for another group');
  });
});
