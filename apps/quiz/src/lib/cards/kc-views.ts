// KpopCards: the shapes the Missions, Ranking and lobby boxes draw. The pages read these; lib/cards/kc-goals-api.ts maps agent A's contract onto them
// (and the fixture mode builds them from the seeded mock), so the screens never depend on the wire format.
import type { Rarity } from './types';

export interface WeekItemView { key: string; label: string; value: number; target: number }
export interface WeekView {
  items: WeekItemView[];
  /** "3 days left" / "Starts over tonight". */
  leftLabel: string;
  done: boolean;
  claimed: boolean;
  /** "+2 packs and 25 shards". */
  rewardLabel: string;
}
export interface SetView {
  id: string;
  name: string;
  /** "Group", "Soloists", "Edition", "Debut year". */
  type: string;
  /** The dot colour of a group set. */
  color?: string;
  /** The gem of an edition set. */
  gem?: Rarity;
  sub?: string;
  own: number;
  all: number;
  /** The reward in packs; shards when the set pays them too. */
  packs: number;
  shards?: number;
  claimed: boolean;
}
export const setReady = (s: SetView): boolean => s.own >= s.all && s.all > 0 && !s.claimed;
export const setDone = (s: SetView): boolean => s.own >= s.all && s.all > 0;

export interface ShowcaseCard { n: number }
export interface RankRowView { pos: number; nickname: string; pct: number; level: number; title: string; me: boolean; showcase: number[] }
export interface BadgeView { id: string; label: string }
export interface MeCardView { nickname: string; level: number; title: string; pct: number; showcase: number[]; badges: BadgeView[] }
