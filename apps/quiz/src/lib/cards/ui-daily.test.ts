// The signed-out lobby names the same group of the day as the server (lib/kpopcards/model.ts dailyGroup): groups with a card, sorted by id, by the Paris day number.
import { describe, expect, it } from 'vitest';

import { dailyGroupOf } from './ui-daily';

import type { UiCard, UiEntity } from './ui-types';

const ent = (id: string, name: string, kind: UiEntity['kind'] = 'group'): UiEntity => ({ id, kind, name, group: null, debutYear: 2020, sortKey: name, lockReasons: {} } as unknown as UiEntity);
const card = (entity: string, n: number): UiCard => ({ n, entity } as unknown as UiCard);
const cat = { entities: [ent('group:c', 'Cee'), ent('group:a', 'Aye'), ent('group:b', 'Bee'), ent('group:none', 'No card'), ent('idol:x', 'Ex', 'idol')], cards: [card('group:a', 1), card('group:b', 2), card('group:c', 3), card('idol:x', 4)] };

describe('the group of the day for a visitor', () => {
  it('skips groups with no card and idols, and sorts by id', () => {
    const names = new Set<string>();
    for (let d = 0; d < 6; d++) names.add(dailyGroupOf(cat, Date.UTC(2026, 10, 10 + d, 12))!.name);
    expect([...names].sort()).toEqual(['Aye', 'Bee', 'Cee']);
  });
  it('changes at the Paris midnight, and is the same all day', () => {
    // 2026-11-13 22:59 UTC is 23:59 in Paris, 23:00 UTC is 00:00 on the 14th.
    const a = dailyGroupOf(cat, Date.UTC(2026, 10, 13, 8))!.name;
    expect(dailyGroupOf(cat, Date.UTC(2026, 10, 13, 22, 59))!.name).toBe(a);
    expect(dailyGroupOf(cat, Date.UTC(2026, 10, 13, 23, 0))!.name).not.toBe(a);
  });
  it('is null without a group', () => { expect(dailyGroupOf({ entities: [], cards: [] }, Date.now())).toBeNull(); });
});
