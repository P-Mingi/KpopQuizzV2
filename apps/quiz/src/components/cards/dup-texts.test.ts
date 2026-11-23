// KpopCards launch polish 3 (2026-11-23): the odds page, the lobby's rules box and the help say, in plain English and with the figure read from
// KC.DUP_BIAS, that a drawn card leans toward the cards a player already owns, and what never does.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { KC } from '@/lib/kpopcards/contract';
import { dupBiasExempt, dupBiasPct, dupBiasRule } from '@/lib/kpopcards/dup-text';
import { helpData } from '@/lib/kpopcards/help-data';

import { CardsFaq } from './cards-faq';
import { DropRates } from './drop-rates';
import { OddsBox } from './odds-box';

const text = (html: string): string => html.replace(/<[^>]+>/g, '').replace(/&#x27;|&#39;|&apos;/g, "'");
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

describe('the duplicate rule in the texts', () => {
  it('the figure comes from KC.DUP_BIAS', () => {
    expect(dupBiasPct()).toBe(`${Math.round(KC.DUP_BIAS * 100)}%`);
    expect(dupBiasPct()).toBe('35%');
    expect(dupBiasRule()).toContain('a 35% chance that it is a card of that rarity you already own, when you own one');
    expect(dupBiasRule()).toContain('Otherwise it is any card of that rarity');
    expect(dupBiasRule()).toContain('The odds of each rarity do not change');
    expect(dupBiasExempt()).toContain('The Gold guarantee and the fifth card of a golden pack never work this way');
    expect(dupBiasExempt()).toContain('Duplicates still give shards and can be recycled');
    expect(dupBiasRule() + dupBiasExempt()).not.toMatch(DASH);
  });
  it.each([
    ['the odds page (rules of the packs)', () => text(renderToStaticMarkup(createElement(DropRates, { odds: null })))],
    ['the lobby box', () => text(renderToStaticMarkup(createElement(OddsBox, { odds: null })))],
    ['the help', () => text(renderToStaticMarkup(createElement(CardsFaq)))],
    ['the help data of the API', () => JSON.stringify(helpData().faq)],
  ])('%s says it, with the figure', (_n, render) => {
    const t = render();
    expect(t).toContain('35% chance');
    expect(t).toContain('you already own');
    expect(t).toContain('never work this way');
    expect(t).toContain('shards');
    expect(t).not.toMatch(DASH);
  });
});
