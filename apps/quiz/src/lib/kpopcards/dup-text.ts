// KpopCards: the words about duplicates (the owner's rule of 2026-11-23, 126-dup-bias.sql). One place for the odds page, the lobby box and the help,
// so the figure is read from KC.DUP_BIAS everywhere and never typed. Plain English, no dash.
import { KC } from './contract';

/** "35%" */
export const dupBiasPct = (): string => `${Math.round(KC.DUP_BIAS * 100)}%`;

/** What the bias does, after the rarity is drawn. */
export const dupBiasRule = (): string =>
  `Once a card's rarity is drawn, there is a ${dupBiasPct()} chance that it is a card of that rarity you already own, when you own one. Otherwise it is any card of that rarity. The odds of each rarity do not change.`;

/**
 * The rule in one sentence, for the answer block of the odds page (40 to 60 words in all): the same figure, the same "when you own one", and the two cards the rule never touches
 * (the Gold guarantee and the golden fifth card). The full wording stays in `dupBiasRule` and `dupBiasExempt`, which the page prints below.
 */
export const dupBiasBrief = (): string =>
  `A drawn rarity has a ${dupBiasPct()} chance to be a card you already own, when you own one, except the Gold guarantee and the golden fifth card.`;

/** What the bias never touches, and what a duplicate is worth. */
export const dupBiasExempt = (): string =>
  'The Gold guarantee and the fifth card of a golden pack never work this way. A pack never holds the same card twice, when its rarity has other cards. Duplicates still give shards and can be recycled.';
