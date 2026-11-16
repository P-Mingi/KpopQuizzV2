// Bunnyverse Cards lots 3 and 4 (lane GOALS): the sets, the reward packs and the week, as the browser reads them. The rules are in the
// database (docs/pending-migrations/cards/105-goals.sql); these numbers repeat them for the screens and a test keeps the two equal.

/** Reward packs of each kind of set, given once per player and set. */
export const GOAL_REWARD_PACKS = { group: 1, solo: 1, holo: 3, gold: 5, year: 2 } as const;

/** The week (Paris Monday 00:00 to the next Monday): the three goals and the reward of the list. */
export const WEEK_GOALS = { packs: 20, wins: 3, cards: 10, rewardPacks: 2, rewardShards: 25 } as const;

export type SetKind = keyof typeof GOAL_REWARD_PACKS;

/** One set: its cards in packs today, the ones the player owns, and whether its reward was given. */
export interface GoalSet {
  /** 'group:<entity>', 'solo', 'holo', 'gold' or 'year:<yyyy>'. */
  id: string;
  kind: SetKind;
  /** The group's name, or the year; null for the soloists, Holo and Gold. */
  name: string | null;
  packs: number;
  total: number;
  owned: number;
  claimed: boolean;
}

/** A set a pack or a craft has just completed. */
export interface FinishedSet {
  id: string;
  kind: SetKind;
  name: string | null;
  packs: number;
}

export interface WeekState {
  /** ISO date of the Monday (Paris). */
  weekStart: string;
  /** ISO time the week ends (the next Monday 00:00, Paris). */
  endsAt: string;
  packsOpened: number;
  kpopdleWins: number;
  newCards: number;
  goalPacks: number;
  goalWins: number;
  goalCards: number;
  rewardPacks: number;
  rewardShards: number;
  done: boolean;
  claimed: boolean;
}

/** GET /api/cards/goals. */
export interface GoalsState {
  /** Reward packs waiting in Goals. */
  rewardPacks: number;
  week: WeekState;
  sets: GoalSet[];
  /** Sets this very call claimed (a set that was complete before). */
  finished: FinishedSet[];
}

/** What a player reads for a finished set: "the group's name", "the soloists", "every Holo card", "every Gold card", "the debut year 2016". */
export function setPhrase(s: { kind: SetKind; name: string | null }): string {
  if (s.kind === 'group') return s.name ?? 'a group';
  if (s.kind === 'solo') return 'the soloists';
  if (s.kind === 'holo') return 'every Holo card';
  if (s.kind === 'gold') return 'every Gold card';
  return `the debut year ${s.name ?? ''}`.trim();
}

/** The line of the pack summary: "You finished X. +1 pack waiting in Goals" (several sets: one sentence with the total). */
export function finishedLine(f: readonly FinishedSet[]): string | null {
  if (f.length === 0) return null;
  const total = f.reduce((a, s) => a + s.packs, 0);
  const names = f.map(setPhrase);
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `You finished ${list}. +${total} pack${total === 1 ? '' : 's'} waiting in Goals`;
}

interface WeekJson {
  week_start: string; ends_at: string; packs_opened: number; kpopdle_wins: number; new_cards: number;
  goal_packs: number; goal_wins: number; goal_cards: number; reward_packs: number; reward_shards: number; done: boolean; claimed: boolean;
}
interface SetJson { id: string; kind: SetKind; name: string | null; packs: number; total: number; owned: number; claimed: boolean }
interface FinishedJson { id: string; kind: SetKind; name: string | null; packs: number }
export interface GoalsJson { reward_packs: number; week: WeekJson; sets: SetJson[]; finished: FinishedJson[] }

/** The finished sets of a cards_apply_pack / cards_craft answer; anything unexpected is no set. */
export function finishedOf(v: unknown): FinishedSet[] {
  if (!Array.isArray(v)) return [];
  return (v as FinishedJson[]).filter((s) => s && typeof s.id === 'string' && typeof s.packs === 'number')
    .map((s) => ({ id: s.id, kind: s.kind, name: s.name ?? null, packs: Number(s.packs) }));
}

/** cards_goals_sync's answer as the browser reads it. */
export function goalsFromJson(j: GoalsJson): GoalsState {
  const w = j.week;
  return {
    rewardPacks: Number(j.reward_packs),
    week: {
      weekStart: String(w.week_start), endsAt: new Date(w.ends_at).toISOString(), packsOpened: Number(w.packs_opened), kpopdleWins: Number(w.kpopdle_wins),
      newCards: Number(w.new_cards), goalPacks: Number(w.goal_packs), goalWins: Number(w.goal_wins), goalCards: Number(w.goal_cards),
      rewardPacks: Number(w.reward_packs), rewardShards: Number(w.reward_shards), done: w.done === true, claimed: w.claimed === true,
    },
    sets: j.sets.map((s) => ({ id: s.id, kind: s.kind, name: s.name ?? null, packs: Number(s.packs), total: Number(s.total), owned: Number(s.owned), claimed: s.claimed === true })),
    finished: finishedOf(j.finished),
  };
}

