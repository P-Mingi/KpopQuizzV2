// V12 G5: the KPop Demon Hunters bridge quiz (SYSTEM.md section 4, prototype view
// `kpdh`): "Loved HUNTR/X? Find your real K-pop girl group." Six picture-free
// questions, weighted answers, one of six real groups as the result with the
// reason and three songs to start with.
//
// Text only: the film is named descriptively, with no poster, still, character
// art or logo anywhere. The questions and reasons are the prototype's copy. The
// label, the debut year and the song years are public release facts.

import type { TallyQuestion } from './engine';

export const BRIDGE_PATH = '/kpop-demon-hunters-quiz';
/** The blindtest playlist the breadcrumb links to (lib/blind-test-modes.ts). */
export const BRIDGE_PLAYLIST_ID = 'kpop-demon-hunters';

/**
 * How a bridge result is stored in personality_results: `group_id` is the group
 * the player got and `member_name` is this fixed key, so the rows never mix with
 * the member results of that group (those carry a real member name).
 */
export const BRIDGE_RESULT_KEY = '@kpop-demon-hunters-quiz';

export interface BridgeOutcome {
  /** groups.slug */
  slug: string;
  /** Shown when the groups row cannot be read. */
  name: string;
  /** "YG Entertainment · since 2016" */
  line: string;
  reason: string;
  traits: [string, string, string];
  songs: Array<{ title: string; year: number }>;
}

/** Order matters: a tie goes to the first outcome. */
export const BRIDGE_OUTCOMES: BridgeOutcome[] = [
  {
    slug: 'blackpink', name: 'BLACKPINK', line: 'YG Entertainment · since 2016',
    reason: "Fierce, glamorous and built for stadiums. If Rumi's voice gave you chills, BLACKPINK is where to start.",
    traits: ['Fierce', 'Iconic', 'Stadium-sized'],
    songs: [{ title: 'DDU-DU DDU-DU', year: 2018 }, { title: 'How You Like That', year: 2020 }, { title: 'Pink Venom', year: 2022 }],
  },
  {
    slug: 'twice', name: 'TWICE', line: 'JYP Entertainment · since 2015',
    reason: 'Friendship, bright hooks and fans at the centre of everything. TWICE is on the soundtrack too.',
    traits: ['Bright', 'Catchy', 'Warm'],
    songs: [{ title: 'TT', year: 2016 }, { title: 'FANCY', year: 2019 }, { title: 'Strategy', year: 2024 }],
  },
  {
    slug: 'itzy', name: 'ITZY', line: 'JYP Entertainment · since 2019',
    reason: 'Dance power and self-belief. For fans who rewatched the fight scenes for the choreography.',
    traits: ['Powerful', 'Confident', 'Sharp'],
    songs: [{ title: 'DALLA DALLA', year: 2019 }, { title: 'WANNABE', year: 2020 }, { title: 'LOCO', year: 2021 }],
  },
  {
    slug: 'aespa', name: 'aespa', line: 'SM Entertainment · since 2020',
    reason: 'A whole universe of lore, dark synths and big concepts. The closest thing to demon lore in K-pop.',
    traits: ['Futuristic', 'Bold', 'Mysterious'],
    songs: [{ title: 'Next Level', year: 2021 }, { title: 'Supernova', year: 2024 }, { title: 'Whiplash', year: 2024 }],
  },
  {
    slug: 'le-sserafim', name: 'LE SSERAFIM', line: 'Source Music · since 2022',
    reason: 'Fearless by name. Hard-hitting performances and songs about getting back up.',
    traits: ['Fearless', 'Athletic', 'Resilient'],
    songs: [{ title: 'ANTIFRAGILE', year: 2022 }, { title: 'UNFORGIVEN', year: 2023 }, { title: 'EASY', year: 2024 }],
  },
  {
    slug: 'illit', name: 'ILLIT', line: 'BELIFT LAB · since 2024',
    reason: 'Dreamy, catchy and a little sweet. Start here if Soda Pop is stuck in your head.',
    traits: ['Dreamy', 'Sweet', 'Addictive'],
    songs: [{ title: 'Magnetic', year: 2024 }, { title: 'Cherish (My Love)', year: 2024 }, { title: 'Tick-Tack', year: 2024 }],
  },
];

export const BRIDGE_SLUGS: string[] = BRIDGE_OUTCOMES.map((o) => o.slug);

const BP = 'blackpink';
const TW = 'twice';
const IT = 'itzy';
const AE = 'aespa';
const LS = 'le-sserafim';
const IL = 'illit';

export const BRIDGE_QUESTIONS: TallyQuestion[] = [
  { text: 'Your favourite HUNTR/X member', options: [
    { text: 'Rumi, the leader with the big voice', icon: 'star', points: { [BP]: 2, [LS]: 1 } },
    { text: 'Mira, the dancer with the attitude', icon: 'zap', points: { [IT]: 2, [LS]: 1 } },
    { text: 'Zoey, the rapper who writes everything', icon: 'pen', points: { [TW]: 1, [IL]: 1, [AE]: 1 } },
    { text: 'All three, equally', icon: 'heart', points: { [TW]: 2 } },
  ] },
  { text: 'The song you replay most', options: [
    { text: 'Golden', icon: 'star', points: { [BP]: 1, [TW]: 1 } },
    { text: "How It's Done", icon: 'flame', points: { [LS]: 2 } },
    { text: 'Soda Pop', icon: 'music', points: { [IL]: 2, [TW]: 1 } },
    { text: 'Your Idol', icon: 'moon', points: { [AE]: 2 } },
  ] },
  { text: 'What hooked you?', options: [
    { text: 'The fights and the choreography', icon: 'zap', points: { [IT]: 2, [LS]: 1 } },
    { text: 'The demon lore', icon: 'moon', points: { [AE]: 2 } },
    { text: 'The friendship', icon: 'heart', points: { [TW]: 2 } },
    { text: 'The confidence and the glamour', icon: 'star', points: { [BP]: 2 } },
  ] },
  { text: 'Your dream concert moment', options: [
    { text: 'A whole stadium singing the chorus', icon: 'users', points: { [BP]: 1, [TW]: 1 } },
    { text: 'A perfectly synced dance break', icon: 'zap', points: { [IT]: 2 } },
    { text: 'Futuristic stage visuals', icon: 'globe', points: { [AE]: 2 } },
    { text: 'A cute moment with the fans', icon: 'heart', points: { [IL]: 2 } },
  ] },
  { text: 'Pick a word', options: [
    { text: 'Fierce', icon: 'flame', points: { [BP]: 2 } },
    { text: 'Bright', icon: 'sun', points: { [TW]: 2 } },
    { text: 'Fearless', icon: 'shield', points: { [LS]: 2 } },
    { text: 'Dreamy', icon: 'moon', points: { [IL]: 2 } },
  ] },
  { text: 'You want songs that are...', options: [
    { text: 'Big and anthemic', icon: 'vol', points: { [BP]: 1, [LS]: 1 } },
    { text: 'Catchy and fun', icon: 'music', points: { [TW]: 1, [IL]: 1 } },
    { text: 'Powerful to dance to', icon: 'zap', points: { [IT]: 2 } },
    { text: 'Strange and experimental', icon: 'globe', points: { [AE]: 2 } },
  ] },
];
