// G8 (V12): pure view model of the v12 additions of the group hub (SYSTEM.md 5.4,
// prototype hubGrowth()): the ways-to-play tiles, the "Be the first" block of a
// hub without a quiz, the nudge of a thin hub. No I/O: the reads live in
// ./growth-data.ts. Every number is a real count handed in by the caller; a
// number that is missing or under its floor gives no line at all.

import { realFandomName } from './model';

import type { UxIconName } from '@/lib/ux-v1/a0/icons';

/** Anchor of the quizzes list (the "Quizzes" tile) and of the Fans picked section
 *  (G7's bonus card links /<slug>-quiz#fans-picked). */
export const HUB_QUIZZES_ID = 'hub-quizzes';
export const FANS_PICKED_ID = 'fans-picked';

/** The live blindtest (G4), opened on the group's playlist (run/requests/G4.md R4:
 *  /live reads ?playlist=<group slug>&name=<label>). */
export function liveHref(slug: string, name: string): string {
  return `/live?playlist=${encodeURIComponent(slug)}&name=${encodeURIComponent(name)}`;
}

/** Prototype rule: the grid shows with two tiles or more, four at most (one row). */
export const MIN_TILES = 2;
export const MAX_TILES = 4;

/** A thin hub has 1 or 2 published quizzes (SYSTEM.md 5.4). */
export const THIN_HUB_MAX = 2;

/** Under this many plays in the window the nudge says nothing about plays. */
export const MIN_NUDGE_PLAYS = 10;
/** Under this many finished runs the empty hub says nothing about blindtest plays. */
export const MIN_BT_PLAYS = 10;
/** Window of the thin hub's play count, in days. */
export const NUDGE_DAYS = 60;

export type HubState = 'empty' | 'thin' | 'full';

export function hubState(published: number): HubState {
  if (published <= 0) return 'empty';
  return published <= THIN_HUB_MAX ? 'thin' : 'full';
}

export interface WayTile {
  key: 'quizzes' | 'blindtest' | 'name-all' | 'which-member' | 'this-or-that' | 'live';
  href: string;
  icon: UxIconName;
  title: string;
  isNew: boolean;
  body: string;
  /** Null = no foot line. */
  foot: string | null;
}

export interface WaysInput {
  slug: string;
  name: string;
  /** Published quizzes of the group. */
  quizzes: number;
  /** Playable blindtest songs (0 = no group blindtest). */
  songs: number;
  /** Name them all: null when the group has no page; `members` = roster size,
   *  `perfectPct` = share of rounds that named everyone (null = not published). */
  nameAll: { href: string; members: number; perfectPct: number | null } | null;
  /** Which member are you: null when the group has no page; `results` = saved
   *  results (null = unknown or under the floor). */
  whichMember: { href: string; results: number | null } | null;
  /** This or that: null unless the group is ranked; `votes` = counted votes. */
  thisOrThat: { votes: number | null } | null;
  /** The live blindtest exists (flag-only route). */
  live: boolean;
}

const n = (v: number): string => v.toLocaleString('en-US');

/**
 * The ways to play this group, in the prototype's order, only those that exist
 * for it. Play live is offered while the row has room (prototype: under four
 * tiles) and only for a group with a blindtest. Empty when fewer than two ways
 * exist or the group has no quiz (the prototype hides the section there).
 */
export function waysToPlay(i: WaysInput): WayTile[] {
  if (i.quizzes <= 0) return [];
  const out: WayTile[] = [{
    key: 'quizzes',
    href: `#${HUB_QUIZZES_ID}`,
    icon: 't-classic',
    title: 'Quizzes',
    isNew: false,
    body: `${n(i.quizzes)} fan-made ${i.name} ${i.quizzes === 1 ? 'quiz' : 'quizzes'}.`,
    foot: i.quizzes > 1 ? 'Most played first' : null,
  }];
  if (i.songs > 0) {
    out.push({
      key: 'blindtest',
      href: `/blindtest/group-${i.slug}`,
      icon: 'music',
      title: 'Blindtest',
      isNew: false,
      body: `${n(i.songs)} ${i.name} songs, ten-second clips.`,
      foot: i.live ? 'Solo or live with friends' : null,
    });
  }
  if (i.nameAll && i.nameAll.members >= 2) {
    out.push({
      key: 'name-all',
      href: i.nameAll.href,
      icon: 'clock',
      title: 'Name them all',
      isNew: true,
      body: `All ${i.nameAll.members} members in 60 seconds.`,
      foot: i.nameAll.perfectPct !== null ? `${i.nameAll.perfectPct}% get them all` : null,
    });
  }
  if (i.whichMember) {
    out.push({
      key: 'which-member',
      href: i.whichMember.href,
      icon: 'users',
      title: 'Which member are you?',
      isNew: true,
      body: 'Eight questions about you.',
      foot: i.whichMember.results !== null ? `${n(i.whichMember.results)} results` : null,
    });
  }
  if (i.thisOrThat) {
    out.push({
      key: 'this-or-that',
      href: `#${FANS_PICKED_ID}`,
      icon: 'heart',
      title: 'This or that',
      isNew: true,
      body: `Two ${i.name} songs, pick one.`,
      foot: i.thisOrThat.votes !== null ? `${n(i.thisOrThat.votes)} votes` : null,
    });
  }
  if (i.live && i.songs > 0 && out.length < MAX_TILES) {
    out.push({
      key: 'live',
      href: liveHref(i.slug, i.name),
      icon: 'users',
      title: 'Play live',
      isNew: false,
      body: `Host a ${i.name} blindtest on a big screen.`,
      foot: 'Friends join with their phone',
    });
  }
  const tiles = out.slice(0, MAX_TILES);
  return tiles.length >= MIN_TILES ? tiles : [];
}

