// Run O1, lot H2c: the design's sample data (docs/o1/design/fanquiz-hub/Main.dc.html, its script) in the shapes of the modules of
// lib/site/hub/data/. Tests only: nothing in a render path imports this file (home-no-samples.test.ts greps the sources for these names).

import type {
  HubBlindtest, HubCrossover, HubDailyQuizzes, HubDebate, HubDidYouKnow, HubDoors, HubForYou, HubHot, HubHotCard, HubQuizCard, HubRotation,
  HubSixtySeconds, HubStartEasy, HubSurprise, HubTopFans,
} from './data';

type Site = 'kpop' | 'anime';
const NAME: Record<Site, string> = { kpop: 'KpopQuiz', anime: 'OtakuQuiz' };
const ORIGIN: Record<Site, string> = { kpop: 'https://kpopquiz.org', anime: 'https://bunnyverse.org/anime' };

export function quizCard(site: Site, tile: string, group: string, title: string, meta: string, plays: string, slug: string, cover: string | null = null): HubQuizCard {
  const [level = ''] = meta.split(' · ');
  return {
    id: `${site}:${slug}`, site, siteName: NAME[site], slug, path: `/q/${slug}`, href: `${ORIGIN[site]}/q/${slug}`, title, group, groupSlug: group.toLowerCase(),
    tile, difficulty: level.toLowerCase(), meta, plays, isNew: plays === '', hasPlays: plays !== '', questionCount: 10, cover,
  };
}

/** A cover on the storage host of the app (a configured image host). */
export const SAMPLE_COVER = 'https://sample.supabase.co/storage/v1/object/public/images/covers/ultimate-bts-era-quiz.jpg';

const KPOP_HOT: readonly HubQuizCard[] = [
  quizCard('kpop', 'BTS', 'BTS', 'Ultimate BTS era quiz - only real ARMYs survive', 'Medium', '2.7k plays', 'ultimate-bts-era-quiz', SAMPLE_COVER),
  quizCard('kpop', 'SK', 'Stray Kids', 'SKZ true or false - only real STAYs pass', 'Easy · True or false', '2.1k plays', 'skz-true-or-false'),
  quizCard('kpop', 'BP', 'BLACKPINK', 'BLACKPINK ultimate fan challenge', 'Medium', '1.7k plays', 'blackpink-ultimate-fan-challenge'),
  quizCard('kpop', 'K', 'K-pop', 'K-pop company quiz - match the group to the label', 'Easy', '1.7k plays', 'kpop-company-quiz'),
  quizCard('kpop', 'K', 'K-pop', 'Which K-pop group debuted first? Timeline challenge', 'Medium', '1.3k plays', 'which-kpop-group-debuted-first'),
  quizCard('kpop', 'IL', 'ILLIT', 'are u a real GLLIT?!!', 'Easy · Find the intruder', '1.1k plays', 'are-u-a-real-gllit'),
];
const ANIME_HOT: readonly HubQuizCard[] = [
  quizCard('anime', 'DN', 'Death Note', 'Name and Face: Death Note True or False', 'Medium · True or false', '', 'name-and-face-death-note-true-or-false'),
  quizCard('anime', 'OP', 'One Piece', 'Raising the Flag: One Piece Basics', 'Easy', '', 'raising-the-flag-one-piece-basics'),
  quizCard('anime', 'CM', 'Chainsaw Man', 'One Opening, Many Endings: Chainsaw Man Theme Songs', 'Medium', '', 'one-opening-many-endings-chainsaw-man-theme-songs'),
  quizCard('anime', 'Fr', 'Frieren', "Journey's Beginning: Frieren Basics", 'Easy', '', 'journeys-beginning-frieren-basics'),
  quizCard('anime', 'SF', 'Spy x Family', 'Cover Story or Truth: Spy x Family True or False', 'Medium · True or false', '', 'cover-story-or-truth-spy-x-family-true-or-false'),
  quizCard('anime', 'Ha', 'Haikyu!!', 'Four Seasons and a Finale: The Haikyu!! Timeline', 'Hard', '', 'four-seasons-and-a-finale-the-haikyu-timeline'),
];

const ranked = (cards: readonly HubQuizCard[]): HubHotCard[] => cards.map((c, i) => ({ ...c, rank: i + 1 }));

export function sampleHot(): HubHot {
  const k = ranked(KPOP_HOT);
  const a = ranked(ANIME_HOT);
  const all: HubHotCard[] = [];
  for (let i = 0; i < 3; i++) all.push({ ...k[i]!, rank: all.length + 1 }, { ...a[i]!, rank: all.length + 2 });
  // Start easy: the easy quizzes of each site, alternating (K, A, K, A, K).
  const ke = k.filter((c) => c.difficulty === 'easy');
  const ae = a.filter((c) => c.difficulty === 'easy');
  const easy: HubHotCard[] = [];
  for (let i = 0; i < Math.max(ke.length, ae.length); i++) {
    if (ke[i]) easy.push({ ...ke[i]!, rank: easy.length + 1 });
    if (ae[i]) easy.push({ ...ae[i]!, rank: easy.length + 1 });
  }
  return { all, kpop: k, anime: a, easy, basis: { plays: 'plays-rows', completionMeasured: false, animeStartup: true } };
}

