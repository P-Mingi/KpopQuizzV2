// SEO-LAUNCH-1 lane D (agent 1 P2): two pages of the hub answered 200 for something that is not there. /directory has nothing to list on the hub, and /kpopcards/u/{unknown} said "not here" in a 200 page.
// Both are real 404s now; a real player's page and a lookup that cannot be made render as they always did.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ result: { data: [{ id: 'u1' }] as unknown, error: null as unknown }, thrown: false, lastUsername: '' }));

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => {
    if (db.thrown) throw new Error('no settings');
    const q = {
      select: () => q,
      eq: (_c: string, v: string) => { db.lastUsername = v; return q; },
      limit: async () => db.result,
    };
    return { from: () => q };
  },
}));
vi.mock('@/components/cards/ranking-view', () => ({ PlayerView: () => null }));

const NOT_FOUND = /NEXT_HTTP_ERROR_FALLBACK;404|NEXT_NOT_FOUND/;

beforeEach(() => { db.result = { data: [{ id: 'u1' }], error: null }; db.thrown = false; db.lastUsername = ''; });

describe('/directory on the hub', () => {
  it('answers a real 404', async () => {
    const page = await import('@/app/sites/[site]/(hub)/directory/page');
    expect(() => page.default()).toThrow(NOT_FOUND);
  });
});

describe('/kpopcards/u/{nickname}', () => {
  const run = async (nickname: string): Promise<unknown> => {
    const page = await import('@/app/sites/[site]/(hub)/kpopcards/u/[nickname]/page');
    return page.default({ params: Promise.resolve({ nickname }) });
  };

  it('renders a real player, looked up by the lower-case nickname', async () => {
    const el = (await run('Mina_92')) as { props: { nickname: string } };
    expect(el.props.nickname).toBe('Mina_92');
    expect(db.lastUsername).toBe('mina_92');
  });

  it('answers 404 for a nickname no profile has, and for one that cannot exist', async () => {
    db.result = { data: [], error: null };
    await expect(run('nobody_here')).rejects.toThrow(NOT_FOUND);
    db.result = { data: [{ id: 'u1' }], error: null };
    for (const bad of ['ab', 'has space', 'x'.repeat(21), '%E0%A4%A', 'a-b-c']) await expect(run(bad), bad).rejects.toThrow(NOT_FOUND);
  });

  it('keeps the page when the lookup cannot be made (a failed read, no settings): never a 404 for a real player', async () => {
    db.result = { data: null, error: { message: 'timeout' } };
    expect(await run('mina_92')).toBeTruthy();
    db.thrown = true;
    expect(await run('mina_92')).toBeTruthy();
  });
});
