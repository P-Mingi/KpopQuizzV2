import { getRanking, getRankingsIndex } from '@/lib/db/queries/duels';
import { getNameAllGames } from '@/lib/db/queries/games';
import { getPersonalityGroupTiles } from '@/lib/personality/data';

/**
 * Game of the day (D1). Date-seeded + deterministic + read-only (no DB writes,
 * no new table/cron). Server-rendered so the pick is in the HTML and identical
 * for everyone that day, and rotates at the same midnight-UTC boundary the Quiz
 * of the day uses.
 *
 * ROTATION is the one and only extension point: add 'blindtest' (B12) or
 * 'battle' here and that mode joins the daily rotation. One-line change.
 */
export const ROTATION = ['personality', 'duel', 'name-all'] as const;
export type GameOfTheDayKind = (typeof ROTATION)[number];

export interface DuelGotd {
  kind: 'duel';
  group: string;
  type: string;
  prompt: string;
  a: { name: string; image: string | null };
  b: { name: string; image: string | null };
}

export interface NameAllGotd {
  kind: 'name-all';
  slug: string;
  groupName: string | null;
  logoUrl: string | null;
  displayColor: string | null;
  textColor: string | null;
  memberCount: number;
  timeLabel: string;
}

export interface PersonalityGotd {
  kind: 'personality';
  slug: string;
  groupName: string;
  logoUrl: string | null;
  displayColor: string | null;
  textColor: string | null;
  faces: string[];
}

export type GameOfTheDayData = DuelGotd | NameAllGotd | PersonalityGotd;

/** Days since the UTC epoch - the stable per-day seed (matches the QOTD reset). */
export function dayIndex(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 86_400_000);
}

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

async function pickDuel(seed: number): Promise<GameOfTheDayData | null> {
  const items = (await getRankingsIndex())
    .slice()
    .sort((x, y) => `${x.group_slug}:${x.question_type}`.localeCompare(`${y.group_slug}:${y.question_type}`));
  if (items.length === 0) return null;

  const q = items[seed % items.length]!;
  const ranking = await getRanking(q.group_slug, q.question_type);
  if (!ranking || ranking.entities.length < 2) return null;

  const n = ranking.entities.length;
  const i = seed % n;
  const j = (i + 1) % n; // adjacent-ranked = a close, fun matchup
  const a = ranking.entities[i]!;
  const b = ranking.entities[j]!;

  return {
    kind: 'duel',
    group: q.group_slug,
    type: q.question_type,
    prompt: q.prompt,
    a: { name: a.name, image: a.image },
    b: { name: b.name, image: b.image },
  };
}

async function pickNameAll(seed: number): Promise<GameOfTheDayData | null> {
  const games = (await getNameAllGames(0, 50)).slice().sort((x, y) => x.slug.localeCompare(y.slug));
  if (games.length === 0) return null;

  const g = games[seed % games.length]!;
  const content = g.content as { items?: unknown[]; members?: unknown[]; timer_seconds?: number };
  const memberCount = content.items?.length ?? content.members?.length ?? g.matchup_count ?? 0;

  return {
    kind: 'name-all',
    slug: g.slug,
    groupName: g.group_name,
    logoUrl: g.logo_url,
    displayColor: g.display_color,
    textColor: g.text_color,
    memberCount,
    timeLabel: fmtTime(content.timer_seconds ?? 60),
  };
}

async function pickPersonality(seed: number): Promise<GameOfTheDayData | null> {
  const tiles = (await getPersonalityGroupTiles()).slice().sort((x, y) => x.slug.localeCompare(y.slug));
  if (tiles.length === 0) return null;
  const t = tiles[seed % tiles.length]!;
  return {
    kind: 'personality',
    slug: t.slug,
    groupName: t.name,
    logoUrl: t.logo_url,
    displayColor: t.display_color,
    textColor: t.text_color,
    faces: t.faces,
  };
}

const PICKERS: Record<GameOfTheDayKind, (seed: number) => Promise<GameOfTheDayData | null>> = {
  personality: pickPersonality,
  duel: pickDuel,
  'name-all': pickNameAll,
};

/**
 * Resolve today's game. `offsetDays` shifts the seed (used only to verify
 * tomorrow's rotation in dev). Falls back to the other modes if the chosen one
 * has no eligible content, so the slot is never empty.
 */
export async function getGameOfTheDay(offsetDays = 0): Promise<GameOfTheDayData | null> {
  const seed = dayIndex() + offsetDays;
  const kind = ROTATION[seed % ROTATION.length]!;
  const order: GameOfTheDayKind[] = [kind, ...ROTATION.filter((k) => k !== kind)];
  for (const k of order) {
    const r = await PICKERS[k](seed);
    if (r) return r;
  }
  return null;
}
