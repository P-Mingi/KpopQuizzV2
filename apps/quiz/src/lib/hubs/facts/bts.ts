import type { HubFacts } from './types';

// BTS, checked 2026-10-15 against the sources below (docs/seo/KPOP-SOURCES.md: two agreeing
// sources for every load-bearing fact, one official or Wikidata). Stage names are written as
// the official site writes them. Public roles only; no real names, birth dates or private life
// (rulebook 6.1). The Wikidata item is resolved from src/data/wikidata-groups.json.
//
// What each source says (as read on 2026-10-15):
//   BTS Japan official site, profile: debut in 2013; members RM, Jin, SUGA, j-hope, Jimin, V,
//     Jung Kook; "BTS GLOBAL OFFICIAL FANCLUB ARMY MEMBERSHIP"; footer "BIGHIT MUSIC / HYBE".
//     (Listed as an official website on the Wikidata item, P856. The Korean official profile
//     answers 403 to scripts.)
//   Wikidata: inception (P571) 2013-06-13; record label (P264) includes Big Hit Music;
//     has part (P527) 7 members.
//   Wikipedia, BTS: debuted on June 13, 2013 with the single album 2 Cool 4 Skool; the fan club
//     name A.R.M.Y.; label BigHit, owned by HYBE.
//   Korea JoongAng Daily, "Who is BTS?" (Shin Ha-nee, 10 July 2026): debuted in June 2013 under
//     Big Hit Entertainment, now HYBE's BigHit Music, with 2 Cool 4 Skool; seven members;
//     fandom known as ARMY.
//   The Korea Times, 9 February 2026: BTS among the returning third-generation boy groups.
//   Wikipedia member articles (lead sentence): the public role of each member.

const OFFICIAL_JP = 'https://bts-official.jp/profile/';
const JOONGANG_2026 = 'https://www.koreajoongangdaily.com/entertainment/who-is-bts/12766802';
const KTIMES_2026 = 'https://www.koreatimes.co.kr/entertainment/k-pop/20260209/k-pop-enters-new-war-as-3rd-gen-giants-return-from-military-service';
const WIKIPEDIA_BTS = 'https://en.wikipedia.org/wiki/BTS';

export const BTS_FACTS: HubFacts = {
  slug: 'bts',
  checkedAt: '2026-10-15',
  summary: 'BTS is a seven-member K-pop group that debuted on 13 June 2013 under BIGHIT MUSIC, part of HYBE. Its official fandom is called ARMY.',
  rows: [
    {
      key: 'members',
      label: 'Members',
      value: '7: RM, Jin, SUGA, j-hope, Jimin, V and Jung Kook',
      status: 'verified',
      loadBearing: true,
      sources: [
        { kind: 'official', label: 'BTS official site (Japan)', url: OFFICIAL_JP },
        { kind: 'wikidata', label: 'Wikidata', property: 'P527' },
      ],
    },
    {
      key: 'debut',
      label: 'Debut',
      value: '13 June 2013, with the single album 2 Cool 4 Skool',
      status: 'verified',
      loadBearing: true,
      sources: [
        { kind: 'wikidata', label: 'Wikidata', property: 'P571' },
        { kind: 'wikipedia', label: 'Wikipedia', url: WIKIPEDIA_BTS },
        { kind: 'outlet', label: 'Korea JoongAng Daily, 2026', url: JOONGANG_2026 },
      ],
    },
    {
      key: 'label',
      label: 'Label',
      value: 'BIGHIT MUSIC, part of HYBE',
      status: 'verified',
      loadBearing: true,
      sources: [
        { kind: 'official', label: 'BTS official site (Japan)', url: OFFICIAL_JP },
        { kind: 'wikidata', label: 'Wikidata', property: 'P264' },
      ],
    },
    {
      key: 'fandom',
      label: 'Fandom',
      value: 'ARMY',
      status: 'verified',
      loadBearing: true,
      sources: [
        { kind: 'official', label: 'BTS official site (Japan)', url: OFFICIAL_JP },
        { kind: 'wikipedia', label: 'Wikipedia', url: WIKIPEDIA_BTS },
      ],
    },
  ],
  generation: {
    confidence: 'consensus',
    sources: [{ kind: 'outlet', label: 'The Korea Times, 2026', url: KTIMES_2026 }],
  },
  members: [
    { stageName: 'RM', role: 'Leader, rapper', source: { kind: 'wikipedia', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/RM_(musician)' } },
    { stageName: 'Jin', role: 'Singer', source: { kind: 'wikipedia', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Jin_(singer)' } },
    { stageName: 'SUGA', role: 'Rapper, producer', source: { kind: 'wikipedia', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Suga' } },
    { stageName: 'j-hope', role: 'Rapper, dancer', source: { kind: 'wikipedia', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/J-Hope' } },
    { stageName: 'Jimin', role: 'Singer, dancer', source: { kind: 'wikipedia', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Jimin' } },
    { stageName: 'V', role: 'Singer', source: { kind: 'wikipedia', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/V_(singer)' } },
    { stageName: 'Jung Kook', role: 'Singer', source: { kind: 'wikipedia', label: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Jung_Kook' } },
  ],
};
