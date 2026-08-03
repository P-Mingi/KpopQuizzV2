// V-UPGRADE-1 Phase A - the badge catalog: the single source of truth for the
// tiered badge families. EXTENDS (does not fork) the existing badge system: each
// tier is a badge_definitions row (seeded by migration 145, owner-run) plus a
// user_badges grant. Thresholds + metric + rarity live HERE in code (there is no
// threshold column), exactly how the existing streak / creator tiers are grouped
// in lib/badges.ts. A1 rulings applied: Golden Ear = blindtest GAMES played (real
// stored counter), Sourcerer = sourced fact overrides, Name Them All + Quest
// Runner deferred (no honest per-user source). Higher tier = higher rarity.

import type { Rarity } from '@/lib/badges';

export type BadgeCategory = 'play' | 'verse' | 'cross';

/** A metric the award engine knows how to compute for a user (see award.ts). */
export type BadgeMetric =
  | 'quizzes_played' | 'perfect_scores' | 'blindtests_played' | 'personality_plays'
  | 'daily_streak_longest' | 'debate_votes' | 'quizzes_created' | 'plays_received'
  | 'distinct_groups_played' | 'wiki_pages' | 'sourced_overrides' | 'essays_published'
  | 'photocard_sets' | 'nest_depth' | 'era_stories' | 'contrib_streak' | 'first_fan'
  | 'founding_curator' | 'dual_citizen' | 'spaces_joined' | 'account_age_years' | 'completionist';

export interface BadgeTierDef {
  id: string;          // badge_definitions.id, e.g. 'marathoner_50'
  threshold: number;   // metric value that earns this tier (1 for one-time)
  rarity: Rarity;
  name: string;        // badge_definitions.name (distinct per tier)
  description: string; // badge_definitions.description (the "how", one clean line)
}
export interface BadgeFamily {
  key: string;
  label: string;       // the shelf tier-group row label
  category: BadgeCategory;
  metric: BadgeMetric;
  iconKey: string;     // BadgeIcon key (A3 supplies the vector art)
  noun: string;        // short noun for the "you have X / Y" progress line
  desc: string;        // description template; {n} is the threshold
  one?: string;        // singular description used when a tier's threshold is 1
  tiers: number[];     // thresholds ascending (1 => one-time)
  rarities: Rarity[];  // one per tier, ascending
}

// Rarity ramps (higher tier = higher rarity), from the 5-rung ladder in badges.ts.
const R4: Rarity[] = ['uncommon', 'rare', 'epic', 'legendary'];
const R3: Rarity[] = ['uncommon', 'rare', 'epic'];
const R3H: Rarity[] = ['rare', 'epic', 'legendary']; // prestigious 3-rung
const ONE_EPIC: Rarity[] = ['epic'];
const ONE_LEG: Rarity[] = ['legendary'];

const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

