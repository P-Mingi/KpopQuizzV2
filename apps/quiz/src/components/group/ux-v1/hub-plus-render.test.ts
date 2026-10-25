// SEO Mission 2 part B: the strengthened hub sections rendered server side. Every section is
// an H2 with real <a href>s and HTML tables in the markup; numbers appear with their
// denominators; a section under its floor says so and shows no number; no dash anywhere.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { hubPlus } from '@/lib/hubs/hub-plus';
import { pooledScore, rankByMeasuredScore } from '@/lib/hubs/hub-scores';

import { HubPlusFacts, HubPlusTop } from './hub-plus';

const q = (slug: string, title: string, completions: number, pct: number, questions = 8, created_at = '2026-04-01T00:00:00Z') => ({
  slug, title, quiz_type: 'multiple_choice', difficulty: 'medium', play_count: completions, like_count: 0,
  total_completions: completions, total_score_sum: Math.round((pct / 100) * completions * questions), question_count: questions, created_at,
});

const QUIZZES = [
  q('how-well-do-you-know-bts-members', 'How well do you know BTS members?', 72, 92, 6, '2026-03-26T00:00:00Z'),
  q('ultimate-bts-era-quiz', 'Ultimate BTS era quiz', 2536, 51, 8, '2026-03-10T00:00:00Z'),
  q('bts-discography-challenge', 'BTS discography challenge', 615, 62, 6, '2026-03-30T00:00:00Z'),
  q('guess-the-bts-song', 'Guess the BTS Song!', 2, 90, 5, '2026-10-15T00:00:00Z'),
];

const h2s = (html: string): string[] => [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => m[1]!.replace(/<[^>]+>/g, ''));

describe('HubPlusTop', () => {
  const scored = rankByMeasuredScore(QUIZZES);
  const html = renderToStaticMarkup(createElement(HubPlusTop, { name: 'BTS', slug: 'bts', quizzes: QUIZZES, ranked: scored.ranked, belowFloor: scored.belowFloor, songs: 120 }));

  it('the four sections, in reading order', () => {
    expect(h2s(html)).toEqual(['Pick a BTS quiz by level', 'BTS quizzes by topic', 'Guess the BTS song', 'Newest BTS quizzes']);
  });

  it('ranks by measured score with attempts, and counts the quizzes below the floor', () => {
    const table = /<table class="p3x-table">([\s\S]*?)<\/table>/.exec(html)![1]!;
    const order = [...table.matchAll(/href="\/q\/([^"]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(['how-well-do-you-know-bts-members', 'bts-discography-challenge', 'ultimate-bts-era-quiz']);
    expect(table).toContain('2,536');
    expect(html).toContain('1 more BTS quiz has fewer than 50 attempts and is not ranked yet.');
  });

  it('links the blind test with its exact anchor and the song count', () => {
    expect(html).toContain('href="/blindtest/group-bts">BTS blind test</a>');
    expect(html).toContain('120 BTS songs are in the blind test today.');
  });

  it('the newest quiz first, with a real date', () => {
    const newest = /aria-labelledby="p3x-new-h"[\s\S]*?<\/section>/.exec(html)![0];
    expect(newest.indexOf('guess-the-bts-song')).toBeLessThan(newest.indexOf('bts-discography-challenge'));
    expect(newest).toContain('<time dateTime="2026-10-15">');
  });

  it('no dash', () => {
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('HubPlusFacts', () => {
  const plus = hubPlus('bts')!;

  it('the sourced table, the members table and the measured scores', () => {
    const scored = rankByMeasuredScore(QUIZZES);
    const html = renderToStaticMarkup(createElement(HubPlusFacts, { name: 'BTS', plus, generation: '3rd Gen', pooled: pooledScore(QUIZZES), ranked: scored.ranked, asOf: '2026-10-15T12:00:00Z' }));
    expect(h2s(html)).toEqual(['BTS in 30 seconds', 'How fans score on BTS quizzes']);
    for (const label of ['Members', 'Debut', 'Label', 'Fandom', 'Generation']) expect(html).toContain(`<th scope="row">${label}</th>`);
    expect(html).toContain('3rd generation');
    expect(html).toContain('https://www.wikidata.org/wiki/');
    expect(html).toContain('<th scope="row">Jung Kook</th>');
    expect(html).toContain('Sources checked on 15 October 2026');
    expect(html).toMatch(/Fans average <b>\d+%<\/b> on BTS quizzes, over <b>3,225<\/b> scored attempts on 4 quizzes, since March 2026 \(as of October 2026\)\./);
    expect(html).toContain('href="/data/knowledge-report-2026"');
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });

  it('under the floor: no number, and no generation row without the group data', () => {
    const few = [q('a', 'A quiz', 10, 50)];
    const html = renderToStaticMarkup(createElement(HubPlusFacts, { name: 'BTS', plus, generation: null, pooled: pooledScore(few), ranked: [], asOf: '2026-10-15T12:00:00Z' }));
    expect(html).toContain('Not enough data yet: BTS quizzes have fewer than 100 scored attempts so far.');
    expect(html).not.toContain('Fans average');
    expect(html).not.toContain('<th scope="row">Generation</th>');
  });
});
