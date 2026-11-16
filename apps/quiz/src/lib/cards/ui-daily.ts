// KpopCards: the group of today's pack of the day, for the signed-out lobby (a visitor has no wallet to read it from). The rule is the server's
// (lib/kpopcards/model.ts dailyGroup): one group a day, the same for everyone, the groups that hold a card sorted by id, picked by the Paris day number.
import type { UiCatalog } from './ui-types';

const MS_DAY = 86_400_000;

export function dailyGroupOf(cat: Pick<UiCatalog, 'cards' | 'entities'>, now: number): { slug: string; name: string } | null {
  const withCard = new Set(cat.cards.map((c) => c.entity));
  const groups = cat.entities.filter((e) => e.kind === 'group' && withCard.has(e.id)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (groups.length === 0) return null;
  const day = new Date(now).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
  const n = Math.floor(Date.parse(`${day}T12:00:00Z`) / MS_DAY);
  const g = groups[((n % groups.length) + groups.length) % groups.length]!;
  return { slug: g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), name: g.name };
}
