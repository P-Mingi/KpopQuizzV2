// Run O1, lane O1: the kpop /search page reads groups and quizzes through forSite (the group match, the title match, the
// group-members match and the popular fallback), so a search on kpopquiz.org with SITE_SCOPE on never lists another site's
// quiz or group, and with it off the requests are today's.
import { afterEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => {
  const sent: string[] = [];
  const state = { groupMatches: true };
  const record = async (input: unknown, init?: { method?: string }): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as { url: string }).url;
    const u = new URL(href);
    sent.push(decodeURIComponent(u.pathname + u.search));
    const table = u.pathname.split('/').pop();
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': '*/0' } });
    // A group may match (the group-members query then runs); the other tables answer empty (with no match at all, the popular fallback runs).
    const body = table === 'groups' && state.groupMatches ? [{ id: 1, name: 'G', slug: 'g', fandom_name: null, display_color: '#000', text_color: '#fff', quiz_count: 1 }] : [];
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json', 'content-range': '*/0' } });
  };
  return { sent, state, record };
});

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/editorial/accounts', () => ({ getTeamIds: async () => new Set<string>() }));
vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient('http://127.0.0.1:9', 'o1-fake-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: net.record as unknown as typeof fetch },
  });
  return { createPublicReadClient: () => client, createServiceRoleClient: () => client, createServerClient: async () => client };
});

const tableOf = (u: string): string => u.split('?')[0]!.split('/').pop()!;

async function requests(scope: boolean, q: string, groupMatches = true): Promise<string[]> {
  net.state.groupMatches = groupMatches;
  vi.resetModules();
  delete process.env.SITE_SCOPE;
  if (scope) process.env.SITE_SCOPE = '1';
  net.sent.length = 0;
  const { default: SearchPage } = await import('./page');
  await SearchPage({ searchParams: Promise.resolve({ q }) });
  return [...net.sent];
}

afterEach(() => { delete process.env.SITE_SCOPE; vi.resetModules(); });

describe('app/(site)/search/page.tsx', () => {
  it('with SITE_SCOPE on, the group match, the title match and the group-members match carry site_id=eq.kpop', async () => {
    const sent = (await requests(true, 'death note', true)).filter((u) => ['groups', 'quizzes'].includes(tableOf(u)));
    expect(sent.filter((u) => tableOf(u) === 'groups')).toHaveLength(1);
    expect(sent.filter((u) => tableOf(u) === 'quizzes'), 'title match and group-members match').toHaveLength(2);
    for (const u of sent) expect(u, u.slice(0, 40)).toContain('site_id=eq.kpop');
  });

  it('with SITE_SCOPE on, the popular fallback carries site_id=eq.kpop too', async () => {
    const sent = (await requests(true, 'death note', false)).filter((u) => ['groups', 'quizzes'].includes(tableOf(u)));
    expect(sent.filter((u) => tableOf(u) === 'quizzes'), 'title match and popular fallback').toHaveLength(2);
    for (const u of sent) expect(u, u.slice(0, 40)).toContain('site_id=eq.kpop');
  });

  it('with SITE_SCOPE off, no request names site_id (today\'s requests)', async () => {
    for (const groupMatches of [true, false]) {
      const sent = await requests(false, 'death note', groupMatches);
      expect(sent.filter((u) => tableOf(u) === 'quizzes')).toHaveLength(2);
      expect(sent.filter((u) => u.includes('site_id'))).toEqual([]);
    }
  });
});
