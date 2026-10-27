// Run O1, lot (c) part 2 (B3): the stamp of a non-kpop site on the first write; nothing at all on kpop.
import { describe, expect, it } from 'vitest';

import { ensureMembershipForWrite } from './membership';

import type { RpcClient } from './xp';

function client(throws = false) {
  const calls: Array<{ fn: string; args: unknown }> = [];
  const c: RpcClient & { calls: typeof calls } = {
    calls,
    rpc: async (fn, args) => {
      calls.push({ fn, args });
      if (throws) throw new Error('down');
      return { data: null };
    },
  };
  return c;
}

describe('ensureMembershipForWrite', () => {
  it('does nothing on kpop: no call is made', async () => {
    const c = client();
    await ensureMembershipForWrite(c, 'kpop');
    expect(c.calls).toEqual([]);
  });

  it('calls ensure_membership for anime and hub with joined_via play by default', async () => {
    for (const site of ['anime', 'hub'] as const) {
      const c = client();
      await ensureMembershipForWrite(c, site);
      expect(c.calls).toEqual([{ fn: 'ensure_membership', args: { p_site: site, p_via: 'play', p_via_code: null } }]);
    }
  });

  it('never fails the write', async () => {
    await expect(ensureMembershipForWrite(client(true), 'anime')).resolves.toBeUndefined();
  });
});
