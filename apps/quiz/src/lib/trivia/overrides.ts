import { normalizeFactKey } from './fact-key';

import type { TriviaCategory, TriviaFact } from './types';

/**
 * A version-controlled correction applied to an auto-derived trivia fact.
 *
 * `match` is the `normalizeFactKey` of the fact to target.
 *  - suppress      drop the fact entirely (e.g. it is wrong or low quality)
 *  - replace       swap the fact text for `replacement` (re-keyed + re-deduped)
 *  - recategorize  keep the text but move it to `category`
 */
export interface TriviaOverride {
  match: string;
  action: 'suppress' | 'replace' | 'recategorize';
  replacement?: string;
  category?: TriviaCategory;
  reason: string;
  verifiedAt?: string;
}

/**
 * Override table keyed by group SLUG. Intentionally EMPTY for now: J1b populates
 * it after verifying facts against the corpus in docs/trivia-corpus.json.
 */
export const TRIVIA_OVERRIDES: Record<string, TriviaOverride[]> = {
  // J1b batch 1 - BTS. 97 corpus facts verified (web-checked all 2026 ARIRANG
  // record claims + chart/award "first" claims). 82 kept, 9 suppressed,
  // 5 replaced, 1 recategorized.
  bts: [
    // --- suppress (wrong / unverifiable / vague) ---
    {
      match: 'the album references both the 7 members and 7 years since de',
      action: 'suppress',
      reason: 'Vague: "the album" is unnamed and contextless once removed from its source quiz.',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'the love yourself tour visited asia north america europe and',
      action: 'suppress',
      reason: 'Garbled: claims "4 continents" but lists Asia, North America, Europe + Japan (Japan is in Asia) = 3.',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'swim is a lofi synthdriven track about not comparing your pa',
      action: 'suppress',
      reason: 'Wrong description: official sources call SWIM an upbeat alternative pop song, not lo-fi synth; MV record unverified. koreatimes.co.kr/entertainment/k-pop/20260304',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'arirang has 14 tracks  making it btss longest studio album t',
      action: 'suppress',
      reason: 'Wrong: ARIRANG (14 tracks) is not BTS longest album; Map of the Soul: 7 had 20 tracks. "No solo/unit tracks" also unverified.',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'the comeback date was first teased through handwritten lette',
      action: 'suppress',
      reason: 'Unverifiable marketing claim (handwritten letters mailed to ARMY on New Year Day); only the 2026-03-20 release date is confirmable.',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'body to body samples the traditional korean folk song ariran',
      action: 'suppress',
      reason: 'Unverified specific musical claims (Arirang sample, electric-to-acoustic, pansori vocal) about the track Body to Body.',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'wings was released in october 2016 and marked btss first alb',
      action: 'suppress',
      reason: 'Wrong: BTS first Billboard 200 entry was The Most Beautiful Moment in Life Pt.2 (No. 171, Nov 2015), not Wings. billboard.com/pro/bts-most-beautiful-moment-in-life-pt-2-billboard-200-charts',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'the euphoria mv features dreamlike sequences with jungkook b',
      action: 'suppress',
      reason: 'Unverifiable specific MV visual (Jungkook bungee jumping and flying).',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'dynamite debuted at 1 in september 2020',
      action: 'suppress',
      reason: 'Vague and redundant; the date conflicts with the precise Aug 22, 2020 Hot 100 #1 fact already kept in the set.',
      verifiedAt: '2026-06-11',
    },

    // --- replace (true core, one wrong/unverified detail removed) ---
    {
      match: 'the free concert at gwanghwamun square drew over 100000 atte',
      action: 'replace',
      replacement: 'The free comeback concert at Gwanghwamun Square in Seoul was livestreamed on Netflix and drew 18.4 million global viewers.',
      reason: 'In-person attendance (100k+) is disputed; the 18.4M Netflix viewership is confirmed. variety.com/2026/tv/news/bts-the-comeback-live-arirang-ratings-netflix',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'the livestream reached netflixs weekly top 10 in 80 countrie',
      action: 'replace',
      replacement: "The livestream was among Netflix's 10 most-watched titles of the week in 80 countries and ranked No. 1 in 24 of them.",
      reason: 'Drops the unverified "6th most-watched live event ever" ranking; Top 10 in 80 countries and No. 1 in 24 are confirmed.',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'arirang hit 1 million sales in just 10 minutes on hanteo cha',
      action: 'replace',
      replacement: 'ARIRANG sold 3.98 million copies on its first day on the Hanteo Chart, surpassing the first-week record of 3.37 million set by Map of the Soul: 7.',
      reason: 'The "1 million in 10 minutes" figure is unverified; the 3.98M first-day total surpassing MOTS:7 is confirmed. koreatimes.co.kr/entertainment/k-pop/20260327',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'arirang features production from diplo ryan tedder onerepubl',
      action: 'replace',
      replacement: 'ARIRANG features production from Diplo, Ryan Tedder (OneRepublic), Mike WiLL Made-It, El Guincho, JPEGMAFIA, and Kevin Parker (Tame Impala).',
      reason: 'Flume is not among the credited producers; the other six are confirmed. koreatimes.co.kr/entertainment/k-pop/20260320 meet-the-global-producers',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'bts addressed the 73rd un general assembly on september 24 2',
      action: 'replace',
      replacement: 'BTS addressed the 73rd UN General Assembly on September 24, 2018, as part of the UNICEF Generation Unlimited initiative. RM delivered the speech in English.',
      reason: 'Correction: RM gave the 2018 UN speech in English, not Korean. unicef.org/press-releases/we-have-learned-love-ourselves-so-now-i-urge-you-speak-yourself',
      verifiedAt: '2026-06-11',
    },

    // --- recategorize (accurate, wrong bucket) ---
    {
      match: 'life goes on debuted at 1 in november 2020 the first koreanl',
      action: 'recategorize',
      category: 'music',
      reason: 'Auto-categorized as members; it is a song chart achievement.',
      verifiedAt: '2026-06-11',
    },
  ],
};

/**
 * Apply a group's overrides to its already-deduped fact list. Suppressions drop
 * facts; replacements swap text (then we re-dedupe, since a replacement can
 * collide with an existing fact); recategorizations move a fact's category.
 */
export function applyOverrides(groupSlug: string, facts: TriviaFact[]): TriviaFact[] {
  const overrides = TRIVIA_OVERRIDES[groupSlug];
  if (!overrides || overrides.length === 0) return facts;

  const byMatch = new Map<string, TriviaOverride>();
  for (const o of overrides) byMatch.set(o.match, o);

  const out: TriviaFact[] = [];
  for (const f of facts) {
    const override = byMatch.get(normalizeFactKey(f.fact));
    if (!override) {
      out.push(f);
      continue;
    }
    if (override.action === 'suppress') {
      continue;
    }
    if (override.action === 'replace') {
      out.push({ ...f, fact: (override.replacement ?? f.fact).trim() });
    } else {
      out.push({ ...f, category: override.category ?? f.category });
    }
  }

  // A 'replace' may now duplicate an existing fact, so re-dedupe by key.
  const seen = new Set<string>();
  return out.filter((f) => {
    const key = normalizeFactKey(f.fact);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
