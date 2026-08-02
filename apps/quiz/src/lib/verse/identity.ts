// V-PROFILE-ONE step 2 - THE IDENTITY RESOLVER (shared plumbing; V-COMM-3 reuses).
// One place that turns a user id into their public display identity: name, avatar,
// initials, per-space role, block state - honoring the SYSTEM_AUTHOR_DISPLAY constant
// everywhere (today only 3 of ~9 byline sites do). Every byline (essays, wiki
// attribution, discussions, members) should read from here, so display is decided
// once. Reads only public display columns; batched by id.

import { createServiceRoleClient } from '@/lib/supabase/server';
import { SYSTEM_AUTHOR_DISPLAY } from '@/lib/verse/pages/data';

import type { SpaceRole } from '@/lib/verse/roles';

const PROFILE_COLS = 'id, username, display_name, avatar_url, avatar_bg, avatar_text';

/** The one normalized fallback (the codebase had 'Fan' / 'a fan' / 'A fan' mixed). */
export const FAN_FALLBACK = 'a fan';

export interface Identity {
  userId: string;
  username: string | null;
  displayName: string;        // SYSTEM_AUTHOR_DISPLAY -> display_name -> username -> FAN_FALLBACK
  avatarUrl: string | null;
  avatarBg: string | null;
  avatarText: string | null;
  initials: string;           // 1-2 chars for the avatar fallback
  isSystem: boolean;          // a platform account (KpopVerse); no profile link
  href: string | null;        // /u/{username}, or null for system / usernameless
}

/** Identity within a space: adds the effective role + block state. A blocked member
 * resolves to 'visitor' with no role authority (matching getSpaceRole), but keeps
 * their name/avatar so already-authored content stays attributed. */
export interface SpaceIdentity extends Identity {
  role: SpaceRole;
  isBlocked: boolean;
}

interface ProfileRow { id: string; username: string | null; display_name: string | null; avatar_url: string | null; avatar_bg: string | null; avatar_text: string | null }

function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (name.trim().slice(0, 2).toUpperCase()) || '?';
}

function toIdentity(userId: string, p: ProfileRow | null): Identity {
  const sys = SYSTEM_AUTHOR_DISPLAY[userId];
  const username = p?.username ?? null;
  const displayName = sys ?? p?.display_name ?? username ?? FAN_FALLBACK;
  return {
    userId,
    username,
    displayName,
    avatarUrl: p?.avatar_url ?? null,
    avatarBg: p?.avatar_bg ?? null,
    avatarText: p?.avatar_text ?? null,
    initials: initialsFrom(displayName),
    isSystem: !!sys,
    href: sys || !username ? null : `/u/${username}`,
  };
}

/** Resolve many users to their display identity in one batched read. The single
 * byline source: pass every author id a surface renders and read back the Map. */
export async function resolveIdentities(userIds: Array<string | null | undefined>): Promise<Map<string, Identity>> {
  const ids = [...new Set(userIds.filter((x): x is string => !!x))];
  const out = new Map<string, Identity>();
  if (!ids.length) return out;
  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('profiles').select(PROFILE_COLS).in('id', ids);
  if (error) throw new Error(`resolveIdentities: ${JSON.stringify(error)}`);
  const byId = new Map((data ?? []).map((p) => [(p as ProfileRow).id, p as ProfileRow]));
  for (const id of ids) out.set(id, toIdentity(id, byId.get(id) ?? null));
  return out;
}

export async function resolveIdentity(userId: string): Promise<Identity> {
  return (await resolveIdentities([userId])).get(userId) ?? toIdentity(userId, null);
}

/** Space-scoped identities: display + effective role + block state, batched. */
export async function resolveSpaceIdentities(userIds: Array<string | null | undefined>, groupId: number): Promise<Map<string, SpaceIdentity>> {
  const base = await resolveIdentities(userIds);
  const out = new Map<string, SpaceIdentity>();
  const ids = [...base.keys()];
  if (!ids.length) return out;
  const svc = createServiceRoleClient();
  const { data, error } = await svc.from('space_members').select('user_id, role, status').eq('group_id', groupId).in('user_id', ids);
  if (error) throw new Error(`resolveSpaceIdentities: ${JSON.stringify(error)}`);
  const memberById = new Map((data ?? []).map((m) => [(m as { user_id: string }).user_id, m as { user_id: string; role: SpaceRole; status: string }]));
  for (const [id, ident] of base) {
    const m = memberById.get(id);
    const isBlocked = m?.status === 'blocked';
    const role: SpaceRole = !m || isBlocked ? 'visitor' : m.role;
    out.set(id, { ...ident, role, isBlocked: !!isBlocked });
  }
  return out;
}
