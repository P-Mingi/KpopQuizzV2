// V12 F2 (G9 R2): the Team badge on the profile. Server free: Supabase is a
// recording fake, so each test also proves which tables a read touches. The rule:
// with NEXT_PUBLIC_UX_V12 unset the passport renders what it did and NO extra read
// happens (editorial_accounts is never selected).

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/u/mina' }));
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));
vi.mock('@/components/profile/ux-v1/islands', async () => ({
  PassportBand: (await import('@/components/profile/ux-v1/passport-band')).PassportBand,
  PassportActions: (await import('@/components/profile/ux-v1/passport-actions')).PassportActions,
  PassportTabs: (await import('@/components/profile/ux-v1/passport-tabs')).PassportTabs,
  MoreQuizzes: (await import('@/components/profile/ux-v1/more-quizzes')).MoreQuizzes,
  LocalDraftRow: () => null,
  LocalDraftOrEmpty: ({ children }: { children: React.ReactNode }) => children,
}));

// ---- a recording Supabase fake -------------------------------------------------
// Every from(table) is logged; the chain is thenable and answers rowsFor(table).
const reads: string[] = [];
const fake = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]>, counts: {} as Record<string, number> }));
function chain(table: string): unknown {
  const result = (): { data: unknown[]; error: null; count: number | null; status: number } => ({ data: fake.rows[table] ?? [], error: null, count: fake.counts[table] ?? null, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
      if (prop === 'single' || prop === 'maybeSingle') return () => Promise.resolve({ ...result(), data: (fake.rows[table] ?? [])[0] ?? null });
      return () => proxy;
    },
  });
  return proxy;
}
const client = { from: (t: string) => { reads.push(t); return chain(t); }, rpc: (fn: string) => { reads.push(`rpc:${fn}`); return chain(`rpc:${fn}`); } };
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => client,
  createPublicReadClient: () => client,
  createServerClient: async () => client,
}));

const MINA = '11111111-1111-4111-8111-111111111111';
const FAN = '22222222-2222-4222-8222-222222222222';

async function flags(v12: boolean): Promise<void> {
  vi.resetModules();
  reads.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.rows = { editorial_accounts: [{ user_id: MINA, display_name: 'Mina from KpopQuiz', beat: 'news', active: true }] };
  fake.counts = {};
}

afterEach(() => { vi.unstubAllEnvs(); });

// ---- G9 R2: the Team badge on the profile ---------------------------------------

const NOW = Date.parse('2026-10-02T12:00:00Z');
async function passportHtml(team: { displayName: string; beat: string } | null): Promise<string> {
  const [{ UxPassport }, { buildPassport }] = await Promise.all([import('@/components/profile/ux-v1/passport'), import('@/lib/ux-v1/p10/build-passport')]);
  const props = buildPassport({
    mode: 'public',
    profile: {
      id: MINA, username: 'mina', display_name: 'mina', avatar_url: null, avatar_bg: '#E8457A', avatar_text: '#FFFFFF', bio: null,
      created_at: '2025-03-04T10:00:00Z', updated_at: '2026-09-01T10:00:00Z', total_quizzes_created: 0, total_plays_received: 0, total_likes_received: 0,
      xp: 1280, follower_count: 24, following_count: 0, name_accent: 'pink', name_font: 'default', pinned_badge_id: null, avatar_kind: 'photo', avatar_ref: null,
      stan_since: 2019, header_url: null,
    },
    spine: {
      xp: 1280, total_quizzes_created: 0, total_plays_received: 0, total_likes_received: 0, quizzes_played: 0, blindtests_played: 0, duels_voted: 0, battles_played: 0, battles_won: 0,
      ult_groups: ['stray-kids'], bias: 'Han', profile_theme: 'default', streak_current: 0, streak_longest: 0, streak_last_active: null, snapshot_at: null,
    },
    groupStats: [],
    collection: { groups_mastered: 0, groups_total: 90, eras: [] },
    groups: [{ id: 2, name: 'Stray Kids', slug: 'stray-kids' }],
    badgeDefs: [],
    earnedBadgeIds: [],
    quizzes: [],
    fandomName: 'STAY',
    war: null,
    team,
    now: NOW,
  } as Parameters<typeof buildPassport>[0]);
  return renderToStaticMarkup(createElement(UxPassport, props));
}

