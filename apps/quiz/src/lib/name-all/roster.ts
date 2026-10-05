// Name them all (V12 G6): the playable roster of a group, pure. The member list is
// the database's; lib/name-all/spellings.ts only adds accepted spellings.

import { NAME_ALL_SPELLINGS, isNameAllGroup } from './spellings';

import type { NameAllMember } from './match';

export interface IdolRow {
  name: string;
  name_romanized: string | null;
  name_hangul: string | null;
}

const HANGUL_ONLY = /^[가-힣\s]+$/;

/**
 * The playable roster of a group: one entry per database member, in database
 * order, with the spellings of the table plus what the row itself holds (the
 * romanized name, and `name_hangul` only when it really is Hangul: that column
 * also stores kana, Chinese and Thai, which are not accepted spellings here).
 */
export function buildRoster(groupSlug: string, rows: readonly IdolRow[]): NameAllMember[] {
  const table: Record<string, string[]> = isNameAllGroup(groupSlug) ? NAME_ALL_SPELLINGS[groupSlug] : {};
  const seen = new Set<string>();
  const out: NameAllMember[] = [];
  for (const row of rows) {
    const name = (row.name ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const spellings = [...(table[name] ?? [])];
    if (row.name_romanized && row.name_romanized.trim()) spellings.push(row.name_romanized.trim());
    if (row.name_hangul && HANGUL_ONLY.test(row.name_hangul.trim())) spellings.push(row.name_hangul.trim());
    out.push({ name, spellings });
  }
  return out;
}
