'use client';

// KpopCards: the browser's read of the Missions and Ranking data (agent A's contract), mapped onto the view shapes of kc-views.ts. One module for the lobby
// boxes (This week, Friends) and the Missions, Ranking and player pages, so the screens never depend on the wire format: when the contract changes, only the
// `parse*` functions below change. Every call answers { error } rather than throwing; a page with no data says so instead of inventing rows.
import { useCallback, useEffect, useState } from 'react';

import { withBasePath } from '@/lib/site/base-path';

import { levelOf, titleOf } from './kc-level';

import type { MeCardView, RankRowView, SetView, WeekView } from './kc-views';
import type { Rarity } from './types';

export interface KcGoals {
  loaded: boolean;
  failed: boolean;
  week: WeekView | null;
  sets: SetView[];
  /** Reward in packs by group name, for "Almost there". */
  setPacks: Record<string, number>;
  /** The four rows of the lobby's Friends box. */
  friendsMini: RankRowView[] | null;
  /** Re-read after a claim. */
  reload: () => Promise<void>;
  claimSet: (id: string) => Promise<{ ok: boolean; message: string }>;
  claimWeek: () => Promise<{ ok: boolean; message: string }>;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(withBasePath(path), { cache: 'no-store', credentials: 'same-origin' });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}
async function postJson<T>(path: string, body: unknown): Promise<T | { error: string }> {
  try {
    const r = await fetch(withBasePath(path), { method: 'POST', cache: 'no-store', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!r.ok || !j) return { error: j?.error ?? 'failed' };
    return j;
  } catch { return { error: 'network' }; }
}

// ---- the wire format of GET /api/cards/goals (lib/cards/goals.ts GoalsState), read defensively ----
interface WireSet { id: string; kind: 'group' | 'solo' | 'holo' | 'gold' | 'year'; name: string | null; packs: number; total: number; owned: number; claimed: boolean }
interface WireWeek { endsAt: string; packsOpened: number; kpopdleWins: number; newCards: number; goalPacks: number; goalWins: number; goalCards: number; rewardPacks: number; rewardShards: number; done: boolean; claimed: boolean }
export interface WireGoals { rewardPacks: number; week: WireWeek; sets: WireSet[] }

export function weekLeftLabel(endsAt: string, now: number): string {
  const days = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 86400000));
  return days <= 1 ? 'Starts over tonight' : `${days} days left`;
}

export function parseWeek(w: WireWeek, now: number): WeekView {
  return {
    items: [
      { key: 'packs', label: `Open ${w.goalPacks} packs`, value: w.packsOpened, target: w.goalPacks },
      { key: 'dle', label: `Win ${w.goalWins} Kpopdle games`, value: w.kpopdleWins, target: w.goalWins },
      { key: 'newc', label: `Add ${w.goalCards} new cards to your binder`, value: w.newCards, target: w.goalCards },
    ],
    leftLabel: weekLeftLabel(w.endsAt, now),
    done: w.done,
    claimed: w.claimed,
    rewardLabel: `+${w.rewardPacks} packs and ${w.rewardShards} shards`,
  };
}

export function parseSets(sets: readonly WireSet[], colorOf: (groupName: string) => string | undefined): SetView[] {
  return sets.map((s): SetView => {
    const base = { id: s.id, own: s.owned, all: s.total, packs: s.packs, claimed: s.claimed };
    if (s.kind === 'group') return { ...base, name: s.name ?? 'Group', type: 'Group', ...(colorOf(s.name ?? '') ? { color: colorOf(s.name ?? '')! } : {}) };
    if (s.kind === 'solo') return { ...base, name: 'Soloists', type: 'Soloists', color: '#FFC24B' };
    if (s.kind === 'holo') return { ...base, name: 'Every Holo card', type: 'Edition', gem: 'R' as Rarity };
    if (s.kind === 'gold') return { ...base, name: 'Every Gold card', type: 'Edition', gem: 'UR' as Rarity };
    return { ...base, name: `Debut ${s.name ?? ''}`.trim(), type: 'Debut year', color: '#9B59D9' };
  });
}

export function useKcGoals(colorOf: (groupName: string) => string | undefined = () => undefined, nowMs: number | null = null): KcGoals {
  const [wire, setWire] = useState<WireGoals | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [friends, setFriends] = useState<RankRowView[] | null>(null);
  const load = useCallback(async (): Promise<void> => {
    const j = await getJson<WireGoals>('/api/cards/goals');
    if (j && j.week && Array.isArray(j.sets)) { setWire(j); setState('ready'); } else setState('failed');
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let live = true;
    void getJson<{ rows: WireRank[] }>('/api/cards/ranking?scope=friends&mini=1').then((j) => { if (live && j && Array.isArray(j.rows)) setFriends(j.rows.map(parseRank)); });
    return () => { live = false; };
  }, []);
  const now = nowMs ?? 0;
  const sets = wire ? parseSets(wire.sets, colorOf) : [];
  return {
    loaded: state === 'ready', failed: state === 'failed',
    week: wire && now ? parseWeek(wire.week, now) : null,
    sets,
    setPacks: Object.fromEntries(sets.filter((s) => s.type === 'Group').map((s) => [s.name, s.packs])),
    friendsMini: friends,
    reload: load,
    claimSet: async (id) => {
      const r = await postJson<{ ok?: boolean }>('/api/cards/goals/claim', { set: id });
      if ('error' in r) return { ok: false, message: 'Could not claim that reward. Try again.' };
      await load();
      return { ok: true, message: 'Claimed.' };
    },
    claimWeek: async () => {
      const r = await postJson<{ ok?: boolean }>('/api/cards/goals/claim', { week: true });
      if ('error' in r) return { ok: false, message: 'Could not claim the weekly reward. Try again.' };
      await load();
      return { ok: true, message: 'Claimed.' };
    },
  };
}

// ---- ranking: GET /api/cards/ranking?scope=friends|all  ->  { rows: [{ nickname, pct, owned, showcase: number[], me }] } ----
export interface WireRank { nickname: string; pct: number; owned?: number; showcase?: number[]; me?: boolean; pos?: number }
export function parseRank(r: WireRank, i = 0): RankRowView {
  const lv = levelOf(r.owned ?? 0);
  return { pos: r.pos ?? i + 1, nickname: r.nickname, pct: r.pct, level: lv, title: titleOf(lv), me: r.me === true, showcase: r.showcase ?? [] };
}
export async function fetchRanking(scope: 'friends' | 'all'): Promise<RankRowView[] | null> {
  const j = await getJson<{ rows: WireRank[] }>(`/api/cards/ranking?scope=${scope}`);
  return j && Array.isArray(j.rows) ? j.rows.map(parseRank) : null;
}
export async function fetchMeCard(): Promise<MeCardView | null> {
  return getJson<MeCardView>('/api/cards/profile');
}
export async function fetchPlayer(nickname: string): Promise<MeCardView | null> {
  return getJson<MeCardView>(`/api/cards/player/${encodeURIComponent(nickname)}`);
}
