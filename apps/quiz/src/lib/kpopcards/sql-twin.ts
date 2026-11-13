// KpopCards: the TypeScript twins the SQL proofs compare against (the fixture world of sql-fixture.ts, as model.ts reads it). Test code only.
import type { World } from './model';

/** The catalog of sql-fixture.ts as a World (only what the pack of the day needs: group entities with a card in packs, in id order). */
export function fixtureWorldForSql(): World {
  const ent = (id: string, kind: 'idol' | 'group' | 'event', name: string, group: string | null): World['entities'][number] => ({ id, kind, name, group, debutYear: null, sortKey: id, lockReasons: {} });
  const entities = [
    ent('group:G1', 'group', 'Group One', null), ent('group:G2', 'group', 'Group Two', null), ent('group:G3', 'group', 'Group Three', null), ent('group:G4', 'group', 'Group Four', null),
    ent('idol:A1', 'idol', 'Idol A1', 'Group One'), ent('idol:B1', 'idol', 'Idol B1', 'Group Two'), ent('idol:D1', 'idol', 'Idol D1', 'Group Three'), ent('idol:E1', 'idol', 'Idol E1', 'Group Four'),
  ];
  const mk = (n: number, entity: string, kind: 'idol' | 'group', name: string, group: string | null): World['cards'][number] => ({
    n, num: `BV1-${n}`, entity, kind, rarity: 'C', edition: 'std', name, group, debutYear: null, photo: null,
  });
  const cards = [mk(1, 'group:G1', 'group', 'Group One', 'Group One'), mk(8, 'group:G2', 'group', 'Group Two', 'Group Two'), mk(15, 'group:G3', 'group', 'Group Three', 'Group Three'),
    mk(17, 'group:G4', 'group', 'Group Four', 'Group Four'), mk(2, 'idol:A1', 'idol', 'Idol A1', 'Group One'), mk(12, 'idol:B1', 'idol', 'Idol B1', 'Group Two'),
    mk(16, 'idol:D1', 'idol', 'Idol D1', 'Group Three'), mk(18, 'idol:E1', 'idol', 'Idol E1', 'Group Four')];
  return { cards, entities, themeOf: new Map() };
}

export { dailyGroupId as dailyGroup } from './sql-twin-daily';
