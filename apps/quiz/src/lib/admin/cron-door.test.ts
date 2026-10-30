// ADMIN-1 review: the session door of the GET crons. They write, and a SameSite=Lax session cookie goes along on a top-level link from another
// site, so an admin session counts only on a same-origin request. The Bearer CRON_SECRET door does not look at the origin. Headers below are
// what a browser really sends: a same-origin fetch GET carries no Origin and Sec-Fetch-Site: same-origin; a link from another site carries no
// Origin and Sec-Fetch-Site: cross-site; a URL typed in the address bar carries Sec-Fetch-Site: none.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({ reached: 0, authCalls: 0 }));

vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => {
    s.authCalls += 1;
    return { auth: (await import('./test-support')).stubAuth(() => ({ user: { id: 'admin-1' }, aal: 'aal2' })) };
  },
  createServiceRoleClient: () => { s.reached += 1; throw new Error('REACHED'); },
}));
vi.mock('@supabase/supabase-js', async (orig) => ({
  ...(await orig<typeof import('@supabase/supabase-js')>()),
  createClient: () => { s.reached += 1; throw new Error('REACHED'); },
}));
vi.mock('@/lib/industry/youtube', () => ({ hasYouTubeKey: () => { s.reached += 1; throw new Error('REACHED'); }, fetchViewCounts: vi.fn() }));
vi.mock('@/lib/industry/spotify', () => ({ hasSpotifyCreds: () => { s.reached += 1; throw new Error('REACHED'); }, fetchFollowers: vi.fn() }));
vi.mock('@/lib/verse/decay', () => ({ runRoleDecay: async () => { s.reached += 1; throw new Error('REACHED'); } }));
vi.mock('@/lib/site/cron', async (orig) => ({ ...(await orig<typeof import('@/lib/site/cron')>()), cronForSite: () => null }));

const DOORS = [
  'app/api/cron/pulse-generate/route',
  'app/api/cron/mv-snapshot/route',
  'app/api/cron/spotify-snapshot/route',
  'app/api/cron/verse-refresh/route',
  'app/api/cron/verse-role-decay/route',
  'app/api/qotd/publish/route',
];
const ORIGIN = 'https://kpopquiz.org';
const HOST = { host: 'kpopquiz.org' };

const REFUSED: Array<[string, Record<string, string>]> = [
  ['a link from another site', { ...HOST, 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' }],
  ['a link from a sibling subdomain', { ...HOST, 'sec-fetch-site': 'same-site', 'sec-fetch-mode': 'navigate' }],
  ['no Origin and no same-origin marker (an old browser, a script)', { ...HOST }],
  ['a URL typed in the address bar', { ...HOST, 'sec-fetch-site': 'none' }],
  ['an Origin of another site', { ...HOST, origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }],
  ['a null Origin (a sandboxed frame)', { ...HOST, origin: 'null', 'sec-fetch-site': 'cross-site' }],
];
const ACCEPTED: Array<[string, Record<string, string>]> = [
  ['a same-origin fetch GET', { ...HOST, 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors' }],
  ['a same-origin request that carries its Origin', { ...HOST, origin: ORIGIN, 'sec-fetch-site': 'same-origin' }],
  ['a same-origin fetch GET behind a proxy', { host: 'internal.vercel.app', 'x-forwarded-host': 'kpopquiz.org', 'sec-fetch-site': 'same-origin' }],
];

async function call(door: string, headers: Record<string, string>): Promise<number | 'threw'> {
  const { GET } = await import(/* @vite-ignore */ `@/${door}`) as { GET: (r: NextRequest) => Promise<Response> };
  return GET(new NextRequest(`${ORIGIN}/${door}`, { headers })).then((r) => r.status, () => 'threw' as const);
}

beforeEach(() => {
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  vi.stubEnv('CRON_SECRET', 'unit-test-cron-secret');
  s.reached = 0;
  s.authCalls = 0;
});
afterEach(() => { vi.unstubAllEnvs(); });

describe.each(DOORS)('%s', (door) => {
  it.each(REFUSED)('an admin session on %s: the admin 404, the session never read, nothing run', async (_n, headers) => {
    expect(await call(door, headers)).toBe(404);
    expect(s.authCalls).toBe(0);
    expect(s.reached).toBe(0);
  });

  it.each(ACCEPTED)('an admin session on %s goes through', async (_n, headers) => {
    await call(door, headers);
    expect(s.reached).toBe(1);
  });

  it.each(REFUSED)('the Bearer CRON_SECRET door is unchanged on %s', async (_n, headers) => {
    await call(door, { ...headers, authorization: 'Bearer unit-test-cron-secret' });
    expect(s.reached).toBe(1);
    expect(s.authCalls).toBe(0);
  });

  it('a wrong secret on a cross-site request is the admin 404', async () => {
    expect(await call(door, { ...HOST, 'sec-fetch-site': 'cross-site', authorization: 'Bearer wrong' })).toBe(404);
    expect(s.reached).toBe(0);
  });
});
