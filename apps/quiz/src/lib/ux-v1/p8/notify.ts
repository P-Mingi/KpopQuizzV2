// Community notifications (owner, 2026-10-07), in the existing system: creator_notifications
// (the bell, GET /api/notifications) and notification_prefs (Social: the mig-122 gate trigger
// drops an insert while it is off; the grouped update checks it here too). No new system.
//   community_reply    "X replied to your comment"  to the author of the comment or reply
//                      answered, at any level (a vote comment of the daily debate included)
//   community_comment  "X commented on your post"   to the author of the thread, blog, fan
//                      debate or challenge (a reply to a thread's opening post is a comment)
// Never to yourself, never to a Team (editorial) account. While a notification is unread, the
// next reply to the same comment (or comment on the same post) updates it instead of adding
// a row: "X and 2 others replied to your comment", with the newest text and link. A text the
// banned words refuse never gets here (the routes notify after the insert). A reply hidden by
// 3 reports leaves its notifications in SQL (community_notifications_retract,
// docs/pending-migrations/v12-community-notifications.sql), which rebuilds the title as
// titleOf does. The link opens the post on the new reply (?reply=<id>, components/community/
// ux-v1/replies.tsx). Server only; never throws: a notification never blocks a reply.

import { isEditorialUser } from '@/lib/editorial/accounts';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';
import { withSite } from '@/lib/site/scope';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

export type CommunityNoticeType = 'community_reply' | 'community_comment';

/** One reply or comment inside a (grouped) notification, oldest first. */
export interface NoticeSource {
  /** 'comment:<id>' (verse_discussions) or 'reply:<id>' (community_replies). */
  ref: string;
  sender: string;
  name: string;
  excerpt: string;
  link: string;
  at: string;
}

export interface CommunityNotice {
  type: CommunityNoticeType;
  recipient: string | null | undefined;
  actor: string;
  /** What is grouped: 'reply:<store>:<parent id>' or 'post:<kind>:<id>'. */
  groupKey: string;
  ref: string;
  link: string;
  text: string;
}

/** The start of the reply, on one line. */
export function excerptOf(text: string, max = 100): string {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length <= max ? one : `${one.slice(0, max - 3).trimEnd()}...`;
}

/** "X replied to your comment", "X and 1 other ...", "X and 2 others ..." (X = the newest). */
export function titleOf(type: CommunityNoticeType, sources: readonly NoticeSource[]): string {
  const latest = sources[sources.length - 1];
  const n = new Set(sources.map((s) => s.sender)).size;
  const others = n === 2 ? ' and 1 other' : n > 2 ? ` and ${n - 1} others` : '';
  return `${latest?.name ?? 'A fan'}${others} ${type === 'community_reply' ? 'replied to your comment' : 'commented on your post'}`;
}

/** The sources with `s` last (a ref already there moves to the end). */
export function withSource(sources: readonly NoticeSource[] | null | undefined, s: NoticeSource): NoticeSource[] {
  return [...(sources ?? []).filter((x) => x.ref !== s.ref), s];
}

/** Social is off when the fan switched it off (stored as false, or 'false' as the gate reads it). */
export function socialOff(categories: unknown): boolean {
  const v = categories && typeof categories === 'object' ? (categories as Record<string, unknown>).social : undefined;
  return v === false || v === 'false';
}

export async function notifyCommunity(n: CommunityNotice): Promise<void> {
  try {
    if (!COMMUNITY_FEATURES_ENABLED || !isUxV12()) return;
    if (!n.recipient || n.recipient === n.actor) return;
    if (await isEditorialUser(n.recipient)) return;
    const svc = createServiceRoleClient();
    const [{ data: prefs }, { data: who }] = await Promise.all([
      svc.from('notification_prefs').select('categories').eq('user_id', n.recipient).maybeSingle(),
      svc.from('profiles').select('username, display_name').eq('id', n.actor).maybeSingle(),
    ]);
    if (socialOff((prefs as { categories?: unknown } | null)?.categories)) return;
    const p = who as { username: string | null; display_name: string | null } | null;
    const source: NoticeSource = {
      ref: n.ref, sender: n.actor, name: p?.display_name?.trim() || p?.username || 'A fan',
      excerpt: excerptOf(n.text), link: n.link, at: new Date().toISOString(),
    };
    // One unread row per recipient and group (unique index): update it, else add one. A
    // concurrent reply that added it first (23505) turns the second pass into an update.
    for (let pass = 0; pass < 2; pass++) {
      const { data: open } = await svc.from('creator_notifications').select('id, sources')
        .eq('user_id', n.recipient).eq('group_key', n.groupKey).eq('is_read', false).maybeSingle();
      const row = open as { id: string; sources: NoticeSource[] | null } | null;
      if (row) {
        const sources = withSource(row.sources, source);
        await svc.from('creator_notifications').update({
          title: titleOf(n.type, sources), body: source.excerpt, link_url: n.link, sender_id: n.actor, sources, created_at: source.at,
        }).eq('id', row.id);
        return;
      }
      const sources = [source];
      const { error } = await svc.from('creator_notifications').insert(withSite({
        user_id: n.recipient, type: n.type, title: titleOf(n.type, sources), body: source.excerpt,
        link_url: n.link, sender_id: n.actor, group_key: n.groupKey, sources,
      }));
      if (!error || error.code !== '23505') return;
    }
  } catch (err) {
    console.error('[p8] community notification failed:', err);
  }
}
