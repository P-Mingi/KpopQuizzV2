import { describe, expect, it, vi } from 'vitest';

import { readUpcomingComebacks } from './template-data';

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));

// Audit 04 P0-4: the read of the comebacks calendar fails closed when the source columns do not exist yet (L24 not applied).
function fakeSvc(result: { data: unknown; error: { message: string } | null }): never {
  const calls: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'gte', 'lte', 'order']) chain[m] = (...a: unknown[]) => { calls.push(`${m}:${a.join(',')}`); return chain; };
  chain.limit = () => Promise.resolve(result);
  return { from: () => chain, calls } as never;
}

describe('readUpcomingComebacks', () => {
  it('no source columns (SQL not applied): no comeback, no throw', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const rows = await readUpcomingComebacks(Date.parse('2026-11-09T10:00:00Z'), fakeSvc({ data: null, error: { message: 'column comebacks.status does not exist' } }));
    expect(rows).toEqual([]);
  });
  it('asks only for announced rows that carry a source link', async () => {
    const svc = fakeSvc({ data: [], error: null }) as unknown as { calls: string[] };
    await readUpcomingComebacks(Date.parse('2026-11-09T10:00:00Z'), svc as never);
    expect(svc.calls).toContain('eq:status,announced');
    expect(svc.calls).toContain('not:source_url,is,');
  });
});
