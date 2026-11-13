// KpopCards: the TypeScript views and the database agree. The wallet (cards_wallet of 110 against walletNow of model.ts) over random states
// around the cap, the day cap, Paris midnight, the clock changes and the 2 hour pause; the pack of the day (cards_daily_group against dailyGroup)
// is checked in sql-core.test.ts.
import { describe, expect, it, vi } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { coreDb, newUser, setWallet, wallet } from './sql-fixture';
import { walletNow } from './model';
import { seededRng } from './mock-api';
import { parisDayOf } from '../cards/rules';

describe('cards_wallet and walletNow agree', () => {
  it('on 400 random wallets', async () => {
    const db = await coreDb();
    const r = seededRng(99);
    const base = [Date.parse('2026-03-28T20:00:00Z'), Date.parse('2026-10-24T20:00:00Z'), Date.parse('2026-11-12T08:00:00Z')];
    for (let i = 0; i < 400; i++) {
      const u = await newUser(db);
      const t0 = base[r(3)]! + r(8 * 3600) * 1000;
      const stock = r(13);
      const anchor = t0 - r(5 * 3600) * 1000;
      const timer = r(45);
      const seen = t0 - r(5 * 3600) * 1000;
      const day = parisDayOf(t0 - (r(4) === 0 ? 86400000 : 0));
      const now = t0 + r(3 * 3600) * 1000;
      await setWallet(db, u, { stock, anchor: new Date(anchor).toISOString(), day, timer, seen: new Date(seen).toISOString() });
      const sql = await wallet(db, u, new Date(now).toISOString());
      const ts = walletNow({ stock, anchor, timerToday: timer, parisDay: day, adsToday: 0, lastSeen: seen }, now);
      const ctx = JSON.stringify({ stock, anchor: new Date(anchor).toISOString(), timer, seen: new Date(seen).toISOString(), day, now: new Date(now).toISOString() });
      expect([ctx, sql.stock, sql.timer_used, sql.paused, sql.next_at === null ? null : Date.parse(sql.next_at as string), Date.parse(sql.midnight_at as string)])
        .toEqual([ctx, ts.stock, ts.timerToday, ts.paused, ts.nextAt, ts.midnightAt]);
    }
  });
});
