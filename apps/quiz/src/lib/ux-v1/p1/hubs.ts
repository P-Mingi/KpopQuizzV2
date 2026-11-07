/**
 * The live home's hub order (components/home/home-group-pills.tsx ORDER, SEO PR-I2:
 * every Tier A/B head-term hub linked from the home, the high-impression rookies
 * near the front). The v11 groups rail keeps every one of these hub links, in this
 * order; p1.test.ts reads the live file and fails if the two lists drift apart.
 */
export const LIVE_HUB_ORDER: readonly string[] = [
  'general-kpop', 'bts', 'blackpink', 'cortis', 'illit', 'stray-kids', 'twice',
  'aespa', 'seventeen', 'newjeans', 'babymonster', 'exo', 'ive', 'enhypen',
  'txt', 'le-sserafim', 'itzy',
];

/**
 * OtakuQuiz (owner, 2026-11-07): the series rail of the anime home lists every series by copies in circulation (Wikipedia "List
 * of best-selling manga" and "List of best-selling light novels", publisher announcements for Sakamoto Days, Kaiju No. 8,
 * Dandadan, Bocchi the Rock! and Kagurabachi). Vinland Saga and Mob Psycho 100 are placed provisionally (no figure found); the
 * last six (Code Geass to Omniscient Reader's Viewpoint) are an original anime, a visual novel or webtoons, in the owner's order.
 * Anime Mix is not a series by sales: it keeps its place among the series with a new quiz. The kpop list above matches no anime
 * series, so before this the rail only showed the three series with the newest quiz. A slug the database lacks is skipped.
 */
export const ANIME_HOME_SERIES_ORDER: readonly string[] = [
  'one-piece', 'detective-conan', 'dragon-ball', 'naruto', 'demon-slayer', 'slam-dunk', 'jujutsu-kaisen', 'attack-on-titan',
  'bleach', 'jojo', 'hunter-x-hunter', 'my-hero-academia', 'fullmetal-alchemist', 'tokyo-revengers', 'haikyu', 'gintama',
  'fairy-tail', 'that-time-i-got-reincarnated-as-a-slime', 'blue-lock', 'inuyasha', 'tokyo-ghoul', 'sailor-moon',
  'apothecary-diaries', 'spy-x-family', 'one-punch-man', 'chainsaw-man', 'frieren', 'death-note', 'fruits-basket',
  'sword-art-online', 'evangelion', 'oshi-no-ko', 'black-clover', 'kaguya-sama-love-is-war', 'dr-stone', 'sakamoto-days',
  're-zero', 'kaiju-no-8', 'dandadan', 'vinland-saga', 'solo-leveling', 'bocchi-the-rock', 'kagurabachi', 'mob-psycho-100',
  'code-geass', 'steins-gate', 'cowboy-bebop', 'violet-evergarden', 'tower-of-god', 'omniscient-readers-viewpoint',
];

/** The leading order of the home rail of a site: the live hub order on kpop (and the hub), the famous series on anime. */
export function homeRailOrder(site: string): readonly string[] {
  return site === 'anime' ? ANIME_HOME_SERIES_ORDER : LIVE_HUB_ORDER;
}
