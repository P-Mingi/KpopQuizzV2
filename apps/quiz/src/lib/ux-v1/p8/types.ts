// P8 community view models (serializable: they cross from server to client islands).
// Every value comes from a real row (verse-laws 10). Only public profile fields
// (what /u/[username] already shows) ever reach these types (data-safety 11).

export type PostKind = 'thread' | 'blog' | 'debate' | 'challenge';

export const POST_KINDS: readonly PostKind[] = ['thread', 'blog', 'debate', 'challenge'];

export function isPostKind(v: string): v is PostKind {
  return (POST_KINDS as readonly string[]).includes(v);
}

/** A person as the community shows them: name + identity flair (17.8) + level. */
export interface P8Person {
  /** Display name (display_name, else username); the system account's label. */
  name: string;
  /** For /u links and Follow; null for the system account and usernameless rows. */
  username: string | null;
  href: string | null;
  avatarUrl: string | null;
  accent: string | null;
  font: string | null;
  bias: string | null;
  /** Fan level from profiles.xp (lib/constants getLevelInfo); null for the system account. */
  level: number | null;
  /** Level title ("Stan"), same ladder as everywhere (lib/level-titles). */
  levelTitle: string | null;
  isSystem: boolean;
}

export interface P8Group { id: number; name: string; slug: string; fandom: string | null }

export interface DebateOption { label: string; votes: number }

export interface DebateData {
  /** true = the site's daily debate (daily_debates), false = a fan debate (pending table). */
  daily: boolean;
  options: DebateOption[];
  total: number;
  /** Votes are accepted (today's daily debate, or a fan debate before closes_at). */
  open: boolean;
  closesAt: string | null;
  /** Replies (debate_votes.comment for the daily debate). */
  comments: number;
}

export interface ChallengeData {
  score: number;
  total: number;
  quiz: { slug: string; title: string; type: string | null; difficulty: string | null; plays: number; coverUrl: string | null } | null;
  replyScores: { score: string; name: string }[];
  moreReplies: number;
}

export interface FeedPost {
  kind: PostKind;
  /** Row key: thread id, essay id, debate date (YYYY-MM-DD) or fan debate id, challenge id. */
  key: string;
  href: string;
  title: string;
  excerpt: string | null;
  group: P8Group | null;
  /** null = the site itself (the daily debate has no author). */
  author: P8Person | null;
  /** ISO time the post sorts by (created / featured / debate day). */
  at: string;
  /** Rendered "20 min ago" (server time, never recomputed on the client). */
  ago: string;
  replies: number;
  /** Heart count; null when this kind has no like store yet (the heart is hidden). */
  likes: number | null;
  blog?: { coverUrl: string | null; coverFocal: string; readingMin: number };
  debate?: DebateData;
  challenge?: ChallengeData;
}

export interface HappeningRow {
  id: number;
  person: P8Person | null;
  /** The name shown when there is no profile (anonymous runs say "Someone"). */
  name: string;
  /** Phrase parts: plain text and bold spans ("scored", **10/10**, "on", **BTS quiz**). */
  parts: { t: string; b?: boolean }[];
  href: string | null;
  ago: string;
  cheers: number;
}

export interface BadgeWatchRow {
  badgeId: string;
  name: string;
  description: string;
  /** "38 fans this week" or "eunbi_q today". */
  sub: string;
}

export interface Pulse { posts: number; votesToday: number; newQuizzesWeek: number }

export interface TodayDebate {
  date: string;
  question: string;
  sides: [string, string];
  votes: [number, number];
}

export interface WarEntry { slug: string; name: string; fandom: string | null; rank: number }

/** Which stores exist (the pending migration adds the community_* tables). */
export interface P8Features { likes: boolean; fanDebates: boolean; challenges: boolean }