describe('G9 R2: Team badge on the profile', () => {
  it('flag off: readTeamIdentity reads nothing and answers null', async () => {
    await flags(false);
    const { readTeamIdentity } = await import('@/lib/ux-v1/p10/passport-data');
    expect(await readTeamIdentity(MINA)).toBeNull();
    expect(reads).toEqual([]);
  });

  it('flag off: a passport with team = null renders exactly like before (no pill, no line, XP shown)', async () => {
    await flags(false);
    const html = await passportHtml(null);
    expect(html).not.toContain('ux-teamtag');
    expect(html).not.toContain('ux-teamnote');
    expect(html).toContain('p10-xpwrap');
    expect(html.replace(/<[^>]+>/g, '')).toContain('STAY since 2019');
  });

  it('flag on: a team account gets the pill after the name, the team avatar, the profile line, no XP and no fan wording', async () => {
    await flags(true);
    const { readTeamIdentity } = await import('@/lib/ux-v1/p10/passport-data');
    const team = await readTeamIdentity(MINA);
    expect(team).toEqual({ displayName: 'Mina from KpopQuiz', beat: 'news' });
    expect(reads).toEqual(['editorial_accounts']);
    const html = await passportHtml(team);
    expect(html).toMatch(/<h1 class="p10-pname ux-who">Mina from KpopQuiz<\/h1><span class="ux-teamtag"/);
    expect(html).toContain('ux-ava ux-ava-team');
    expect(html).toContain('class="ux-teamnote"');
    expect(html).not.toContain('p10-xpwrap');
    expect(html).not.toContain('ux-bias');
    const text = html.replace(/<[^>]+>/g, '');
    expect(text).not.toContain('STAY since');
    expect(text).toContain('joined March 2025 · 24 followers');
  });

  it('flag on: a fan is not a team account', async () => {
    await flags(true);
    const { readTeamIdentity } = await import('@/lib/ux-v1/p10/passport-data');
    expect(await readTeamIdentity(FAN)).toBeNull();
  });

  it('isTeam unset: the markup is the same with the v12 flag on and off', async () => {
    await flags(false);
    const off = await import('@/components/profile/ux-v1/passport');
    const htmlOff = renderToStaticMarkup(createElement(off.UxPassport, await propsOf()));
    await flags(true);
    const on = await import('@/components/profile/ux-v1/passport');
    const htmlOn = renderToStaticMarkup(createElement(on.UxPassport, await propsOf()));
    expect(htmlOn).toBe(htmlOff);
    expect(htmlOff).toContain('p10-xpwrap');
    expect(htmlOff).not.toContain('ux-teamtag');
    expect(htmlOff).not.toContain('ux-teamnote');
    expect(htmlOff).not.toContain('ux-ava-team');
  });

  it('isTeam is ignored when the v12 flag is off', async () => {
    await flags(false);
    const { UxPassport } = await import('@/components/profile/ux-v1/passport');
    // Same props with isTeam forced: identical HTML with the flag off.
    const html = renderToStaticMarkup(createElement(UxPassport, { ...(await propsOf()), isTeam: true }));
    expect(html).toBe(renderToStaticMarkup(createElement(UxPassport, await propsOf())));
    expect(html).not.toContain('ux-teamtag');
  });
});

async function propsOf(): Promise<Parameters<typeof import('@/components/profile/ux-v1/passport').UxPassport>[0]> {
  const { buildPassport } = await import('@/lib/ux-v1/p10/build-passport');
  return buildPassport({
    mode: 'public',
    profile: { id: FAN, username: 'fan', display_name: 'fan', avatar_url: null, avatar_bg: '#000', avatar_text: '#fff', bio: null, created_at: '2025-03-04T10:00:00Z', updated_at: '2025-03-04T10:00:00Z', total_quizzes_created: 0, total_plays_received: 0, total_likes_received: 0, xp: 10, follower_count: 1, following_count: 0, name_accent: null, name_font: null, pinned_badge_id: null, avatar_kind: null, avatar_ref: null, stan_since: null, header_url: null },
    spine: null, groupStats: [], collection: { groups_mastered: 0, groups_total: 90, eras: [] }, groups: [], badgeDefs: [], earnedBadgeIds: [], quizzes: [], fandomName: null, war: null, now: NOW,
  } as unknown as Parameters<typeof buildPassport>[0]);
}
