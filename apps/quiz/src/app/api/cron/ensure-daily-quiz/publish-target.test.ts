// Audit 01 P0-4: the 23:50 UTC run publishes tomorrow's quiz, the 00:05 UTC run today's.
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/cron-auth', () => ({ isCronAuthorized: () => true }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

import { publishTarget } from './route';

describe('publishTarget', () => {
  it('23:50 UTC publishes tomorrow, 00:05 UTC publishes today', () => {
    expect(publishTarget(new Date('2026-11-09T23:50:00Z'))).toEqual({ date: '2026-11-10', early: true });
    expect(publishTarget(new Date('2026-11-10T00:05:00Z'))).toEqual({ date: '2026-11-10', early: false });
  });
  it('crosses a month and a year end', () => {
    expect(publishTarget(new Date('2026-12-31T23:50:00Z')).date).toBe('2027-01-01');
    expect(publishTarget(new Date('2026-11-30T23:50:00Z')).date).toBe('2026-12-01');
  });
});
