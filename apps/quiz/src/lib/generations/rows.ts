// The rows of the "What generation is my group?" table on the generations hub.
//
// Documented query: every visible row of the groups table (the /groups directory read,
// lib/ux-v1/p3/data.ts getGroupsIndex: General K-pop and the hidden quarantine row are left
// out) with its published-quiz count, joined by slug to the generation file. A group added
// after the last review shows as "Not reviewed yet", never with a guessed label.
//
// Fail soft: if the directory cannot be read in time, the rows come from the generation file
// alone (every act it reviewed), so the table is never empty and never invented.

import { getGroupsIndex } from '@/lib/ux-v1/p3/data';

import { generationData, groupGeneration } from './generations';

import type { GroupGeneration } from './generations';

export interface GenerationRow {
  slug: string;
  name: string;
  /** Published quizzes, or null when the directory could not be read. */
  quizzes: number | null;
  gen: GroupGeneration | null;
}

export interface GenerationRows {
  rows: GenerationRow[];
  /** True when the rows come from the live directory, false for the file fallback. */
  live: boolean;
}

/** Oldest debut first, then by name; groups the file does not cover go last. */
export function sortGenerationRows(rows: GenerationRow[]): GenerationRow[] {
  return [...rows].sort((a, b) => {
    if (a.gen && b.gen) return a.gen.debutYear - b.gen.debutYear || a.name.localeCompare(b.name, 'en');
    if (a.gen) return -1;
    if (b.gen) return 1;
    return a.name.localeCompare(b.name, 'en');
  });
}

/** The table rows from a directory listing (pure: the join and the order). */
export function joinGenerationRows(index: ReadonlyArray<{ slug: string; name: string; quizzes: number }>): GenerationRow[] {
  return sortGenerationRows(index.map((g) => ({ slug: g.slug, name: g.name, quizzes: g.quizzes, gen: groupGeneration(g.slug) })));
}

export async function getGenerationRows(timeoutMs = 8000): Promise<GenerationRows> {
  try {
    const index = await Promise.race([
      getGroupsIndex(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (index && index.length > 0) return { rows: joinGenerationRows(index), live: true };
  } catch {
    // fall through to the file
  }
  return {
    rows: generationData().groups.map((g) => ({ slug: g.slug, name: g.name, quizzes: null, gen: g })),
    live: false,
  };
}

/** A row's hub link, when the hub has published quizzes (an empty hub is noindex). */
export function rowHubHref(row: GenerationRow): string | null {
  if (row.quizzes === 0) return null;
  return `/${row.slug}-quiz`;
}