export function sampleDoors(): HubDoors {
  return {
    kpop: { site: 'kpop', name: 'KpopQuiz', origin: ORIGIN.kpop, quizCount: 482, topicCount: 48, topicLabel: 'groups', featuredLabel: 'Top now', featured: KPOP_HOT[0]! },
    anime: { site: 'anime', name: 'OtakuQuiz', origin: ORIGIN.anime, quizCount: 138, topicCount: 31, topicLabel: 'series', featuredLabel: 'Just added', featured: ANIME_HOT[0]! },
  };
}

export function sampleDaily(): HubDailyQuizzes {
  const day = (site: Site, title: string, slug: string, group: string): NonNullable<HubDailyQuizzes['kpop']> => ({
    id: `${site}:${slug}`, site, siteName: NAME[site], title, path: `/q/${slug}`, href: `${ORIGIN[site]}/q/${slug}`, group, questionCount: 10, difficulty: 'Easy',
    meta: `${NAME[site]} · 10 questions · Easy`,
  });
  return {
    kpop: day('kpop', 'ZEROBASEONE: From Boys Planet to In Bloom', 'zerobaseone-from-boys-planet-to-in-bloom', 'ZEROBASEONE'),
    anime: day('anime', "Journey's Beginning: Frieren Basics", 'journeys-beginning-frieren-basics', 'Frieren'),
  };
}

export function sampleBlindtest(): HubBlindtest {
  return {
    site: 'kpop', siteName: 'KpopQuiz', date: '2026-10-25', songCount: 10, clipSeconds: 10, previewUrl: 'https://cdnt-preview.dzcdn.net/api/1/1/a/b/c/first.mp3',
    path: '/blindtest?daily=true', href: `${ORIGIN.kpop}/blindtest?daily=true`,
  };
}

export function sampleDebate(): HubDebate {
  return {
    site: 'kpop', siteName: 'KpopQuiz', date: '2026-10-25', question: 'Best title track of 2025 so far?', sideA: 'A', sideB: 'B', votes: 12,
    path: '/community', href: `${ORIGIN.kpop}/community`,
  };
}

export function sampleRotation(secondsLeft = 31_620): HubRotation {
  return { nextAt: '2026-10-26T00:05:00.000Z', utcTime: '00:05', parisTime: '01:05', parisZone: 'CET', secondsLeft };
}

export function sampleSixty(): HubSixtySeconds {
  return {
    site: 'kpop', siteName: 'KpopQuiz', quizTitle: 'K-pop Songs About Magic', quizHref: `${ORIGIN.kpop}/q/kpop-songs-about-magic`,
    question: "ITZY's 2022 single Cheshire borrows the concept of a famous cat from which story?",
    options: ['Puss in Boots', 'The Jungle Book', 'Alice in Wonderland', 'The Wizard of Oz'], correct: 2,
    explanation: 'ITZY said they borrowed the Cheshire Cat from Alice in Wonderland to express an ambiguous feeling. The single came out with its EP on November 30, 2022.',
    awardsXp: false,
  };
}

export function sampleDyk(): HubDidYouKnow {
  return {
    kpop: {
      site: 'kpop', siteName: 'KpopQuiz', fact: "ZEROBASEONE's 2023 debut single In Bloom samples the riff of a-ha's 1984 hit Take On Me.", source: 'Wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/In_Bloom', moreHref: `${ORIGIN.kpop}/trivia`,
    },
    anime: {
      site: 'anime', siteName: 'OtakuQuiz', fact: 'In Japan, Frieren is called Sōsō no Furīren, which literally means Frieren at the Funeral.', source: 'Wikipedia',
      sourceUrl: 'https://en.wikipedia.org/wiki/Frieren', moreHref: `${ORIGIN.anime}/trivia`,
    },
    pool: { kpop: 80, anime: 900 },
  };
}

export function sampleStartEasy(): HubStartEasy {
  return {
    kpop: quizCard('kpop', 'K', 'K-pop', 'K-pop company quiz - match the group to the label', 'Easy', '1.7k plays', 'kpop-company-quiz'),
    anime: quizCard('anime', 'OP', 'One Piece', 'Raising the Flag: One Piece Basics', 'Easy', '', 'raising-the-flag-one-piece-basics'),
  };
}

