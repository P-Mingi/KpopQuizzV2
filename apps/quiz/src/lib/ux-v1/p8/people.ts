import { getLevelInfo } from '@/lib/constants';
import { SYSTEM_AUTHOR_DISPLAY } from '@/lib/verse/pages/data';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { P8Person } from './types';

// People as the community shows them: name + identity flair (DESIGN-SPEC 17.8) +
// level. Reads ONLY the public display columns that /u/[username] and today's
// community page already expose (username, display name, avatar, xp level, name
// accent, name font, bias). Never email, auth data or prefs (data-safety 11).

export const PERSON_COLS = 'id, username, display_name, avatar_url, xp, name_accent, name_font, bias';

export interface PersonRow {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  xp: number | null;
  name_accent: string | null;
  name_font: string | null;
  bias: string | null;
}

/** The one mapping from a profiles row (or its absence) to a community person. */
export function toPerson(userId: string, p: PersonRow | null | undefined): P8Person {
  const sys = SYSTEM_AUTHOR_DISPLAY[userId];
  if (sys) {
    return { name: sys, username: null, href: null, avatarUrl: p?.avatar_url ?? null, accent: null, font: null, bias: null, level: null, levelTitle: null, isSystem: true };
  }
  const username = p?.username ?? null;
  const name = (p?.display_name ?? '').trim() || username || 'a fan';
  const info = p ? getLevelInfo(p.xp ?? 0) : null;
  return {
    name,
    username,
    href: username ? `/u/${username}` : null,
    avatarUrl: p?.avatar_url ?? null,
    accent: p?.name_accent ?? null,
    font: p?.name_font ?? null,
    bias: (p?.bias ?? '').trim().slice(0, 40) || null,
    level: info ? info.level : null,
    levelTitle: info ? info.name : null,
    isSystem: false,
  };
}

/** Batch read of people by id (chunks of 500 ids, so no read nears the 1000-row cap). */
export async function readPeople(db: SupabaseClient, ids: Array<string | null | undefined>): Promise<Map<string, P8Person>> {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  const out = new Map<string, P8Person>();
  if (!uniq.length) return out;
  const byId = new Map<string, PersonRow>();
  for (let i = 0; i < uniq.length; i += 500) {
    const { data, error } = await db.from('profiles').select(PERSON_COLS).in('id', uniq.slice(i, i + 500));
    if (error) throw new Error(`p8 readPeople: ${error.message}`);
    for (const r of (data ?? []) as PersonRow[]) byId.set(r.id, r);
  }
  for (const id of uniq) out.set(id, toPerson(id, byId.get(id)));
  return out;
}

export { levelLine } from './format';
