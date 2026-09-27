// P11 (UX v11.2): pure view model of the notifications page and the bell panel
// (DESIGN-SPEC 15.2 / 16.5 / 16.7, prototype views #notifs and #bellpop). No I/O:
// the rows come from the existing GET /api/notifications (NotificationRow), the
// categories from lib/notification-types.ts (the single source of truth the
// mig-122 gate trigger mirrors). Client-safe (no server imports).

import { NOTIFICATION_CATEGORIES } from '@/lib/notification-types';

import type { NotificationType } from '@/lib/notification-types';
import type { UxIconName } from '@/lib/ux-v1/a0/icons';

/** The fields of NotificationRow (app/api/notifications/route.ts) the v11 views read. */
export interface P11Notification {
  id: string;
  type: NotificationType | string;
  title: string;
  body: string | null;
  quiz_id: string | null;
  quiz_slug: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

/** Filters of the page (16.7 + prototype: All / Your quizzes / Social / Achievements).
 *  The two other categories (following, announcements) are listed under All. */
export type P11Filter = 'all' | 'your_quizzes' | 'social' | 'achievements';
export const P11_FILTERS: { value: P11Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'your_quizzes', label: 'Your quizzes' },
  { value: 'social', label: 'Social' },
  { value: 'achievements', label: 'Achievements' },
];

const CATEGORY_OF_TYPE: Record<string, string> = Object.fromEntries(
  NOTIFICATION_CATEGORIES.flatMap((c) => c.types.map((t) => [t, c.key])),
);

/** Settings category of a notification type (null for a type no category lists). */
export function categoryOf(type: string): string | null {
  return CATEGORY_OF_TYPE[type] ?? null;
}

export function matchesFilter(n: Pick<P11Notification, 'type'>, filter: P11Filter): boolean {
  return filter === 'all' || categoryOf(n.type) === filter;
}

/** Row icon per type (prototype NF: play, msg, trophy, star, user, heart, flame,
 *  layers, target, mail). The types the prototype does not draw: rating (a
 *  "banger" reaction) = zap, verse_watch (a watched Verse page) = eye. */
const TYPE_ICON: Record<NotificationType, UxIconName> = {
  milestone: 'play',
  rating: 'zap',
  comment: 'msg',
  admin_dm: 'mail',
  new_follower: 'user',
  streak_milestone: 'flame',
  group_mastered: 'target',
  followed_new_quiz: 'layers',
  badge_earned: 'star',
  cheer: 'heart',
  verse_watch: 'eye',
  battle_beaten: 'trophy',
};

export function iconOf(type: string): UxIconName {
  return TYPE_ICON[type as NotificationType] ?? 'bell';
}

export interface P11Target {
  href: string;
  /** Opens in a new tab (an absolute http(s) link, e.g. an admin DM's Discord invite). */
  external: boolean;
}

/**
 * Where a row goes: the live card's rule (components/profile/notifications-strip.tsx),
 * link_url first (admin DM, follower passport, badge, mastered group), else the
 * linked quiz. Stored values are not trusted at the sink: only a same-site path
 * ("/x", never "//host") or an absolute http(s) URL becomes a link.
 */
