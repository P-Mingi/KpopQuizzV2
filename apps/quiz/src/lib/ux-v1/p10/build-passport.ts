// Builds the v11 passport props from the rows /me and /u/[username] already read
// (plus the flag-on extras of passport-data.ts). Pure: the pages and the render
// test (passport-render.test.ts) feed it the same shapes.

import { getLevelInfo } from '@/lib/constants';
import { getTitleForLevel } from '@/lib/level-titles';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import {
  badgeTiles, bandMode, levelChip, metaSegments, personalStats, pinnedTiles, publicStats, themeColours, topMastery, xpLine,
} from './passport-model';

import type { UxPassportProps } from '@/components/profile/ux-v1/passport';
import type { BadgeDef, HistoryRow } from './passport-model';
import type { PassportGroupStat, PassportSpine, CollectionProgress } from '@/lib/passport';
import type { Profile, QuizCardData } from '@/lib/db/types';

export interface PassportInput {
  mode: 'personal' | 'public';
  profile: Profile;
  spine: PassportSpine | null;
  groupStats: PassportGroupStat[];
  collection: CollectionProgress;
  groups: Array<{ id: number; name: string; slug: string }>;
  badgeDefs: BadgeDef[];
  earnedBadgeIds: string[];
  quizzes: QuizCardData[];
  fandomName: string | null;
  war: { fandom: string; rank: number } | null;
  /** personal only */
  averagePct?: number | null;
  history?: HistoryRow[] | null;
  now: number;
}

export function buildPassport(i: PassportInput): Omit<UxPassportProps, 'footer'> {
  const p = i.profile;
  const s = i.spine;
  const displayName = p.display_name?.trim() || p.username;
  const lvl = getLevelInfo(p.xp);
  const title = getTitleForLevel(lvl.level).en;
  const theme = themeColours(s?.profile_theme);
  const main = s?.ult_groups?.[0] ?? null;
  const groupPhoto = groupPhotoUrl(main);
  const tiles = badgeTiles(i.badgeDefs, i.earnedBadgeIds);
  const pinnedBadge = p.pinned_badge_id ? tiles.find((t) => t.id === p.pinned_badge_id && t.earned) ?? null : null;
  const groupMap = new Map(i.groups.map((g) => [g.id, { name: g.name, slug: g.slug }]));
  const quizzesMade = s?.total_quizzes_created ?? p.total_quizzes_created;
  const personal = i.mode === 'personal';
  // the fan's groups, in their order, as the live passport shows them (existing groups only)
  const bySlug = new Map(i.groups.map((g) => [g.slug, g]));
  const ultGroups = (s?.ult_groups ?? []).slice(0, 3)
    .map((slug, n) => { const g = bySlug.get(slug); return g ? { name: g.name, slug: g.slug, fandom: n === 0 ? i.fandomName : null } : null; })
    .filter((g): g is { name: string; slug: string; fandom: string | null } => g !== null);

  return {
    mode: i.mode,
    username: p.username,
    displayName,
    bio: p.bio,
    accent: p.name_accent,
    font: p.name_font,
    bias: s?.bias ?? null,
    avatar: { url: p.avatar_url, bg: p.avatar_bg, text: p.avatar_text, kind: p.avatar_kind, ref: p.avatar_ref },
    pinnedBadge,
    level: levelChip(lvl.level, title),
    meta: metaSegments({ groups: ultGroups, stanSince: p.stan_since, createdAt: p.created_at, followers: p.follower_count ?? 0 }),
    xp: xpLine(p.xp, lvl.xpForNextLevel, lvl.level, lvl.progress),
    theme,
    band: { mode: bandMode(p.header_url, groupPhoto), image: p.header_url && /^https:\/\//i.test(p.header_url) ? p.header_url : null, groupPhoto },
    stats: personal
      ? personalStats({ quizzesPlayed: s?.quizzes_played ?? 0, averagePct: i.averagePct ?? null, streak: s?.streak_current ?? 0, quizzesMade, blindtestsPlayed: s?.blindtests_played ?? 0 })
      : publicStats({ streak: s?.streak_current ?? 0, groupsMastered: i.collection.groups_mastered, quizzesMade, playsReceived: p.total_plays_received ?? 0 }),
    war: i.war,
    pinned: pinnedTiles(tiles, p.pinned_badge_id),
    badges: tiles,
    mastery: topMastery(i.groupStats, groupMap),
    history: personal ? { rows: i.history ?? [], quizzesPlayed: s?.quizzes_played ?? 0, blindtestsPlayed: s?.blindtests_played ?? 0 } : null,
    quizzes: i.quizzes,
    quizzesTotal: Math.max(quizzesMade, i.quizzes.length),
    creatorId: p.id,
    now: i.now,
  };
}
