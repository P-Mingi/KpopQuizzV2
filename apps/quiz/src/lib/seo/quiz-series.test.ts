import { describe, expect, it } from 'vitest';

import { seriesSiblings } from './quiz-series';

const BTS = { name: 'BTS', fandom: 'ARMY' };
const q = (slug: string, title: string, play_count = 0) => ({ slug, title, play_count });

describe('seriesSiblings', () => {
  // Cluster K02 of the audit (DUPLICATES-2026-10-27.md): four BTS true or false quizzes.
  const k02 = [
    q('bts-true-or-false-bet-you-cant-get-100', "BTS true or false - bet you can't get 100%", 1327),
    q('bts-true-or-false-test-your-army-knowledge', 'BTS true or false - test your ARMY knowledge', 767),
    q('bts-true-or-false-harder-edition', 'BTS true or false - harder edition', 116),
    q('bts-true-or-false', 'BTS True or False', 28),
  ];
  const eras = [q('bts-wings-era-quiz', 'BTS Wings era quiz', 50), q('bts-love-yourself-era', 'BTS Love Yourself era quiz', 40)];
  const all = [...k02, ...eras];

  it('the four true or false quizzes find each other, closest title first, never themselves', () => {
    // Words left of "BTS True or False": "false". Army knowledge: "false" (1), harder edition: "false harder" (0.5),
    // bet you can't get 100: "false bet 100" (0.33).
    expect(seriesSiblings(k02[3]!, all, BTS, 3)).toEqual([k02[1]!.slug, k02[2]!.slug, k02[0]!.slug]);
    for (const me of k02) expect(seriesSiblings(me, all, BTS, 9).sort()).toEqual(k02.filter((x) => x !== me).map((x) => x.slug).sort());
  });

  it('two quizzes on different eras are not siblings', () => {
    expect(seriesSiblings(eras[0]!, all, BTS, 3)).toEqual([]);
  });

  it('close titles are siblings, the closest first', () => {
    const list = [q('a', 'BTS Map of the Soul era deep dive', 5), q('b', 'BTS Map of the Soul era', 9), q('c', 'BTS Map of the Soul deep dive', 1), q('d', 'BTS Butter era', 99)];
    expect(seriesSiblings(list[0]!, list, BTS, 3)).toEqual(['c', 'b']);
  });

  it('a title with nothing but the group or fandom name is a fan test, like the "real fan" titles', () => {
    const cortis = { name: 'Cortis', fandom: 'COER' };
    const list = [q('cortis-quiz', 'Cortis quiz', 10), q('are-you-a-real-coer', 'Are you a real COER?', 20), q('cortis-debut-songs', 'Cortis debut songs', 30)];
    expect(seriesSiblings(list[0]!, list, cortis, 3)).toEqual(['are-you-a-real-coer']);
    expect(seriesSiblings(list[1]!, list, cortis, 3)).toEqual(['cortis-quiz']);
  });

  it('ties go to the most played, and it stops at max', () => {
    // From "false bet 100", army knowledge ("false", 767 plays) and "BTS True or False" ("false", 28) tie at 0.33.
    expect(seriesSiblings(k02[0]!, all, BTS, 1)).toEqual(['bts-true-or-false-test-your-army-knowledge']);
    expect(seriesSiblings(k02[0]!, all, BTS, 0)).toEqual([]);
  });
});