/** Saved results of a group across its members, or null under `min`. */
export function resultsTotal(counts: Record<string, number> | null, min: number): number | null {
  if (!counts) return null;
  const total = Object.values(counts).reduce((a, b) => a + (Number.isFinite(b) && b > 0 ? b : 0), 0);
  return total >= min ? total : null;
}

// ---- fans create: the hub without a quiz ---------------------------------------

export interface FirstSignal {
  icon: UxIconName;
  text: string;
}

/**
 * The lines of "Be the first" (prototype .fcreate ul). The two signals are real
 * counts and drop out when they do not exist; the last two lines are what the
 * site really does for a first creator: the hub names them (first-creator line,
 * growth-data.ts), the Quiz maker badge is granted at the first published quiz
 * and lib/notifications.ts alerts the creator at 10, 100 and 1,000 plays.
 */
export function firstSignals(i: { name: string; songs: number; btPlays: number | null }): FirstSignal[] {
  const out: FirstSignal[] = [];
  if (i.songs > 0) out.push({ icon: 'music', text: `${n(i.songs)} ${i.name} songs are already in the blindtest, so fans are here.` });
  if (i.btPlays !== null && i.btPlays >= MIN_BT_PLAYS) out.push({ icon: 'play', text: `Fans played the ${i.name} blindtest ${n(i.btPlays)} times.` });
  out.push({ icon: 'star', text: 'Your name stays on this page as its first creator.' });
  out.push({ icon: 'bell', text: 'You get the Quiz maker badge and an alert at 10, 100 and 1,000 plays.' });
  return out;
}

export interface HubTemplate {
  /** quizzes.quiz_type the template starts from. */
  type: 'multiple_choice' | 'true_false' | 'guess_from_clues';
  icon: UxIconName;
  title: string;
  sub: string;
  href: string;
}

/** Three starting points (SYSTEM.md 5.4), each a real quiz type of the Create
 *  flow. The link carries the group and the type; Create prefills what it reads. */
export function hubTemplates(slug: string): HubTemplate[] {
  const base = `/create?group=${encodeURIComponent(slug)}`;
  return [
    { type: 'multiple_choice', icon: 't-classic', title: 'Members basics', sub: 'Four answers a question, the classic start', href: `${base}&type=multiple_choice` },
    { type: 'true_false', icon: 't-tf', title: 'True or false', sub: 'Quick, great for sharing', href: `${base}&type=true_false` },
    { type: 'guess_from_clues', icon: 't-clue', title: 'Guess the member from clues', sub: 'Three clues each', href: `${base}&type=guess_from_clues` },
  ];
}

// ---- the thin hub nudge ---------------------------------------------------------

export interface HubNudge {
  title: string;
  body: string;
  href: string;
}

/** "Only 1 KATSEYE quiz so far." with the real plays of the window when there are
 *  enough of them, and the fandom's real name (else "fan"). */
export function thinNudge(i: { slug: string; name: string; fandom: string | null | undefined; quizzes: number; plays: number | null }): HubNudge | null {
  if (hubState(i.quizzes) !== 'thin') return null;
  const fandom = realFandomName(i.fandom);
  const one = i.quizzes === 1;
  const played = i.plays !== null && i.plays >= MIN_NUDGE_PLAYS
    ? `Fans played ${one ? 'it' : 'them'} ${n(i.plays)} times in the last ${NUDGE_DAYS} days. `
    : '';
  return {
    title: `Only ${i.quizzes} ${i.name} ${one ? 'quiz' : 'quizzes'} so far.`,
    body: `${played}Make the next one and it shows here for every ${fandom ?? `${i.name} fan`}.`,
    href: `/create?group=${encodeURIComponent(i.slug)}`,
  };
}

// ---- fans picked ----------------------------------------------------------------

/** "<Fandom> picked", or "Fans picked" for a group without a fandom name. */
export function fansPickedTitle(fandom: string | null | undefined): string {
  return `${realFandomName(fandom) ?? 'Fans'} picked`;
}

export interface MovementView {
  text: string;
  label: string;
  tone: 'up' | 'down' | 'flat' | 'new';
}

/** Weekly movement of a ranked song (prototype dl()); null = nothing to show. */
export function movementView(movement: number | null, isNew: boolean): MovementView | null {
  if (isNew) return { text: 'New', label: 'new this week', tone: 'new' };
  if (movement === null || !Number.isFinite(movement)) return null;
  if (movement > 0) return { text: `+${movement}`, label: `up ${movement}`, tone: 'up' };
  if (movement < 0) return { text: `-${-movement}`, label: `down ${-movement}`, tone: 'down' };
  return { text: '0', label: 'no change', tone: 'flat' };
}
