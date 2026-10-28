// The 10 General K-pop theme pages (SEO strategy of 2026-10-27, phase 1, PR 15). Generated from
// docs/seo/strategy-2026-10-27/themes.json (owner-approved plan, THEMES-PLAN-2026-10-27.md): titles, H1s,
// descriptions, intros, ordered sections, second listings, owner links and content dates are the plan's values,
// never retyped. The page lists only the slugs that are still published (a drafted quiz drops out).

export interface ThemeSection {
  /** null: the theme's only section, shown without a heading. */
  heading: string | null;
  slugs: readonly string[];
}

export interface GeneralTheme {
  slug: string;
  title: string;
  h1: string;
  primaryPhrase: string;
  description: string;
  /** The lead paragraph; {count} is the number of listed quizzes. */
  intro: string;
  sections: readonly ThemeSection[];
  /** Quizzes whose primary theme is another one, listed under "Also fits this topic". */
  alsoFits: readonly string[];
  /** Pages that own a related query, linked with their own anchor (rulebook 8.1). */
  ownerLinks: ReadonlyArray<{ href: string; anchor: string }>;
  /** The date the plan last changed this theme's content (YYYY-MM-DD). */
  contentDate: string;
}

export const GENERAL_THEMES: readonly GeneralTheme[] = [
  {
    slug: "kpop-history-quiz",
    title: "K-pop History Quiz: Legends and the Hallyu Wave",
    h1: "K-pop history quiz",
    primaryPhrase: "K-pop history quiz",
    description: "Take a K-pop history quiz on the eras, the 2nd generation legends, Gangnam Style and the Hallyu wave that took K-pop worldwide. Free, no sign-up.",
    intro: "This K-pop history quiz page gathers {count} free quizzes about how K-pop grew: the generations, the 2nd generation legends, the Gangnam Style era and the Hallyu wave abroad. They mix many groups, so you need no favorite. Start easy at the top and end with the hardest. To learn first, read K-pop generations explained.",
    contentDate: "2026-10-25",
    sections: [
      {
        heading: "Eras and generations",
        slugs: [
          "find-the-3rd-gen-intruder-among-4th-gen",
          "k-pop-generation-history",
          "4th-gen-groups-true-or-false",
          "3rd-generation-k-pop-true-or-false",
          "k-pop-at-big-sporting-events",
          "psy-and-gangnam-style-era",
          "k-pop-girl-group-generations-timeline",
          "k-pop-generations-quiz",
          "k-pop-and-japan",
          "k-pop-goes-west",
          "k-pop-global-expansion",
          "4th-gen-boy-groups-quiz",
          "k-pop-boy-group-generations-timeline",
        ],
      },
      {
        heading: "Legacy groups",
        slugs: [
          "bigbang-vips-only-quiz",
          "girls-generation-the-legend-quiz",
          "super-junior-legacy-quiz",
          "fx-quiz-sms-unique-girl-group",
          "k-pop-2nd-generation-legends",
          "2ne1-legacy-quiz",
        ],
      },
    ],
    alsoFits: [
      "k-pop-collaboration-with-western-artists",
      "gen-5-k-pop-can-you-name-the-group",
      "winner-and-ikon-quiz-yg-brothers",
    ],
    ownerLinks: [{ href: "/articles/kpop-generations-explained", anchor: "K-pop generations explained" }],
  },
  {
    slug: "kpop-debut-quiz",
    title: "K-pop Debut Quiz: Songs, Years and Timelines",
    h1: "K-pop debut quiz",
    primaryPhrase: "K-pop debut quiz",
    description: "Take a K-pop debut quiz: name the group from its debut song, guess debut years and say which group came first, from 1st gen to today. Free, no sign-up.",
    intro: "This K-pop debut quiz page gathers {count} free quizzes on how groups started: debut songs, debut years, sub-unit and solo debuts, and timelines where you pick which group came first. Every quiz mixes many groups. They run from easy to hard, so start at the top and see how far you get.",
    contentDate: "2026-07-28",
    sections: [
      {
        heading: null,
        slugs: [
          "k-pop-debuts-and-disbandments-true-or-false",
          "true-or-false-debut-songs",
          "which-k-pop-group-debuted-first-timeline-challenge",
          "k-pop-debut-songs-name-the-group",
          "k-pop-debut-years-challenge",
          "k-pop-debut-years-true-or-false",
          "k-pop-debut-songs-true-or-false",
          "k-pop-sub-units-and-solo-debuts",
        ],
      },
    ],
    alsoFits: [
      "k-pop-produce-series-quiz",
      "which-year-did-this-song-come-out",
      "k-pop-girl-group-generations-timeline",
      "k-pop-boy-group-generations-timeline",
    ],
    ownerLinks: [{ href: "/articles/kpop-generations-explained", anchor: "K-pop generations explained" }],
  },
  {
    slug: "kpop-company-quiz",
    title: "K-pop Company Quiz: HYBE, SM, JYP, YG and More",
    h1: "K-pop company quiz",
    primaryPhrase: "K-pop company quiz",
    description: "Take a K-pop company quiz: match groups and idols to HYBE, SM, JYP, YG and other labels, then test what you know about trainees. Free, no sign-up.",
    intro: "This K-pop company quiz page gathers {count} free quizzes about the labels behind the groups: HYBE, SM, JYP, YG and smaller agencies, plus how trainees are scouted and trained. Match each group or idol to its company first, then go deeper into the business side. The quizzes run from easy to hard.",
    contentDate: "2026-10-18",
    sections: [
      {
        heading: null,
        slugs: [
          "k-pop-company-quiz-match-the-group-to-the-label",
          "k-pop-label-structure-and-companies",
          "which-company-does-this-idol-belong-to",
          "k-pop-training-system-and-idol-life",
          "k-pop-agencies-true-or-false",
          "yg-entertainment-groups-quiz",
          "k-pop-companies-quiz",
          "k-pop-training-system-quiz",
          "jyp-entertainment-groups-quiz",
          "sm-entertainment-groups-quiz",
          "hybe-groups-quiz",
          "k-pop-industry-business-quiz",
          "which-company-is-this-group-from",
          "k-pop-company-facts-true-or-false",
          "winner-and-ikon-quiz-yg-brothers",
        ],
      },
    ],
    alsoFits: [],
    ownerLinks: [{ href: "/easy-kpop-quizzes", anchor: "easy K-pop quizzes" }],
  },
  {
    slug: "kpop-fandom-quiz",
    title: "K-pop Fandom Quiz: Fandom Names and Lightsticks",
    h1: "K-pop fandom quiz",
    primaryPhrase: "K-pop fandom quiz",
    description: "Take a K-pop fandom quiz: guess fandom names and lightsticks, then test what you know about concerts, photocards, Weverse and fan slang. Free, no sign-up.",
    intro: "This K-pop fandom quiz page gathers {count} free quizzes about fan life: official fandom names, lightsticks and group colors, concerts and tours, photocards and merch, Weverse and the slang fans use online. They mix many groups, so any fan can play. Start with the easy ones at the top.",
    contentDate: "2026-10-24",
    sections: [
      {
        heading: "Fandom names and lightsticks",
        slugs: [
          "k-pop-fandom-names-true-or-false",
          "k-pop-fandoms-true-or-false",
          "k-pop-concert-and-light-stick-culture",
          "k-pop-fandom-names-quiz",
          "k-pop-lightstick-colors-and-shapes",
          "k-pop-concert-and-tour-facts",
          "guess-the-group-from-their-lightstick-girl-groups",
          "name-the-group-from-the-fandom-name",
          "k-pop-group-colors-and-lightsticks",
          "guess-the-group-from-their-lightstick-boy-groups",
          "guess-the-groups-fan-name",
          "k-pop-concert-facts-true-or-false",
          "k-pop-concert-tours",
        ],
      },
      {
        heading: "Fan culture",
        slugs: [
          "k-pop-fan-moments-and-memes",
          "k-pop-social-media-and-online-culture",
          "k-pop-inside-jokes-and-running-gags",
          "k-pop-merchandise-and-collecting",
          "k-pop-mascots-and-cute-culture",
          "k-pop-group-friendships",
          "k-pop-photocard-culture-quiz",
          "k-pop-weverse-and-social-media-quiz",
          "k-pop-weverse-and-fan-platforms",
          "k-pop-korean-language-basics-for-fans",
          "k-pop-album-packaging-quiz",
          "k-pop-lingo-and-fan-culture",
        ],
      },
    ],
    alsoFits: [
      "k-pop-tiktok-viral-moments",
    ],
    ownerLinks: [{ href: "/trivia", anchor: "K-pop trivia" }],
  },
  {
    slug: "kpop-discography-quiz",
    title: "K-pop Discography Quiz: Songs, Albums and B-sides",
    h1: "K-pop discography quiz",
    primaryPhrase: "K-pop discography quiz",
    description: "Take a K-pop discography quiz: complete song titles, date releases, spot the B-side and name the album from its cover, across many groups. Free, no sign-up.",
    intro: "This K-pop discography quiz page gathers {count} free quizzes about songs and albums from many groups: song titles, release years, B-sides, album covers, collaborations and songs that share a theme. There is no audio here: to name songs from a clip, play the K-pop blind test. The quizzes run from easy to hard.",
    contentDate: "2026-10-27",
    sections: [
      {
        heading: null,
        slugs: [
          "complete-the-k-pop-song-title",
          "k-pop-weather-and-season-songs",
          "k-pop-songs-of-2024-quiz",
          "k-pop-songs-of-2023-quiz",
          "k-pop-collaboration-with-western-artists",
          "which-year-did-this-song-come-out",
          "k-pop-b-sides-that-became-fan-favorites",
          "k-pop-english-songs-quiz",
          "k-pop-songs-with-colors-in-the-title",
          "name-that-album-cover",
          "k-pop-music-production",
          "k-pop-surprise-collaborations",
          "its-a-zoo-animals-in-k-pop",
          "k-pop-international-collaborations",
          "taste-the-rainbow-colors-in-k-pop",
          "cooking-like-a-chef-food-drinks-in-k-pop",
          "space-themed-k-pop",
          "k-pop-sub-units-their-songs",
          "find-the-intruder-song-with-a-different-title",
          "guess-the-common-song-title-from-the-list-of-artists",
          "guess-the-common-song-title-from-the-list-of-artists-2",
          "name-that-boy-group-album",
          "song-covers-in-k-pop",
        ],
      },
    ],
    alsoFits: [
      "k-pop-and-k-drama-osts",
      "k-pop-albums-that-sold-millions",
      "k-pop-ost-drama-soundtracks-quiz",
      "k-pop-album-packaging-quiz",
    ],
    ownerLinks: [{ href: "/blindtest", anchor: "K-pop blind test" }, { href: "/guess-the-kpop-song", anchor: "guess the K-pop song" }],
  },
  {
    slug: "kpop-dance-quiz",
    title: "K-pop Dance Quiz: Choreography and Music Videos",
    h1: "K-pop dance quiz",
    primaryPhrase: "K-pop dance quiz",
    description: "Take a K-pop dance quiz: name iconic moves and viral dance challenges, then spot the music video that does not belong and match each concept. Free, no sign-up.",
    intro: "This K-pop dance quiz page gathers {count} free quizzes about performance: choreography, iconic moves, viral dance challenges, music videos and comeback concepts. Every quiz mixes many groups, so you can play without a favorite. The quizzes run from easy to hard, so start at the top and work your way down.",
    contentDate: "2026-10-06",
    sections: [
      {
        heading: null,
        slugs: [
          "find-the-music-video-that-does-not-belong",
          "k-pop-tiktok-viral-moments",
          "k-pop-choreography-quiz",
          "k-pop-iconic-dances-name-that-move",
          "k-pop-music-video-themes-quiz",
          "k-pop-choreography-and-dance",
          "k-pop-viral-dance-challenges",
          "k-pop-aesthetics-and-concepts",
        ],
      },
    ],
    alsoFits: [
      "k-pop-iconic-outfits-and-fashion",
      "k-pop-music-video-records",
    ],
    ownerLinks: [{ href: "/kpop-games", anchor: "K-pop games" }],
  },
  {
    slug: "kpop-awards-quiz",
    title: "K-pop Awards Quiz: Records, Charts and Wins",
    h1: "K-pop awards quiz",
    primaryPhrase: "K-pop awards quiz",
    description: "Take a K-pop awards quiz on music show wins, chart firsts, streaming and album sales records, and the milestones fans still talk about. Free, no sign-up.",
    intro: "This K-pop awards quiz page gathers {count} free quizzes about wins and records: music show programs, award milestones, chart firsts, streaming numbers, music video views and albums that sold millions. They mix many groups, so any fan can play. Start with the easy ones at the top and end with the hardest.",
    contentDate: "2026-10-10",
    sections: [
      {
        heading: null,
        slugs: [
          "k-pop-awards-and-records-true-or-false",
          "k-pop-music-shows-true-or-false",
          "k-pop-albums-that-sold-millions",
          "k-pop-music-show-programs-quiz",
          "k-pop-music-video-records",
          "k-pop-streaming-records",
          "k-pop-awards-and-milestones",
          "k-pop-milestones-and-firsts-true-or-false",
          "k-pop-records-true-or-false",
        ],
      },
    ],
    alsoFits: [
      "psy-and-gangnam-style-era",
      "k-pop-goes-west",
      "k-pop-concert-tours",
    ],
    ownerLinks: [{ href: "/trivia", anchor: "K-pop trivia" }],
  },
  {
    slug: "kpop-drama-variety-quiz",
    title: "K-pop Drama and Variety Quiz: Idols on TV",
    h1: "K-pop drama and variety quiz",
    primaryPhrase: "K-pop drama and variety quiz",
    description: "Take a K-pop drama and variety quiz: idols who act, drama OSTs, variety show moments and survival shows like Produce 101. Free to play, no sign-up.",
    intro: "This K-pop drama and variety quiz page gathers {count} free quizzes about idols on TV: idols who act in Korean dramas, drama soundtracks, variety show moments and the survival shows that formed new groups. Every quiz mixes many groups and shows. Start with the easy ones at the top and work down.",
    contentDate: "2026-10-19",
    sections: [
      {
        heading: null,
        slugs: [
          "k-pop-idols-who-act",
          "k-pop-and-k-drama-osts",
          "k-pop-idols-in-dramas-true-or-false",
          "k-pop-survival-shows-quiz",
          "k-pop-produce-series-quiz",
          "k-pop-ost-drama-soundtracks-quiz",
          "k-pop-idols-in-korean-dramas",
          "k-pop-variety-shows-and-games",
          "k-pop-survival-shows",
          "k-pop-variety-shows",
          "k-pop-variety-show-moments",
        ],
      },
    ],
    alsoFits: [
      "k-pop-music-show-programs-quiz",
    ],
    ownerLinks: [{ href: "/trivia", anchor: "K-pop trivia" }],
  },
  {
    slug: "kpop-idol-quiz",
    title: "K-pop Idol Quiz: Members, Positions and Nicknames",
    h1: "K-pop idol quiz",
    primaryPhrase: "K-pop idol quiz",
    description: "Take a K-pop idol quiz: match members to their groups, name leaders and maknae, and test nicknames, positions, birthplaces and style. Free, no sign-up.",
    intro: "This K-pop idol quiz page gathers {count} free quizzes about the members themselves: which group an idol is in, leaders and maknae, positions, nicknames, nationalities, idol life, food and fashion. Every quiz mixes many groups. For clue by clue rounds, play guess the K-pop idol. The quizzes run from easy to hard.",
    contentDate: "2026-10-16",
    sections: [
      {
        heading: "Members and roles",
        slugs: [
          "which-group-is-this-member-from-boy-groups",
          "can-you-name-these-male-kpop-idols",
          "k-pop-idol-nationalities",
          "k-pop-positions-explained-quiz",
          "k-pop-birthplace-quiz-where-are-they-from",
          "k-pop-fun-facts-true-or-false-volume-2",
          "k-pop-group-leaders-quiz",
          "k-pop-maknae-youngest-member-quiz",
          "which-group-is-this-member-from",
          "k-pop-birthplace-true-or-false",
          "k-pop-idol-nicknames",
          "k-pop-member-nicknames-and-fun-facts",
          "k-pop-surprising-and-weird-facts",
        ],
      },
      {
        heading: "Idol life, food and style",
        slugs: [
          "k-pop-idols-and-food",
          "k-pop-idol-life-true-or-false",
          "k-pop-iconic-outfits-and-fashion",
          "k-pop-food-quiz-idols-and-their-favorites",
          "k-pop-food-and-mukbang-culture",
          "k-pop-military-service-deep-dive",
          "k-pop-fashion-and-style-quiz",
          "k-pop-fashion-true-or-false",
          "k-pop-fashion-and-brand-ambassadors",
        ],
      },
    ],
    alsoFits: [
      "which-company-does-this-idol-belong-to",
      "k-pop-training-system-and-idol-life",
      "name-the-group-from-its-members-girl-groups",
      "name-the-group-from-its-members-boy-groups",
    ],
    ownerLinks: [{ href: "/guess-the-kpop-idol", anchor: "guess the K-pop idol" }],
  },
  {
    slug: "kpop-groups-quiz",
    title: "K-pop Groups Quiz: Logos, Members and Names",
    h1: "K-pop groups quiz",
    primaryPhrase: "K-pop groups quiz",
    description: "Take a K-pop groups quiz: guess the group from its logo or members, count the members and learn what group names mean, across every generation. Free.",
    intro: "This K-pop groups quiz page gathers {count} free quizzes about groups as a whole: guess a group from its logo, members or photo, count the members, learn what the names mean and compare boy groups and girl groups. To browse every group, open K-pop groups A to Z. The quizzes run from easy to hard.",
    contentDate: "2026-10-27",
    sections: [
      {
        heading: "Guess the group",
        slugs: [
          "k-pop-numbers-quiz-how-many-members",
          "k-pop-girl-groups-true-or-false",
          "which-k-pop-group-has-more-members",
          "name-the-group-from-its-members-girl-groups",
          "name-the-group-from-its-members-boy-groups",
          "k-pop-group-name-meanings-true-or-false",
          "k-pop-group-name-meanings",
          "logo-quiz-how-many-groups-can-you-recognize",
          "guess-the-odd-one-out-boy-groups",
          "gen-5-k-pop-can-you-name-the-group",
          "k-pop-boy-groups-true-or-false",
          "guess-the-underrated-groups",
          "idol-bands-quiz",
        ],
      },
      {
        heading: "Quizzes about one group",
        slugs: [
          "bts-true-or-false",
          "blackpink-true-or-false-1781311005",
          "nct-dream-quiz",
          "kep1er-quiz",
          "mamamoo-members-and-facts",
          "iu-the-nations-little-sister",
          "nct-system-explained-quiz",
          "day6-quiz",
          "mamamoo-true-or-false",
          "treasure-basics",
        ],
      },
    ],
    alsoFits: [
      "which-group-is-this-member-from-boy-groups",
      "guess-the-group-from-their-lightstick-girl-groups",
      "name-the-group-from-the-fandom-name",
      "k-pop-sub-units-and-solo-debuts",
    ],
    ownerLinks: [{ href: "/groups", anchor: "K-pop groups A to Z" }],
  },
];

/** Quizzes held off the theme pages by the owner rules (themes.json "held"); they stay on the hub only. */
export const HELD_FROM_THEMES: readonly string[] = [
  "finnish-the-lyric",
  "k-pop-dating-and-relationships-verified-facts-only",
  "k-pop-sasaeng-and-fan-culture-dark-side",
  "can-you-recognize-these-idols-as-kids",
  "kpop-geral",
  "best-kpop-group",
  "do-you-like-the-same-kpop-groups-as-me",
];

export const THEME_SLUGS: readonly string[] = GENERAL_THEMES.map((t) => t.slug);

/** A theme page lists at least this many published quizzes, else it is noindex and out of the sitemap. */
export const THEME_MIN_LISTED = 5;

export function themeBySlug(slug: string): GeneralTheme | null {
  return GENERAL_THEMES.find((t) => t.slug === slug) ?? null;
}
