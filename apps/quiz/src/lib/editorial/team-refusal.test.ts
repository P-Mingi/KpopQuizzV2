// Team accounts never like, reply or vote: the shared refusal answers 403 editorial_account for a Team id, nothing for a fan or no user.
import { describe, expect, it, vi } from 'vitest';

vi.mock('./accounts', () => ({ isEditorialUser: async (id: string | null | undefined) => id === 'team-1' }));

import { teamRefusal } from './team-refusal';

describe('teamRefusal', () => {
  it('refuses a Team account with 403', async () => {
    const r = await teamRefusal('team-1');
    expect(r?.status).toBe(403);
    expect(await r?.json()).toEqual({ error: 'editorial_account' });
  });
  it('lets a fan and an anonymous visitor through', async () => {
    expect(await teamRefusal('fan-9')).toBeNull();
    expect(await teamRefusal(undefined)).toBeNull();
    expect(await teamRefusal(null)).toBeNull();
  });
});
