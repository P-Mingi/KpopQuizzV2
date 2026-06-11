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

  // J1b batch 2 - BLACKPINK. 75 corpus facts. 56 kept, 15 suppressed (10 of them
  // off-topic facts about OTHER groups that were mis-tagged into a blackpink
  // quiz), 2 replaced, 2 recategorized.
  blackpink: [
    // --- suppress: off-topic (wrong group, mis-tagged quiz) ---
    { match: 'irene is the leader of red velvet', action: 'suppress', reason: 'Off-topic: about Red Velvet, not BLACKPINK (mis-tagged quiz).', verifiedAt: '2026-06-11' },
    { match: 'nayeon was the first twice member to debut solo', action: 'suppress', reason: 'Off-topic: about TWICE, not BLACKPINK.', verifiedAt: '2026-06-11' },
    { match: 'karina is the leader of aespa', action: 'suppress', reason: 'Off-topic: about aespa, not BLACKPINK.', verifiedAt: '2026-06-11' },
    { match: 'ryujin was scouted at a got7 concert by jyp himself', action: 'suppress', reason: 'Off-topic: about ITZY, not BLACKPINK.', verifiedAt: '2026-06-11' },
    { match: 'miyeon was actually a yg trainee alongside blackpink before ', action: 'suppress', reason: 'Off-topic ((G)I-DLE) and the YG-trainee claim is unverified.', verifiedAt: '2026-06-11' },
    { match: 'winter is the main vocalist of aespa', action: 'suppress', reason: 'Off-topic: about aespa, not BLACKPINK.', verifiedAt: '2026-06-11' },
    { match: 'momo was eliminated and then brought back on the show sixtee', action: 'suppress', reason: 'Off-topic: about TWICE, not BLACKPINK.', verifiedAt: '2026-06-11' },
    { match: 'yuna is the youngest member of itzy', action: 'suppress', reason: 'Off-topic: about ITZY, not BLACKPINK.', verifiedAt: '2026-06-11' },
    { match: 'wonyoung won first place on produce 48', action: 'suppress', reason: 'Off-topic: about IVE/Wonyoung, not BLACKPINK.', verifiedAt: '2026-06-11' },
    { match: 'kazuha was a professional ballet dancer before joining le ss', action: 'suppress', reason: 'Off-topic: about LE SSERAFIM, not BLACKPINK.', verifiedAt: '2026-06-11' },

    // --- suppress: wrong / unverifiable / vague ---
    { match: 'the bbyongbong a korean onomatopoeia for a hammer hitting re', action: 'suppress', reason: 'Mascot name and description not reliably verifiable.', verifiedAt: '2026-06-11' },
    { match: 'training periods varied jisoo trained 5 years jennie 6 years', action: 'suppress', reason: 'Specific training-year figures are soft and vary by source.', verifiedAt: '2026-06-11' },
    { match: 'the reveal order was jennie june 1 lisa june 8 jisoo june 15', action: 'suppress', reason: 'Specific 2016 member-reveal dates not verifiable with confidence.', verifiedAt: '2026-06-11' },
    { match: 'jennie launched her clothing brand odd atelier odd and has b', action: 'suppress', reason: 'Wrong: ODD ATELIER is Jennie label/agency, not a clothing brand.', verifiedAt: '2026-06-11' },
    { match: 'jisoo opens the kill this love mv with a powerful visual ent', action: 'suppress', reason: 'Unverifiable specific MV-visual claim.', verifiedAt: '2026-06-11' },

    // --- replace (true core, one detail corrected) ---
    {
      match: 'on the ground debuted at 70 on the billboard hot 100 the hig',
      action: 'replace',
      replacement: "On The Ground debuted at #70 on the Billboard Hot 100, the second-highest peak for a K-pop soloist at the time, behind Psy's Gangnam Style.",
      reason: 'Correction: it was the second-highest (behind Psy), not the highest. billboard.com/pro/rose-on-the-ground-debuts-number-one-global-charts',
      verifiedAt: '2026-06-11',
    },
    {
      match: 'the kill this love ep contains 4 tracks kill this love dont ',
      action: 'replace',
      replacement: "The Kill This Love EP has 5 tracks: Kill This Love, Don't Know What to Do, Kick It, Hope Not, and a remix of DDU-DU DDU-DU.",
      reason: 'Correction: the EP has 5 tracks including the DDU-DU DDU-DU remix, not 4. en.wikipedia.org/wiki/Kill_This_Love',
      verifiedAt: '2026-06-11',
    },

    // --- recategorize (song facts mis-bucketed as members) ---
    { match: 'shut down from born pink samples paganinis la campanella', action: 'recategorize', category: 'music', reason: 'Song sampling fact, not a members fact.', verifiedAt: '2026-06-11' },
    { match: 'shut down samples paganinis la campanella and debuted at 1 i', action: 'recategorize', category: 'music', reason: 'Song chart/sampling fact, not a members fact.', verifiedAt: '2026-06-11' },
  ],

  // J1b batch 2 - Stray Kids. 63 corpus facts. 46 kept, 17 suppressed (15 of
  // them contextless "It is the Nth song listed on..." fragments that name no
  // song), 0 replaced, 1 recategorized.
  'stray-kids': [
    // --- suppress: contextless orphaned quiz answers (no song named) ---
    { match: 'it is the 6th song listed on their march 2019 mini album cl ', action: 'suppress', reason: 'Contextless: names no song ("It is the Nth song on...").', verifiedAt: '2026-06-11' },
    { match: 'this is the 8th song listed on their 3rd full album 5star wh', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the 9th song listed on their 2nd full album noeasy w', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the 6th song listed on their 1st full album go live ', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'it is the 3rd song listed on their 4th japan album release t', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the 6th song listed on the mini album cl  levanter w', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'it is the 2nd song listed on their special mini album hop re', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the 7th and final song listed on their debut mini al', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the 6th song listed on their mini album i am you rel', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the second title track from their at the time of thi', action: 'suppress', reason: 'Contextless and stale ("at the time of this quiz" latest EP).', verifiedAt: '2026-06-11' },
    { match: 'it is the 3rd song listed on their 4th full album karma rele', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the 3rd song listed on their special mini album cl 2', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the title track of their mini album rockstar release', action: 'suppress', reason: 'Contextless: names no song ("This is the title track of...").', verifiedAt: '2026-06-11' },
    { match: 'this is their late 2017 predebut single later released as th', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },
    { match: 'this is the title track of their mini album ate released jul', action: 'suppress', reason: 'Contextless: names no song.', verifiedAt: '2026-06-11' },

    // --- suppress: wrong / unverifiable ---
    { match: 'bang chans room now called stay is a regular vlivebubble ser', action: 'suppress', reason: "Wrong: Chan's Room was not renamed STAY (STAY is the fandom name).", verifiedAt: '2026-06-11' },
    { match: 'stray kids became one of the few kpop groups to sell out us ', action: 'suppress', reason: 'Vague and unverifiable US-stadium-sellout claim.', verifiedAt: '2026-06-11' },

    // --- recategorize (song musical-elements fact mis-bucketed as members) ---
    { match: 'ssoriggoon thunderous incorporates traditional korean musica', action: 'recategorize', category: 'music', reason: 'Song musical-elements fact, not a members fact.', verifiedAt: '2026-06-11' },
  ],

  // J1b batch 3 - aespa. 58 corpus facts. 51 kept, 5 suppressed, 0 replaced,
  // 2 recategorized.
  aespa: [
    { match: 'live my life offers a contrast to the albums harderhitting t', action: 'suppress', reason: '"Live My Life" is not a recognized aespa track, plus subjective.', verifiedAt: '2026-06-11' },
    { match: 'aespa performed at both coachella and lollapalooza cementing', action: 'suppress', reason: 'Lollapalooza claim is wrong: aespa first perform at Lollapalooza in 2026, not earlier. allkpop.com/article/2026/03/aespa-confirmed-for-lollapalooza-chicago-2026', verifiedAt: '2026-06-11' },
    { match: 'savage released on october 5 2021 was aespas first minialbum', action: 'suppress', reason: 'Misattributes the #20 peak (it was Billboard 200, per the kept fact) to US iTunes; otherwise redundant.', verifiedAt: '2026-06-11' },
    { match: 'aespa performed at lollapalooza in chicago on july 31 2022 b', action: 'suppress', reason: 'Wrong: TXT (also 4th gen) performed at Lollapalooza 2022; aespa first Lollapalooza is 2026.', verifiedAt: '2026-06-11' },
    { match: 'aespa performed at the 2023 billboard music awards one of th', action: 'suppress', reason: 'Unverified: no record of aespa at the 2023 Billboard Music Awards (likely conflated with Billboard Women in Music).', verifiedAt: '2026-06-11' },
    { match: 'girls 2022 is aespas second mini album following savage', action: 'recategorize', category: 'music', reason: 'Discography fact, not a members fact.', verifiedAt: '2026-06-11' },
    { match: 'savage was released in october 2021 and debuted at 20 on the', action: 'recategorize', category: 'music', reason: 'Chart fact, not a members fact.', verifiedAt: '2026-06-11' },
  ],

  // J1b batch 3 - TWICE. 49 corpus facts. 40 kept, 6 suppressed, 1 replaced,
  // 2 recategorized.
  twice: [
    { match: 'momo appeared on a japanese dance survival show before joini', action: 'suppress', reason: 'Unverified: Momo was scouted by JYP, not via a Japanese dance survival show.', verifiedAt: '2026-06-11' },
    { match: 'members dressed as tinker bell the little mermaid pinocchio ', action: 'suppress', reason: 'Contextless: names no song (which MV?).', verifiedAt: '2026-06-11' },
    { match: 'the mv recreates scenes from movies like la la land romeo an', action: 'suppress', reason: 'Contextless: "the MV" names no song.', verifiedAt: '2026-06-11' },
    { match: 'the summerthemed mv was filmed at a beach location fitting t', action: 'suppress', reason: 'Contextless: "the summer-themed MV" names no song.', verifiedAt: '2026-06-11' },
    { match: 'signal has a timetravel concept with members communicating a', action: 'suppress', reason: 'Wrong: Signal has a superpowers/telepathy concept, not time-travel.', verifiedAt: '2026-06-11' },
    { match: 'formula of love became the first kpop girl group album to se', action: 'suppress', reason: 'Unverified as the first 1M-selling K-pop girl group album in Korea (Between 1&2 is cited as their first million-seller).', verifiedAt: '2026-06-11' },
    {
      match: 'formula of love is twices most expansive album at 13 tracks ',
      action: 'replace',
      replacement: "Formula of Love is one of TWICE's most expansive albums, with 16 tracks across a wide musical range.",
      reason: 'Correction: the album has 16 tracks, not 13. en.wikipedia.org/wiki/Formula_of_Love:_O+T (Wikipedia)',
      verifiedAt: '2026-06-11',
    },
    { match: 'the feels was released in october 2021 as twices first fully', action: 'recategorize', category: 'music', reason: 'Single/discography fact, not a members fact.', verifiedAt: '2026-06-11' },
    { match: 'more and more 2020 and alcoholfree 2021 began twices transit', action: 'recategorize', category: 'music', reason: 'Discography fact, not a members fact.', verifiedAt: '2026-06-11' },
  ],

  // J1b batch 3 - SEVENTEEN. 39 corpus facts (cleaner set). 36 kept,
  // 2 suppressed, 1 replaced, 0 recategorized.
  seventeen: [
    { match: 'carat stands for carat arat seventeen and references the dia', action: 'suppress', reason: 'Dubious: CARAT is not an acronym ("Carat Arat Seventeen"); the diamond meaning is covered by another kept fact.', verifiedAt: '2026-06-11' },
    { match: 'super was from their fml album which sold over 6 million cop', action: 'suppress', reason: 'Wrong: FML sold 4.55 million in its first week, not 6 million. allkpop.com/article/2023/04 seventeen FML', verifiedAt: '2026-06-11' },
    {
      match: 'fml april 2023 sold over 46 million copies in its first week',
      action: 'replace',
      replacement: "FML (April 2023) sold over 4.5 million copies in its first week, a Hanteo record at the time, surpassing BTS's Map of the Soul: 7.",
      reason: 'Correction: first-week sales were 4.55 million, not over 4.6 million. mb.com.ph/2023/5/1 seventeen FML 4.55 million',
      verifiedAt: '2026-06-11',
    },
  ],

  // J1b batch 3 - NewJeans. 30 corpus facts. 25 kept, 5 suppressed.
  newjeans: [
    { match: 'cool with you is a bside from the get up ep eta hype boy and', action: 'suppress', reason: 'Wrong: Cool With You was a promoted/title track of Get Up (not a B-side); the track grouping mixes different eras.', verifiedAt: '2026-06-11' },
    { match: 'minji hanni danielle haerin and hyein', action: 'suppress', reason: 'Contextless fragment: just a member list with no statement (covered by the kept "5 members" fact).', verifiedAt: '2026-06-11' },
    { match: 'newjeans is under ador a dreamers only real label a hybe sub', action: 'suppress', reason: 'Wrong: ADOR stands for "All Doors One Room", not "A Dreamer\'s Only Real Label". kpop.fandom.com/wiki/ADOR', verifiedAt: '2026-06-11' },
    { match: 'newjeans performed at the paris 2024 olympic games opening c', action: 'suppress', reason: 'Wrong: NewJeans did not perform at the Paris 2024 opening ceremony; they performed at a private Olympic celebration event in Seoul (Aug 22, 2024). koreaboo.com NewJeans 2024 Paris Olympics event', verifiedAt: '2026-06-11' },
    { match: 'danielle danielle marsh is of korean and irish descent she w', action: 'suppress', reason: 'Muddled and conflicting heritage claim; the kept facts state Danielle is Korean-Australian.', verifiedAt: '2026-06-11' },
  ],

  // J1b batch 4 - ENHYPEN. 43 corpus facts. 26 kept, 17 suppressed (16 junk
  // fan-anecdote/kaomoji fragments that name no clear subject, + 1 wrong chart).
  enhypen: [
    { match: 'heeseung and jay met as trainees under big hit entertainment', action: 'suppress', reason: 'Kaomoji-laden, obscure trainee anecdote.', verifiedAt: '2026-06-11' },
    { match: 'they met up again backstage in 2021 sbs and wished each othe', action: 'suppress', reason: 'Contextless and trivial.', verifiedAt: '2026-06-11' },
    { match: 'he had a friend in a lower grade who didnt know his name and', action: 'suppress', reason: 'Contextless obscure anecdote, no subject named.', verifiedAt: '2026-06-11' },
    { match: 'when jungwon joined sm ent the first person he saw was train', action: 'suppress', reason: 'Obscure, unverifiable anecdote.', verifiedAt: '2026-06-11' },
    { match: 'they are specifically the water horse  1942 2002 amicable an', action: 'suppress', reason: 'Contextless zodiac fan-trivia.', verifiedAt: '2026-06-11' },
    { match: 'he visited during his 3rd year of middle school', action: 'suppress', reason: 'Contextless fragment ("He visited...").', verifiedAt: '2026-06-11' },
    { match: 'after jake won he moved to australia by himself to begin tra', action: 'suppress', reason: 'Garbled: Jake grew up in Australia from childhood, not after iland.', verifiedAt: '2026-06-11' },
    { match: 'it was based on the logo of iland a big egg', action: 'suppress', reason: 'Contextless fragment ("It was based on...").', verifiedAt: '2026-06-11' },
    { match: 'when he first started training in bighit he was still a figu', action: 'suppress', reason: 'Contextless fragment, names no subject.', verifiedAt: '2026-06-11' },
    { match: 'he stopped liking it in 2021 and joined the rest of the grou', action: 'suppress', reason: 'Contextless and trivial.', verifiedAt: '2026-06-11' },
    { match: 'jake and sunghoon lived in the same neighborhood during thei', action: 'suppress', reason: 'Obscure, unverifiable childhood anecdote.', verifiedAt: '2026-06-11' },
    { match: 'jungwon graduated as a honor student with an achievement awa', action: 'suppress', reason: 'Obscure, unverifiable school anecdote.', verifiedAt: '2026-06-11' },
    { match: 'given to them in mama 2022', action: 'suppress', reason: 'Contextless fragment ("Given to them in MAMA 2022").', verifiedAt: '2026-06-11' },
    { match: 'chulsoo represents a strong intelligent and reliable individ', action: 'suppress', reason: 'Contextless ("Chulsoo" is unexplained).', verifiedAt: '2026-06-11' },
    { match: 'heeseung makes egg clouds in his ramen by pushing the noodle', action: 'suppress', reason: 'Trivial, unverifiable cooking anecdote.', verifiedAt: '2026-06-11' },
    { match: 'during the iland broadcast sunoo was seen doing hair for mul', action: 'suppress', reason: 'Trivial, unverifiable anecdote.', verifiedAt: '2026-06-11' },
    { match: 'dark blood debuted at 1 on the billboard 200 making enhypen ', action: 'suppress', reason: 'Wrong: DARK BLOOD debuted at #4 on the Billboard 200, not #1. en.wikipedia.org/wiki/Dark_Blood_(EP)', verifiedAt: '2026-06-11' },
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