export function targetOf(n: Pick<P11Notification, 'link_url' | 'quiz_slug'>): P11Target | null {
  const raw = (n.link_url ?? '').trim();
  if (raw) {
    if (raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/\\')) return { href: raw, external: false };
    if (/^https?:\/\/[^\s]+$/i.test(raw)) return { href: raw, external: true };
    // anything else (javascript:, data:, a bare word) falls through to the quiz link
  }
  const slug = (n.quiz_slug ?? '').trim();
  return slug ? { href: `/q/${encodeURIComponent(slug)}`, external: false } : null;
}

export type P11DayLabel = 'Today' | 'Yesterday' | 'Earlier';

function localDayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Today / Yesterday / Earlier, by the viewer's calendar day (prototype NF groups). */
export function dayLabelOf(iso: string, now: Date = new Date()): P11DayLabel {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 'Earlier';
  const today = localDayStart(now);
  const day = localDayStart(t);
  if (day >= today) return 'Today';
  const yesterday = localDayStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
  return day >= yesterday ? 'Yesterday' : 'Earlier';
}

/** Consecutive runs of the same day label, in the given (newest first) order. */
export function groupByDay<T extends Pick<P11Notification, 'created_at'>>(items: T[], now: Date = new Date()): { label: P11DayLabel; items: T[] }[] {
  const out: { label: P11DayLabel; items: T[] }[] = [];
  for (const it of items) {
    const label = dayLabelOf(it.created_at, now);
    const last = out[out.length - 1];
    if (last && last.label === label) last.items.push(it);
    else out.push({ label, items: [it] });
  }
  return out;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/**
 * Short age for the page column (prototype "2h", "1d", "1w"). Same thresholds as
 * formatRelativeDate (lib/utils.ts, the live card and the bell): minutes, hours,
 * days under 7, weeks under 30 days, then the month.
 */
export function compactAgo(iso: string, now: Date = new Date()): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const ms = Math.max(0, now.getTime() - t.getTime());
  if (ms < MIN) return 'now';
  if (ms < HOUR) return `${Math.floor(ms / MIN)}m`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)}h`;
  const days = Math.floor(ms / DAY);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return t.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** Bell line (prototype "2h ago"). */
export function bellAgo(iso: string, now: Date = new Date()): string {
  const c = compactAgo(iso, now);
  if (!c) return '';
  if (c === 'now') return 'just now';
  return /\d{4}$/.test(c) ? c : `${c} ago`;
}

/** Spoken age (screen readers get "2 hours ago", not "2h"). */
export function spokenAgo(iso: string, now: Date = new Date()): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  const ms = Math.max(0, now.getTime() - t.getTime());
  const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'} ago`;
  if (ms < MIN) return 'just now';
  if (ms < HOUR) return plural(Math.floor(ms / MIN), 'minute');
  if (ms < DAY) return plural(Math.floor(ms / HOUR), 'hour');
  const days = Math.floor(ms / DAY);
  if (days < 7) return plural(days, 'day');
  if (days < 30) return plural(Math.floor(days / 7), 'week');
  return t.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** The page subtitle (prototype nread()). */
export function unreadLine(unread: number): string {
  return unread > 0 ? `${unread.toLocaleString('en-US')} unread` : 'All caught up';
}

/** Pinned streak row (16.7: "streak row pinned, turns into Streak saved after
 *  playing"). Input = A0's streakView() of the viewer's profile. The copy says
 *  what the backend really counts: the streak moves when the daily quiz or the
 *  daily blindtest is completed (lib/daily-played.ts completeDaily ->
 *  /api/daily/complete), not any quiz. */
export interface P11StreakRow {
  state: 'at_risk' | 'saved';
  title: string;
  sub: string;
  action: { href: string; label: string } | null;
}

export function streakRow(v: { state: 'at_risk' | 'played_today'; days: number; left: string } | null): P11StreakRow | null {
  if (!v || v.days <= 0) return null;
  const days = `${v.days.toLocaleString('en-US')} ${v.days === 1 ? 'day' : 'days'}`;
  if (v.state === 'at_risk') {
    return {
      state: 'at_risk',
      title: `Your ${v.days.toLocaleString('en-US')}-day streak ends in ${v.left}`,
      sub: 'Play the daily quiz or the daily blindtest to keep it.',
      action: { href: '/daily', label: "Play today's daily" },
    };
  }
  return {
    state: 'saved',
    title: `Streak saved: ${days}`,
    sub: `Come back tomorrow to make it ${(v.days + 1).toLocaleString('en-US')}.`,
    action: null,
  };
}

/** How many of these rows are unread. */
export function countUnread(items: Pick<P11Notification, 'is_read'>[]): number {
  let n = 0;
  for (const it of items) if (!it.is_read) n++;
  return n;
}
