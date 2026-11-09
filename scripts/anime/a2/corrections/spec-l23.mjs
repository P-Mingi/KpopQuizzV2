// L23-l1-otakudle-first-adaptation.sql (audit 06 item 3, owner-validated 2026-11-09): the studio of the first TV adaptation (D-5) and the year of the original work (D-6).
// Each value has the page it was read on (MediaWiki API, revision id of the text read on READ).
export const READ = '2026-11-09';
const WP = 'https://en.wikipedia.org/wiki/';
// work_year: first publication of the original work, in any form (D-6). The other 46 series were checked against the same rule and keep their year (list in the header of the file).
export const WORK_YEAR = [
  { slug: 'apothecary-diaries', year: 2011, url: 'https://kusuriya.fandom.com/wiki/Kusuriya_no_Hitorigoto', ref: '17930', source: 'fandom', raw: 'the web novel by Natsu Hyuga on Shosetsuka ni Naro since 2011 (the English Wikipedia page does not date the web novel)' },
  { slug: 'that-time-i-got-reincarnated-as-a-slime', year: 2013, url: `${WP}That_Time_I_Got_Reincarnated_as_a_Slime`, ref: '1381575839', source: 'wikipedia', raw: 'web novel on Shosetsuka ni Naro between February 20, 2013, and January 1, 2016' },
  { slug: 'solo-leveling', year: 2016, url: `${WP}Solo_Leveling`, ref: '1383622083', source: 'wikipedia', raw: 'the web novel on KakaoPage beginning on July 25, 2016' },
  { slug: 'omniscient-readers-viewpoint', year: 2018, url: `${WP}Omniscient_Reader's_Viewpoint`, ref: '1384228095', source: 'wikipedia', raw: 'web novel first published on January 6, 2018, on Munpia' },
];
// first_studios: the studio of the first TV anime series (D-5), read instead of the studios of the later seasons; anime_start_year follows (L04 held the year of the second series / the reboot).
export const FIRST_STUDIO = [
  { slug: 'hunter-x-hunter', studios: ['Nippon Animation'], startOld: 2011, startNew: 1999, url: `${WP}Hunter_%C3%97_Hunter_(1999_TV_series)`, ref: '1383764628', raw: 'the 1999 TV series, studio Nippon Animation, 62 episodes on Fuji TV from October 1999 to March 2001' },
  { slug: 'fruits-basket', studios: ['Studio Deen'], startOld: 2019, startNew: 2001, url: `${WP}Fruits_Basket_(2001_TV_series)`, ref: '1368461630', raw: 'adapted into a twenty-six episode anime series by Studio Deen, premiered on TV Tokyo on July 5, final episode December 27, 2001' },
];