/** What the twin of the sets needs of a card of the catalog (a UiCard satisfies it). */
export interface SetCardIn { n: number; entity: string; kind: 'idol' | 'group' | 'event'; rarity: string }
/** What it needs of an entity: a group is named by `name`, an idol points at its group by that name (the stand-in has no ids for them). */
export interface SetEntityIn { id: string; kind: 'idol' | 'group' | 'event'; name: string; group: string | null; debutYear: number | null; /** Lot 6: age-locked, no set. */ locked?: true }

/**
 * The sets of cards_goals_progress (105-goals.sql) computed in TypeScript, for the fixture API of the development server and for the tests
 * that check the two agree. The catalog it gets is the cards in packs. A group is a set when one of its own cards is in packs; an idol of a
 * group that is not one is a soloist; Holo is rarity R, Gold is UR; a debut year holds the sets of 2 or more groups.
 */
export function goalSets(cards: readonly SetCardIn[], entities: readonly SetEntityIn[], owned: ReadonlySet<number>, claimed: ReadonlySet<string>): GoalSet[] {
  const ent = new Map(entities.filter((e) => !e.locked).map((e) => [e.id, e]));
  const subjects = new Map<string, SetEntityIn>();
  for (const c of cards) {
    const e = ent.get(c.entity);
    if (e && e.kind === 'group') subjects.set(e.name, e);
  }
  const members = new Map<string, { kind: SetKind; name: string | null; ns: number[] }>();
  const add = (id: string, kind: SetKind, name: string | null, n: number): void => {
    const m = members.get(id) ?? { kind, name, ns: [] };
    m.ns.push(n);
    members.set(id, m);
  };
  const groupSets = new Map<string, number[]>();
  for (const c of cards) {
    const e = ent.get(c.entity);
    if (!e) continue;
    if (e.kind === 'group') { add(e.id, 'group', e.name, c.n); groupSets.set(e.id, [...(groupSets.get(e.id) ?? []), c.n]); }
    else if (e.kind === 'idol') {
      const g = e.group ? subjects.get(e.group) : undefined;
      if (g) { add(g.id, 'group', g.name, c.n); groupSets.set(g.id, [...(groupSets.get(g.id) ?? []), c.n]); }
      else add('solo', 'solo', null, c.n);
    }
    if (c.rarity === 'R') add('holo', 'holo', null, c.n);
    if (c.rarity === 'UR') add('gold', 'gold', null, c.n);
  }
  const byYear = new Map<number, SetEntityIn[]>();
  for (const g of subjects.values()) if (g.debutYear !== null) byYear.set(g.debutYear, [...(byYear.get(g.debutYear) ?? []), g]);
  for (const [y, gs] of byYear) if (gs.length >= 2) for (const g of gs) for (const n of groupSets.get(g.id) ?? []) add(`year:${y}`, 'year', String(y), n);
  const rank: SetKind[] = ['gold', 'holo', 'year', 'solo', 'group'];
  return [...members.entries()].map(([id, m]) => ({
    id, kind: m.kind, name: m.name, packs: GOAL_REWARD_PACKS[m.kind], total: m.ns.length, owned: m.ns.filter((n) => owned.has(n)).length, claimed: claimed.has(id),
  })).sort((a, b) => rank.indexOf(a.kind) - rank.indexOf(b.kind) || (a.name ?? '').localeCompare(b.name ?? '') || a.id.localeCompare(b.id));
}

/** The sets that are complete and not claimed yet: the ones a pack or a craft has just finished. */
export const dueSets = (sets: readonly GoalSet[]): GoalSet[] => sets.filter((s) => s.total > 0 && s.owned >= s.total && !s.claimed);

/** Binder sections (ui-types BinderSection) whose group is complete: a section with a group card of its own, every card owned. */
export function completeSections(sections: readonly { id: string; ns: readonly number[] }[], kindOf: (n: number) => string | undefined, owned: { has(n: number): boolean }): Set<string> {
  const out = new Set<string>();
  for (const s of sections) {
    if (s.ns.length > 0 && s.ns.every((n) => owned.has(n)) && s.ns.some((n) => kindOf(n) === 'group')) out.add(s.id);
  }
  return out;
}