export function sampleForYou(): HubForYou {
  return {
    cards: [
      {
        kind: 'next', eyebrow: 'Next for a Stray Kids fan', meta: 'Medium · you scored 9/10 on the basics',
        card: quizCard('kpop', 'SK', 'Stray Kids', 'Stray Kids albums and B-sides deep dive', 'Medium', '900 plays', 'stray-kids-albums-and-b-sides-deep-dive'),
      },
      {
        kind: 'bridge', eyebrow: 'Stray Kids fans also play', meta: 'Easy · same account, nothing to sign up for', via: 'editorial',
        card: quizCard('anime', 'JK', 'Jujutsu Kaisen', 'First Steps into Jujutsu Kaisen', 'Easy', '', 'first-steps-into-jujutsu-kaisen'),
      },
    ],
    fandom: { site: 'kpop', name: 'Stray Kids', slug: 'stray-kids' },
  };
}

export function sampleCrossover(): HubCrossover {
  return {
    quizzes: [
      { site: 'kpop', siteName: 'KpopQuiz', title: 'KPop Demon Hunters Quiz', href: `${ORIGIN.kpop}/kpop-demon-hunters-quiz`, tile: 'KD', meta: 'Six questions', line: 'The animated film and its songs' },
      {
        site: 'anime', siteName: 'OtakuQuiz', title: 'One Opening, Many Endings: Chainsaw Man Theme Songs', href: `${ORIGIN.anime}/q/one-opening-many-endings-chainsaw-man-theme-songs`,
        tile: 'CM', meta: 'Medium', line: 'for music fans',
      },
      { site: 'kpop', siteName: 'KpopQuiz', title: 'K-pop Songs About Magic', href: `${ORIGIN.kpop}/q/kpop-songs-about-magic`, tile: 'K', meta: 'Easy', line: 'spells, wishes and fairy tales' },
    ],
    fact: { text: 'IVE sang Will, the opening theme of Pokémon Horizons, released on April 12, 2024.', source: 'Wikipedia', sourceUrl: 'https://en.wikipedia.org/wiki/IVE' },
    week: '2026-W43',
  };
}

export function sampleTopFans(): HubTopFans {
  const fan = (rank: number, handle: string, level: number | null, kpop: boolean, anime: boolean): HubTopFans['fans'][number] => ({
    rank, handle, initial: handle.charAt(0).toUpperCase(), level, kpop, anime, href: `${ORIGIN.kpop}/u/${handle}`,
  });
  return {
    fans: [fan(1, 'sunbae_mira', 42, true, true), fan(2, 'tteok_rider', 39, true, false), fan(3, 'mingi', 37, true, true), fan(4, 'kenjiro_k', 33, false, true), fan(5, 'shoujo_nova', 30, true, true)],
    bySite: {
      kpop: [fan(1, 'sunbae_mira', 42, true, false), fan(2, 'tteok_rider', 39, true, false), fan(3, 'mingi', 37, true, false), fan(4, 'hallyu_bean', 31, true, false), fan(5, 'dalgona_pop', 28, true, false)],
      anime: [fan(1, 'kenjiro_k', 33, false, true), fan(2, 'shoujo_nova', 30, false, true), fan(3, 'ramen_ronin', 24, false, true), fan(4, 'onigiri_ace', 19, false, true), fan(5, 'mingi', 12, false, true)],
    },
    basis: 'plays',
  };
}

export function sampleSurprise(): HubSurprise {
  const pool = [...KPOP_HOT, ...ANIME_HOT].map((c) => ({ id: c.id, site: c.site, siteName: c.siteName, tile: c.tile, title: c.title, group: c.group, href: c.href }));
  return { pool, playedIds: [] };
}

/** The strings of the design's script that must not reach a render path (the sources of the page, its loaders and its components). */
export const SAMPLE_NAMES: readonly string[] = [
  'sunbae_mira', 'tteok_rider', 'kenjiro_k', 'shoujo_nova', 'hallyu_bean', 'dalgona_pop', 'ramen_ronin', 'onigiri_ace',
  'ZEROBASEONE: From Boys Planet', 'Best title track of 2025', 'Cheshire', 'Take On Me', 'Sōsō no Furīren',
  'Ultimate BTS era quiz', 'SKZ true or false', 'BLACKPINK ultimate fan challenge', 'K-pop company quiz', 'are u a real GLLIT',
  'Name and Face: Death Note', 'Raising the Flag', 'One Opening, Many Endings', 'Four Seasons and a Finale',
  'First Steps into Jujutsu Kaisen', 'Stray Kids albums and B-sides', 'KPop Demon Hunters Quiz', 'IVE sang Will',
  '482 quizzes', '138 quizzes', '31 series', '480+ quizzes', '130+ quizzes', 'ultimate-bts-era-quiz.jpg',
];