export const BADGE_FAMILIES: BadgeFamily[] = [
  // ---- PLAY ----
  { key: 'marathoner', label: 'Marathoner', category: 'play', metric: 'quizzes_played', iconKey: 'flag', noun: 'quizzes', desc: 'Play {n} quizzes.', tiers: [10, 50, 250, 1000], rarities: R4 },
  { key: 'perfectionist', label: 'Perfectionist', category: 'play', metric: 'perfect_scores', iconKey: 'target', noun: 'perfect scores', desc: 'Score 100% on {n} quizzes.', one: 'Score 100% on a quiz.', tiers: [1, 10, 50, 200], rarities: R4 },
  { key: 'golden_ear', label: 'Golden Ear', category: 'play', metric: 'blindtests_played', iconKey: 'headphones', noun: 'blind tests', desc: 'Play {n} blind tests.', tiers: [5, 25, 100], rarities: R3 },
  { key: 'bias_radar', label: 'Bias Radar', category: 'play', metric: 'personality_plays', iconKey: 'radar', noun: 'which-member quizzes', desc: 'Take {n} which-member quizzes.', tiers: [5, 25, 100], rarities: R3 },
  { key: 'daily_devotion', label: 'Daily Devotion', category: 'play', metric: 'daily_streak_longest', iconKey: 'calendar', noun: 'days', desc: 'Reach a {n}-day play streak.', tiers: [7, 30, 100, 365], rarities: R4 },
  { key: 'debater', label: 'Debater', category: 'play', metric: 'debate_votes', iconKey: 'chat', noun: 'votes', desc: 'Cast {n} daily-debate votes.', tiers: [5, 25, 100], rarities: R3 },
  { key: 'quizmaker', label: 'Quizmaker', category: 'play', metric: 'quizzes_created', iconKey: 'pencil', noun: 'quizzes', desc: 'Create {n} quizzes.', one: 'Create a quiz.', tiers: [1, 5, 25], rarities: R3 },
  { key: 'reached', label: 'Reached', category: 'play', metric: 'plays_received', iconKey: 'signal', noun: 'plays', desc: 'Earn {n} plays on the quizzes you made.', tiers: [100, 1000, 10000], rarities: R3H },
  { key: 'fandom_traveler', label: 'Fandom Traveler', category: 'play', metric: 'distinct_groups_played', iconKey: 'globe', noun: 'fandoms', desc: 'Play quizzes from {n} different fandoms.', tiers: [5, 15, 40], rarities: R3 },
  // ---- VERSE ----
  { key: 'wordsmith', label: 'Wordsmith', category: 'verse', metric: 'wiki_pages', iconKey: 'book', noun: 'pages', desc: 'Write {n} wiki pages.', one: 'Write a wiki page.', tiers: [1, 5, 25, 100], rarities: R4 },
  { key: 'sourcerer', label: 'Sourcerer', category: 'verse', metric: 'sourced_overrides', iconKey: 'link', noun: 'sourced facts', desc: 'Add {n} facts, each with a source.', tiers: [10, 50, 250], rarities: R3 },
  { key: 'essayist', label: 'Essayist', category: 'verse', metric: 'essays_published', iconKey: 'feather', noun: 'essays', desc: 'Publish {n} essays.', one: 'Publish an essay.', tiers: [1, 5, 25], rarities: R3 },
  { key: 'quest_collector', label: 'Collector', category: 'verse', metric: 'photocard_sets', iconKey: 'cards', noun: 'sets', desc: 'Complete {n} photocard sets.', one: 'Complete a photocard set.', tiers: [1, 5, 25], rarities: R3 },
  { key: 'cartographer', label: 'Cartographer', category: 'verse', metric: 'nest_depth', iconKey: 'map', noun: 'levels', desc: 'Nest wiki pages {n} levels deep.', tiers: [3, 5, 8], rarities: R3H },
  { key: 'chronicler', label: 'Chronicler', category: 'verse', metric: 'era_stories', iconKey: 'scroll', noun: 'era stories', desc: 'Write {n} era stories.', one: 'Write an era story.', tiers: [1, 3, 10], rarities: R3 },
  { key: 'steady_hand', label: 'Steady Hand', category: 'verse', metric: 'contrib_streak', iconKey: 'flame', noun: 'days', desc: 'Reach a {n}-day contribution streak.', tiers: [7, 30, 100], rarities: R3 },
  { key: 'first_fan', label: 'First Fan', category: 'verse', metric: 'first_fan', iconKey: 'medal', noun: '', desc: 'Be among the first 50 members of any fandom space.', tiers: [1], rarities: ONE_EPIC },
  { key: 'founding_curator', label: 'Founding Curator', category: 'verse', metric: 'founding_curator', iconKey: 'crown', noun: '', desc: 'A founding curator of the platform. Awarded by KpopVerse.', tiers: [1], rarities: ONE_LEG },
  // ---- CROSS-WORLD ----
  { key: 'dual_citizen', label: 'Dual Citizen', category: 'cross', metric: 'dual_citizen', iconKey: 'bridge', noun: '', desc: 'Play a quiz and make a Verse contribution.', tiers: [1], rarities: ONE_EPIC },
  { key: 'multi_fandom', label: 'Multi-Fandom', category: 'cross', metric: 'spaces_joined', iconKey: 'people', noun: 'spaces', desc: 'Join {n} fandom spaces.', tiers: [3, 7, 15], rarities: R3 },
  { key: 'veteran', label: 'Veteran', category: 'cross', metric: 'account_age_years', iconKey: 'hourglass', noun: 'years', desc: 'Spend {n} years on KpopQuiz.', one: 'Spend a year on KpopQuiz.', tiers: [1, 2, 3], rarities: R3 },
  { key: 'completionist', label: 'Completionist', category: 'cross', metric: 'completionist', iconKey: 'star', noun: '', desc: 'Hold at least one badge in every category. The capstone.', tiers: [1], rarities: ONE_LEG },
];

/** A one-time badge is a single tier that is not a threshold ladder. */
export function isOneTime(f: BadgeFamily): boolean {
  return f.tiers.length === 1 && f.noun === '';
}

/** Every tier definition across all families (the migration + engine iterate this). */
export function expandFamilies(): (BadgeTierDef & { family: string; category: BadgeCategory; metric: BadgeMetric; iconKey: string })[] {
  const out: (BadgeTierDef & { family: string; category: BadgeCategory; metric: BadgeMetric; iconKey: string })[] = [];
  for (const f of BADGE_FAMILIES) {
    const one = isOneTime(f);
    f.tiers.forEach((threshold, i) => {
      const id = one ? f.key : `${f.key}_${threshold}`;
      const name = one ? f.label : `${f.label} ${ROMAN[i]}`;
      const description = threshold === 1 && f.one ? f.one : f.desc.replace('{n}', threshold.toLocaleString('en-US'));
      out.push({ id, threshold, rarity: f.rarities[i]!, name, description, family: f.key, category: f.category, metric: f.metric, iconKey: f.iconKey });
    });
  }
  return out;
}

/** All new badge ids (for coverage checks + the completionist category map). */
export const NEW_BADGE_TIERS = expandFamilies();
