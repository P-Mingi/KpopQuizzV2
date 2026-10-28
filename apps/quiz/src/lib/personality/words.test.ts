// Run O1 (PERS-2): the words of the pick offer under a result and the call to action of the story image come from the site. kpop keeps
// today's strings; anime says oshi and fandomverse.org/anime. components/personality/quiz.tsx holds no kpop literal of its own any more.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { siteAddress } from '@/lib/site/brand';
import { siteConfig } from '@/lib/site/registry';

import { pickOfferWords, playCta } from './view';

const kpop = siteConfig('kpop');
const anime = siteConfig('anime');

describe('pickOfferWords and playCta', () => {
  it('kpop: the strings of the component before this change', () => {
    const o = pickOfferWords(kpop.vocabulary.favourites.pickLabel);
    expect(o.tag).toBe('bias tag');
    expect(o.button).toBe('Set bias');
    expect(o.doneToast('Jimin')).toBe('Bias tag set to Jimin');
    expect(playCta(siteAddress(kpop))).toBe('Play at kpopquiz.org');
  });

  it('anime: oshi and fandomverse.org/anime', () => {
    const o = pickOfferWords(anime.vocabulary.favourites.pickLabel);
    expect(o.tag).toBe('oshi tag');
    expect(o.button).toBe('Set as oshi');
    expect(o.doneToast('L')).toBe('Oshi tag set to L');
    expect(playCta(siteAddress(anime))).toBe('Play at fandomverse.org/anime');
  });

  it('the word of an offer never says bias on anime, and never says oshi on kpop', () => {
    const k = JSON.stringify([pickOfferWords(kpop.vocabulary.favourites.pickLabel), playCta(siteAddress(kpop))]);
    const a = [pickOfferWords(anime.vocabulary.favourites.pickLabel).tag, pickOfferWords(anime.vocabulary.favourites.pickLabel).button, playCta(siteAddress(anime))].join(' ');
    expect(a).not.toMatch(/bias|kpop/i);
    expect(k).not.toMatch(/oshi|otaku/i);
  });
});

describe('quiz.tsx', () => {
  const src = readFileSync(fileURLToPath(new URL('../../components/personality/quiz.tsx', import.meta.url)), 'utf8');
  it('reads the site for its words: no kpop host and no bias wording written in the component', () => {
    expect(src).toMatch(/pickOfferWords\(SITE\.vocabulary\.favourites\.pickLabel\)/);
    expect(src).toMatch(/playCta\(SITE\.url\.replace\(/);
    expect(src).not.toMatch(/kpopquiz\.org/i);
    expect(src).not.toMatch(/bias tag|Set bias/);
  });
});
