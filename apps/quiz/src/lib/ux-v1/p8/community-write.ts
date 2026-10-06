// v12 community writes through the existing /api/verse routes (owner, 2026-10-06).
// A thread or blog posted from /community carries origin = 'community': it is created for
// any group and General K-pop without the Verse gates (VERSE_PUBLIC, LIVE_SPACES), a blog is
// published at once (no curator, no space membership), and a reply, a heart or a report on
// such a post passes too. Every other write keeps verseWriteGate, so the Verse stays closed.
// Server only.

import { createServiceRoleClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

/** Storage folder (bucket verse-space-assets) of the photos the photo route checked and
 *  stored. Only the server (service role) writes there: the bucket has no write policy. */
export const COMMUNITY_PHOTO_DIR = 'community';
export const COMMUNITY_PHOTO_BUCKET = 'verse-space-assets';

const VOTE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PHOTO_PATH = /^community\/([0-9a-f-]{36})\/[0-9a-f-]{36}\.jpg$/;

/** The asked-for origin is 'community' (and community posts exist: the v12 flag). */
export function wantsCommunity(body: unknown): boolean {
  return isUxV12() && !!body && typeof body === 'object' && (body as { origin?: unknown }).origin === 'community';
}

/** A photo path the caller may attach: one the photo route stored for this same account.
 *  undefined = no photo asked for; null = a path that is not theirs or not ours. */
export function ownPhotoPath(userId: string, cover: unknown): string | null | undefined {
  if (cover == null) return undefined;
  const p = (cover && typeof cover === 'object' ? (cover as { assetPath?: unknown }).assetPath : null);
  if (typeof p !== 'string') return null;
  const m = PHOTO_PATH.exec(p);
  return m && m[1] === userId ? p : null;
}

/** The group exists and is not the hidden quarantine row (any group or General K-pop). */
export async function communityGroupExists(groupId: number): Promise<boolean> {
  if (!Number.isInteger(groupId) || groupId <= 0) return false;
  const { data } = await createServiceRoleClient().from('groups').select('slug').eq('id', groupId).maybeSingle();
  const slug = (data as { slug?: string } | null)?.slug;
  return typeof slug === 'string' && !slug.startsWith('zzz-');
}

/** Is this thread or blog a community post? (v12 only.) */
export async function isCommunityRow(table: 'verse_threads' | 'verse_essays', id: number): Promise<boolean> {
  if (!isUxV12() || !Number.isInteger(id) || id <= 0) return false;
  const { data } = await createServiceRoleClient().from(table).select('origin').eq('id', id).maybeSingle();
  return (data as { origin?: string | null } | null)?.origin === 'community';
}

/** Does a reply request (thread_id, or entity_type 'essay' + entity_id) target a community post? */
export async function repliesToCommunity(body: unknown): Promise<boolean> {
  if (!isUxV12() || !body || typeof body !== 'object') return false;
  const b = body as { thread_id?: unknown; entity_type?: unknown; entity_id?: unknown };
  const threadId = Number(b.thread_id);
  if (b.thread_id != null) return isCommunityRow('verse_threads', threadId);
  if (b.entity_type === 'essay') return isCommunityRow('verse_essays', Number(b.entity_id));
  return false;
}

/** Does a verse_discussions row (a reply) belong to a community thread or blog? */
export async function commentIsCommunity(commentId: number): Promise<boolean> {
  if (!isUxV12() || !Number.isInteger(commentId) || commentId <= 0) return false;
  const { data } = await createServiceRoleClient().from('verse_discussions').select('thread_id, entity_type, entity_id').eq('id', commentId).maybeSingle();
  const c = data as { thread_id: number | null; entity_type: string | null; entity_id: string | null } | null;
  if (!c) return false;
  if (c.thread_id != null) return isCommunityRow('verse_threads', c.thread_id);
  if (c.entity_type === 'essay' && c.entity_id && /^\d+$/.test(c.entity_id)) return isCommunityRow('verse_essays', Number(c.entity_id));
  return false;
}

type Report = 'comment' | 'thread' | 'essay' | 'debate' | 'challenge' | 'reply';

/** Is a report about community content? (thread / blog by origin; a reply by its post;
 *  fan debates, challenges and their replies are community content by nature.) */
export async function reportIsCommunity(type: string, id: number): Promise<boolean> {
  if (!isUxV12() || !Number.isInteger(id) || id <= 0) return false;
  switch (type as Report) {
    case 'thread': return isCommunityRow('verse_threads', id);
    case 'essay': return isCommunityRow('verse_essays', id);
    case 'comment': return commentIsCommunity(id);
    case 'debate': case 'challenge': case 'reply': return true;
    default: return false;
  }
}

/** The community writes the /api/verse gate lets through (verseWriteGate): by route and
 *  method only, so origin = 'community' opens nothing else of the Verse. */
export async function communityWriteAllowed(method: string, pathname: string, body: Record<string, unknown> | null): Promise<boolean> {
  if (!isUxV12() || method !== 'POST' || !body) return false;
  switch (pathname) {
    case '/api/verse/threads':
    case '/api/verse/essays':
      return wantsCommunity(body);
    case '/api/verse/discussions':
      return repliesToCommunity(body);
    case '/api/verse/essays/reactions':
      return isCommunityRow('verse_essays', Number(body.essay_id));
    case '/api/verse/flags':
      // A vote comment of the daily debate (its uuid in target_ref) is community content.
      if (body.target_type === 'debate_vote') return VOTE_ID.test(String(body.target_ref ?? '').toLowerCase());
      return reportIsCommunity(String(body.target_type ?? ''), Number(body.target_id));
    default:
      return false;
  }
}
