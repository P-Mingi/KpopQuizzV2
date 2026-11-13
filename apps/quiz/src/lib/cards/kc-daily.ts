// KpopCards: the group of the pack of the day. One group a day (Paris day), the same for everyone, picked in a fixed order from the groups that have
// cards, so it needs no database row. Agent A's contract may replace it with the server's choice; the lobby only reads {slug, name, colours}.
import { parisDay } from './kc-time';
import { paletteFor } from './ui-palette';

import type { SlimCatalog } from './ui-types';

export interface DailyGroup { slug: string; name: string; a: string; c: string }

export function dailyGroup(cat: Pick<SlimCatalog, 'sections'>, now: number): DailyGroup | null {
  const groups = cat.sections.filter((s) => s.id !== 'events' && s.ns.length > 0);
  if (groups.length === 0) return null;
  const day = Math.floor(Date.parse(`${parisDay(now)}T12:00:00Z`) / 86400000);
  const g = groups[day % groups.length]!;
  const p = paletteFor(`group:${g.name}`);
  return { slug: g.id, name: g.name, a: p.a, c: p.c };
}
