// Audit 04 section 2.4: the heads of the frozen top pages are exactly what main rendered before audit 04 (4d865c7). These are
// main's builders, kept under a legacy name and used for a frozen path only; the list is top-clicks-freeze.ts. Pure, so the tests
// can pin them for fixture data. Delete a line in the list and the page gets the audit 04 builder (group-meta.ts, index-pages-meta.ts).

import { atLeast } from '@/lib/stats/site-stats';
import { groupHubDescription, groupHubTitle, type GroupMetaInput } from './group-meta';
import { isTopClicksFrozen } from './top-clicks-freeze';
import type { PageMeta } from './index-pages-meta';

interface LegacyHubOverride { title: string; hook: string; description?: string }

/** Main's per-group hub wordings (CTR sprint), as they were before audit 04 P1-1. */
const LEGACY_HUB_OVERRIDES: Readonly<Record<string, LegacyHubOverride>> = {
  seventeen: { title: 'SEVENTEEN Quiz: Can You Name All 13 Members?', hook: 'Name all 13 members, guess the era, and prove you are a real CARAT' },
  bts: {
    title: 'BTS Quiz: How Well Do You Know BTS? Easy to Hard',
    hook: 'Pick a quiz by level, from easy member questions to hard era deep cuts, and prove you are a real ARMY',
    description: 'Take a BTS quiz at your level, from easy member questions to hard era deep cuts, ranked by how fans really score. Free, no sign-up, with a sourced BTS profile.',
  },
  aespa: { title: 'aespa Quiz: Name All 4 Members and More (2026)', hook: 'Name all 4 members, guess the era, and prove you are a real MY' },
  twice: { title: 'TWICE Quiz: Can You Name All 9 Members? (2026)', hook: 'Name all 9 members, guess the era, and prove you are a real ONCE' },
  'stray-kids': { title: 'Stray Kids Quiz: Name All 8 Members and More', hook: 'Name all 8 members, guess the song, and prove you are a real STAY' },
  illit: { title: 'ILLIT Quiz: Free Fan-Made Tests for GLLIT (2026)', hook: "Test your knowledge of ILLIT's members, songs, and eras, then prove you are a real GLLIT" },
  cortis: { title: 'Cortis Quiz: Test How Well You Know the Rookies', hook: "Test your knowledge of Cortis's members, songs, and 2025 debut" },
  babymonster: { title: 'BABYMONSTER Quiz: Free Tests for the YG Rookies', hook: "Test your knowledge of BABYMONSTER's members, songs, and eras" },
};

export interface HubHeadGroup { slug: string; name: string; fandom_name: string | null | undefined; quiz_count: number }

/** Main's group hub title and description (before audit 04 P1-1). `category`: the General K-pop category branch. */
export function legacyGroupHubMeta(group: HubHeadGroup, category: boolean, topicsText: string): PageMeta {
  const o = LEGACY_HUB_OVERRIDES[group.slug];
  const n = group.quiz_count;
  const title = o?.title ?? (n >= 2 ? `${group.name} Quiz: ${n} Free Fan-Made Tests` : `${group.name} Quiz: Free Fan-Made Trivia Test`);
  const description = o?.description
    ? o.description
    : category
    ? `Play ${n} free ${group.name} quizzes by topic: ${topicsText}. No sign-up.`
    : o
    ? `Play ${atLeast(n)} free ${group.name} quizzes made by fans. ${o.hook}. Start now, no sign-up.`
    : n >= 2
    ? `Play ${n} free ${group.name} quizzes made by fans. Test your knowledge of ${group.name}'s members, songs, eras, and history, then prove you are a real ${group.fandom_name}.`
    : `Play the free ${group.name} quiz made by fans. Test your knowledge of ${group.name}'s members, songs, eras, and history, then prove you are a real ${group.fandom_name}.`;
  return { title, description };
}

/**
 * The title and description of a hub: main's for a frozen /{slug}-quiz, else audit 04's. `fresh` is the audit 04 result for a group
 * (the category branch included), passed in so this module does not import the React page.
 */
export function groupHubHead(group: HubHeadGroup, category: boolean, topicsText: string, fresh: PageMeta): PageMeta {
  return isTopClicksFrozen(`/${group.slug}-quiz`) ? legacyGroupHubMeta(group, category, topicsText) : fresh;
}

/** Re-export so a caller builds the audit 04 pair in one place. */
export function freshGroupHubMeta(input: GroupMetaInput): PageMeta {
  return { title: groupHubTitle(input), description: groupHubDescription(input) };
}

/** Main's /quizzes head. `countLabel` is "450+ " (with its space) or "". */
export function legacyQuizzesMeta(countLabel: string): PageMeta {
  return {
    title: `K-pop Quizzes: ${countLabel}Free Fan-Made Tests`,
    description: `Browse ${countLabel}free K-pop quizzes made by fans. Filter by group or type, sort by trending, newest, or most played, and test your bias knowledge now.`,
  };
}

/** Main's /blindtest head. `line` is the catalog line ("450+ songs across 80+ groups" or the fallback). */
export function legacyBlindtestHead(line: string): { title: string; description: string; ogTitle: string; ogDescription: string; ogImageSubtitle: string } {
  const title = 'K-pop Blind Test - Guess the Song from a Clip';
  return {
    title,
    description: `Play the free K-pop blind test: hear a 10-second clip and guess the song. ${line}, from every generation. No sign-up.`,
    ogTitle: title,
    ogDescription: `Listen to a 10-second clip and guess the K-pop song. ${line}, every generation.`,
    ogImageSubtitle: `Guess the song from a 10-second clip. ${line}.`,
  };
}
