// KpopCards launch (2026-11-23): the KpopCards tab of /admin on bunnyverse.org/anime is behind the same gate as every tab (ADMIN-1: a visitor and a
// non-admin get the 404 of the site before anything is read), and an admin sees the figures of cards_admin_stats, or that SQL 128 is to be applied.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, aal: 'aal2' as 'aal1' | 'aal2' }));
const db = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: auth.user, aal: auth.aal, factor: true })) }),
  createServiceRoleClient: () => ({ rpc: db.rpc }),
}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); }, redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); }, usePathname: () => '/admin' }));
vi.mock('@/app/(site)/admin/page', () => ({ default: () => null }));

beforeEach(() => { vi.stubEnv('ADMIN_USER_IDS', 'admin-1'); auth.user = null; auth.aal = 'aal2'; db.rpc.mockReset(); });
afterEach(() => { vi.unstubAllEnvs(); });

async function open(params: Record<string, string>): Promise<string> {
  const { default: Page } = await import('./page');
  const el = await Page({ searchParams: Promise.resolve({ tab: 'cards-stats', ...params }) });
  return renderToStaticMarkup(el);
}

describe('/admin, tab KpopCards', () => {
  it('is a 404 for a visitor and for an account that is not an admin, and reads nothing', async () => {
    await expect(open({})).rejects.toThrow('NEXT_NOT_FOUND');
    auth.user = { id: 'user-9' };
    await expect(open({})).rejects.toThrow('NEXT_NOT_FOUND');
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('sends an admin at aal1 to the TOTP code page before anything is read', async () => {
    auth.user = { id: 'admin-1' };
    auth.aal = 'aal1';
    await expect(open({})).rejects.toThrow('NEXT_REDIRECT /admin/k7q2m/code');
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('says SQL 128 has to be applied while the function is missing', async () => {
    auth.user = { id: 'admin-1' };
    db.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.cards_admin_stats' } });
    const out = await open({});
    expect(out).toContain('SQL 128 has to be applied');
    expect(out).toContain('aria-label="Admin sections"');
    expect(out).toMatch(/aria-current="page"[^>]*>KpopCards</);
  });
  it('asks the function for the filters of the URL, and draws its answer', async () => {
    auth.user = { id: 'admin-1' };
    db.rpc.mockResolvedValue({ data: {
      totals: { players: 1, packs_total: 2, packs_today: 0, packs_7d: 2, ads_total: 1, ads_today: 0, cards_in_packs: 886, avg_pct: 1.1 }, total: 1, limit: 50, offset: 50, at: 'x',
      rows: [{ username: 'bob', first_seen: '2026-10-01T00:00:00Z', last_seen: '2026-11-22T00:00:00Z', last_pack: null, level: 1, packs: 2, packs_7d: 2, src_stock: 2, src_focus: 0, src_daily: 0,
        src_shards: 0, src_bonus: 0, src_ad: 0, golden: 0, guarantee: 0, cards: 9, cards_in_packs: 9, pct: 1, copies: 9, dupes: 0, shards: 0, ads: 1, crafted: 0, recycled: 0 }] }, error: null });
    const out = await open({ q: 'bo', w: '7d', ads: 'yes', min: '2', sort: 'cards', dir: 'asc', page: '2' });
    expect(db.rpc).toHaveBeenCalledWith('cards_admin_stats', { p_search: 'bo', p_window: '7d', p_ads: 'yes', p_min_packs: 2, p_sort: 'cards', p_dir: 'asc', p_limit: 50, p_offset: 50 });
    expect(out).toContain('data-testid="cards-stats"');
    expect(out).toContain('>bob<');
  });
  it('does not crash when the database cannot be reached', async () => {
    auth.user = { id: 'admin-1' };
    db.rpc.mockRejectedValue(new Error('fetch failed'));
    expect(await open({})).toContain('data-testid="cards-stats-error"');
  });
});
