// Run O1, lot (b), lane P1: the oshi of a series (copy oshi.*). A character above the reader's spoiler progress cannot be
// picked: `canPickOshi` is the rule (the same one that unlocks a character tile: isRevealedTo), `pickOshi` checks it before
// any write, and the write is one upsert on `favourite_characters` through RLS (own rows, one per series).

import { isRevealedTo } from '@/lib/anime/spoilers';

import type { SpoilerProgress } from '@/lib/anime/types';

export interface OshiCharacter {
  readonly id: number;
  readonly slug: string;
  readonly name: string;
  /** characters.spoiler_level: 0 is open, otherwise the arc the character is revealed at. */
  readonly spoiler_level: number;
}

/** True when the reader's progress has reached the character (arc 0 characters are always open). */
export function canPickOshi(character: Pick<OshiCharacter, 'spoiler_level'>, progress: SpoilerProgress): boolean {
  return isRevealedTo(character.spoiler_level, progress);
}

/** The part of the Supabase browser client the write uses (tests pass a stand-in). */
export interface OshiDb {
  from(table: 'favourite_characters'): {
    upsert(row: Record<string, unknown>, opts: { onConflict: string }): PromiseLike<{ error: unknown }>;
    delete(): { eq(column: string, value: unknown): { eq(column: string, value: unknown): PromiseLike<{ error: unknown }> } };
  };
}

export type OshiResult = { readonly ok: true } | { readonly ok: false; readonly reason: 'spoiler' | 'error' };

/** Picks `character` as the oshi of `groupId`, or refuses with 'spoiler' before any write. */
export async function pickOshi(
  db: OshiDb,
  args: { readonly userId: string; readonly groupId: number; readonly character: OshiCharacter; readonly progress: SpoilerProgress },
): Promise<OshiResult> {
  if (!canPickOshi(args.character, args.progress)) return { ok: false, reason: 'spoiler' };
  const { error } = await db.from('favourite_characters').upsert(
    { user_id: args.userId, group_id: args.groupId, character_id: args.character.id },
    { onConflict: 'user_id,group_id' },
  );
  return error ? { ok: false, reason: 'error' } : { ok: true };
}

/** Removes the oshi of `groupId`. */
export async function clearOshi(db: OshiDb, args: { readonly userId: string; readonly groupId: number }): Promise<OshiResult> {
  const { error } = await db.from('favourite_characters').delete().eq('group_id', args.groupId).eq('user_id', args.userId);
  return error ? { ok: false, reason: 'error' } : { ok: true };
}
