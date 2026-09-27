// Pure view helpers of the v11 leaderboard (P9): every label and number the page
// shows is built here from real rows, so the page, the render tests and the e2e
// read the same strings. Client-safe (no DB, no Next).

import { getLevelInfo } from '@/lib/constants';
import { AVATAR_PRESETS } from '@/lib/passport-flair';
import { comma } from '@/lib/ux-v1/p1/format';

export { comma };

/** A board shows from 4 rows, the live page's rule (FandomWarMap / HallOfFame MIN_BOARD):
 *  no thin, sad leaderboard. */
export const MIN_BOARD = 4;
/** The fandom war keeps the live page's size: the top 30 groups of the week. */
export const WAR_BOARD = 30;
/** Podium 3 + rows 4 to 10 in view (prototype); 11 to 30 sit in a native fold. */
export const WAR_VISIBLE = 10;
export const PLAYERS_BOARD = 10;
export const CREATORS_BOARD = 10;

/** groups.fandom_name defaults to 'fan' when nobody set it (19 groups today, Cortis
 *  among them): that is not a fandom name, so it is treated as unknown. */
export function realFandomName(name: string | null | undefined): string | null {
  const n = (name ?? '').trim();
  if (!n || /^fans?$/i.test(n)) return null;
  return n;
}

export interface FandomLabel {
  /** Big line: the fandom (ARMY), or the group when the fandom has no name. */
  name: string;
  /** Small line: the group (BTS), or the generation ("5th Gen"), else empty. */
  sub: string;
}

/** Prototype podium and rows: fandom name big, group small (ARMY / BTS). */
export function fandomLabel(group: { name: string; fandom_name?: string | null; generation?: string | null }): FandomLabel {
  const fandom = realFandomName(group.fandom_name);
  if (fandom && fandom.toLowerCase() !== group.name.trim().toLowerCase()) return { name: fandom, sub: group.name };
  return { name: group.name, sub: (group.generation ?? '').trim() };
}

export type DeltaTone = 'up' | 'down' | 'flat' | 'new';

export interface DeltaView {
  text: string;
  tone: DeltaTone;
  /** Screen reader text (the sign is the word; colour is never alone, 16.1). */
  label: string;
}

/** A fandom's change since last week: the live war map's percent change of points
 *  against the 7 days before (null = no points the week before, shown as "new"). */
export function deltaView(delta: number | null): DeltaView {
  if (delta === null) return { text: 'new', tone: 'new', label: 'new on the board this week' };
  if (delta === 0) return { text: '0%', tone: 'flat', label: 'no change since last week' };
  const up = delta > 0;
  const n = comma(Math.abs(delta));
  return { text: `${up ? '+' : '-'}${n}%`, tone: up ? 'up' : 'down', label: `${up ? 'up' : 'down'} ${n} percent since last week` };
}

/** Podium order of the prototype: #2 left, #1 centre, #3 right. */
export function podiumOrder<T>(top: readonly T[]): Array<{ item: T; rank: number }> {
  if (top.length < 3) return [];
  return [
    { item: top[1]!, rank: 2 },
    { item: top[0]!, rank: 1 },
    { item: top[2]!, rank: 3 },
  ];
}

/** "Lv 9 · STAY" when the fan has a main fandom with a name, else "Lv 17 · Ride-or-Die". */
export function levelLine(xp: number, fandom: string | null): string {
  const info = getLevelInfo(xp);
  return `Lv ${info.level} · ${fandom ?? info.name}`;
}

export interface AvatarView {
  src: string | null;
  /** Preset avatar colours (the fan's own pick), else null = neutral initials (16.8). */
  bg: string | null;
  fg: string | null;
}

/** The same avatar the live PersonCard shows: custom art, preset colour, or the photo. */
export function avatarOf(p: { avatar_url?: string | null; avatar_kind?: string | null; avatar_ref?: string | null }): AvatarView {
  const kind = p.avatar_kind ?? 'photo';
  if (kind === 'custom' && p.avatar_ref) return { src: p.avatar_ref, bg: null, fg: null };
  if (kind === 'preset' && p.avatar_ref && AVATAR_PRESETS[p.avatar_ref]) {
    const preset = AVATAR_PRESETS[p.avatar_ref]!;
    return { src: null, bg: preset.bg, fg: preset.fg };
  }
  return { src: p.avatar_url ?? null, bg: null, fg: null };
}

/** "1 quiz" / "46 quizzes". */
export function quizzesLabel(n: number): string {
  return `${comma(n)} ${n === 1 ? 'quiz' : 'quizzes'}`;
}

/** "1 play" / "9,401 plays". */
export function playsLabel(n: number): string {
  return `${comma(n)} ${n === 1 ? 'play' : 'plays'}`;
}

/** "1 new follower" / "12 new followers". */
export function followersLabel(n: number): string {
  return `${comma(n)} new ${n === 1 ? 'follower' : 'followers'}`;
}

/** The fandom pin sentence after the name: "you added 1,240 points this week". */
export function addedLine(points: number): string {
  if (points <= 0) return 'no points from you this week yet';
  return `you added ${comma(points)} ${points === 1 ? 'point' : 'points'} this week`;
}

/** "#2" for a ranked fandom; a fandom with no points this week has no rank. */
export function rankText(rank: number | null): string {
  return rank === null ? '-' : `#${comma(rank)}`;
}
