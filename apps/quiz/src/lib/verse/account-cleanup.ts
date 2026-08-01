// V-CARDS-MAX - per-user Cards data cleanup for account deletion.
//
// verse_binders / verse_profile_shelf / verse_profile_shelf_settings (migration
// 141) and the pre-existing photocard_collection (136) / collectible_collection
// (138) all key on a BARE user_id UUID with NO foreign key to auth.users, so
// deleting the auth user does NOT cascade to these rows (proven by
// scripts/verse/verify-cards-purge.mts). Account deletion is a manual, contact-us
// flow; that flow MUST call purgeUserCardsData so a deleted user leaves no binder,
// shelf, opt-in, or collection rows behind.
import { createServiceRoleClient } from '@/lib/supabase/server';

/** Per-user Cards tables keyed on a bare user_id (no FK cascade from auth.users). */
export const CARDS_USER_TABLES = [
  'verse_binders',
  'verse_profile_shelf',
  'verse_profile_shelf_settings',
  'photocard_collection',
  'collectible_collection',
] as const;

/**
 * Erase every per-user Cards row for a user (account deletion). Idempotent;
 * returns one result per table so the caller can log/verify a full sweep.
 */
export async function purgeUserCardsData(userId: string): Promise<Array<{ table: string; ok: boolean; error?: string }>> {
  const svc = createServiceRoleClient();
  const out: Array<{ table: string; ok: boolean; error?: string }> = [];
  for (const table of CARDS_USER_TABLES) {
    const { error } = await svc.from(table).delete().eq('user_id', userId);
    out.push(error ? { table, ok: false, error: error.message } : { table, ok: true });
  }
  return out;
}
