// V12 G5: builds the two quiz views (Which member are you for one group, the KPop
// Demon Hunters bridge quiz) from the real tables. Server only.

import { getModeById } from '@/lib/blind-test-modes';
import { hasTriviaPage } from '@/lib/db/queries/trivia';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';
import { getPlayableGroups } from '@/lib/ux-v1/p6/hub-data';

import { BRIDGE_OUTCOMES, BRIDGE_PATH, BRIDGE_PLAYLIST_ID, BRIDGE_QUESTIONS, BRIDGE_SLUGS } from './bridge';
import { getBridgeCounts, getBridgeGroups, getDatedMemberCounts, getWmaData } from './data';
import { answerBlock, mostCommon } from './page-copy';
import { getRoster, sourcedRole } from './rosters';
import { playerDescription, playerTraits } from './traits';
import { axisOptionIcon, buildDistribution, whichMemberPath } from './view';

import type { PersonalityGroup } from './data';
import type { MostCommon, SavedResults } from './page-copy';
import type { Roster } from './rosters';
import type { QuizView, ResultView } from './view';

export const SITE = 'https://kpopquiz.org';

/** Slug -> real number of playable blindtest songs. Empty when the read fails (no blindtest link then). */
async function playableSongs(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return out;
  try {
    for (const g of await getPlayableGroups()) out.set(g.slug, g.songs);
  } catch { /* fail soft: the link is simply not offered */ }
  return out;
}

export interface WmaPage {
  group: PersonalityGroup;
  view: QuizView;
  /** Real playable song count of the group's blindtest, or null when it is not playable. */
  blindtestSongs: number | null;
  /** The sourced line-up (Wikidata and Wikipedia), or null: the members section then hides. */
  roster: Roster | null;
  /** Saved results of the current members with the date they were read, or null when unread. */
  saved: SavedResults | null;
  /** The most common results, only above MOST_COMMON_MIN saved results and without minors. */
  common: MostCommon | null;
  /** The group has a trivia page (same gate as the hub link). */
  trivia: boolean;
}

/** True when the group has a trivia page; a failed read hides the link. */
async function triviaLink(groupId: number, slug: string): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return false;
  try { return await hasTriviaPage(groupId, slug); } catch { return false; }
}

export async function getWmaPage(slug: string): Promise<WmaPage | null> {
  const data = await getWmaData(slug);
  if (!data) return null;
  const { group, questions, profiles } = data;
  const [dated, playable, trivia] = await Promise.all([getDatedMemberCounts(group.id), playableSongs(), triviaLink(group.id, group.slug)]);
  const counts = dated?.counts ?? null;
  const roster = getRoster(group.slug);

  // The role is the sourced one (rosters.ts), or the plain "Member of <group>": a role
  // the sources do not give is never printed (SEO Mission 2, part D).
  const results: ResultView[] = profiles.map((p) => ({
    id: p.id,
    name: p.name,
    role: sourcedRole(group.slug, p.id) ?? `Member of ${group.name}`,
    description: playerDescription(p.axes),
    traits: playerTraits(p.axes),
    photo: null,
  }));

  // Saved results of the current members only (a stored name that is no longer a result is not counted).
  const saved: SavedResults | null = dated
    ? { total: profiles.reduce((s, p) => s + (counts?.[p.name] ?? 0), 0), asOf: dated.asOf }
    : null;
  const common = mostCommon(counts, profiles.map((p) => ({ name: p.name })), dated?.asOf ?? null, roster?.minors ?? true);

  const view: QuizView = {
    quiz: 'wma',
    groupSlug: group.slug,
    kicker: 'Which member are you',
    kickerIcon: 'users',
    title: { before: 'Which ', em: group.name, after: ' member are you?' },
    // The 40 to 60 word answer block, in the server HTML under the H1 (rulebook section 3).
    lead: answerBlock(group.name, questions.length, saved),
    meta: [`${questions.length} questions`, 'About 2 minutes', 'No pictures needed'],
    cta: 'Start',
    eyebrow: 'You are',
    who: group.fandom ?? 'fans',
    questions: questions.map((q) => ({ text: q.text, options: q.options.map((o) => ({ text: o.text, icon: axisOptionIcon(o.weights) })) })),
    engine: { kind: 'axes', questions, profiles: profiles.map((p) => ({ id: p.id, name: p.name, axes: p.axes })) },
    results,
    distribution: buildDistribution(counts, profiles.map((p) => ({ id: p.id, label: p.name, key: p.name }))),
    shareUrl: `${SITE}${whichMemberPath(group.slug)}`,
    shareKicker: `Which ${group.name} member are you`,
    biasOffer: true,
  };
  return { group, view, blindtestSongs: playable.get(group.slug) ?? null, roster, saved, common, trivia };
}

export interface BridgePage {
  view: QuizView;
  /** The KPop Demon Hunters playlist exists (lib/blind-test-modes.ts): the breadcrumb links to it. */
  playlistHref: string | null;
}

export async function getBridgePage(): Promise<BridgePage> {
  const groups = await getBridgeGroups();
  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  const [counts, playable] = await Promise.all([getBridgeCounts(groups), playableSongs()]);

  const results: ResultView[] = BRIDGE_OUTCOMES.map((o) => {
    const g = bySlug.get(o.slug);
    return {
      id: o.slug,
      name: g?.name ?? o.name,
      role: o.line,
      description: o.reason,
      traits: [...o.traits],
      photo: groupPhotoUrl(o.slug),
      songs: o.songs,
      groupHref: g ? `/${o.slug}-quiz` : null,
      blindtestHref: g && playable.has(o.slug) ? `/blindtest/group-${o.slug}` : null,
    };
  });

  const view: QuizView = {
    quiz: 'kpdh',
    groupSlug: null,
    kicker: 'KPop Demon Hunters',
    kickerIcon: 'music',
    title: { before: 'Loved HUNTR/X? Find your ', em: 'real girl group', after: '' },
    lead: 'Six questions about the film and your taste. At the end: a real K-pop group, why it fits you, and three songs to start with.',
    meta: [`${BRIDGE_QUESTIONS.length} questions`, 'About 1 minute', 'Text only'],
    cta: 'Find my group',
    eyebrow: 'Your group is',
    who: 'players',
    questions: BRIDGE_QUESTIONS.map((q) => ({ text: q.text, options: q.options.map((o) => ({ text: o.text, icon: o.icon })) })),
    engine: { kind: 'tally', questions: BRIDGE_QUESTIONS, outcomes: BRIDGE_SLUGS },
    results,
    // Shares only when all six groups exist: with one missing the six rows would not add up to everyone.
    distribution: groups.length === BRIDGE_SLUGS.length
      ? buildDistribution(counts, results.map((r) => ({ id: r.id, label: r.name, key: r.id })))
      : null,
    shareUrl: `${SITE}${BRIDGE_PATH}`,
    shareKicker: 'Loved HUNTR/X? My real K-pop girl group',
    biasOffer: false,
  };
  return { view, playlistHref: getModeById(BRIDGE_PLAYLIST_ID) ? `/blindtest/${BRIDGE_PLAYLIST_ID}` : null };
}
