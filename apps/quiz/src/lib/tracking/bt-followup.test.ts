// V12 G1 follow-up: the requests the other agents filed for G1's files.
//   1. ranked runs are recorded (components/ranked/ux-v1/use-ranked-run.ts)
//   2. bt_fans_today() as a pending SQL file; the source of a theme page; the
//      optional `strings` of the v11 run hook (English unchanged)
//   3. editorial accounts: the Team pill on the search People rows, and never a
//      player for the tracking route or the claim
// No database: the routes run against recorded fakes, the page against fixture rows.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BT_PLAYLIST_RE, BT_SOURCES, btPlaylistId, btSourceFor } from './bt-shared';
import { parseBtEvent } from './bt-server';

import type { NextRequest } from 'next/server';

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const RUN = '11111111-1111-4111-8111-111111111111';
const ANON = '22222222-2222-4222-8222-222222222222';
const FAN = '33333333-3333-4333-8333-333333333333';
const TEAM = '44444444-4444-4444-8444-444444444444';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.doUnmock('@/lib/supabase/server');
  vi.doUnmock('@/lib/editorial/accounts');
});

// ---------------------------------------------------------------------------
// 1. Ranked
// ---------------------------------------------------------------------------

describe('ranked runs are recorded with mode ranked', () => {
  const hook = read('../../components/ranked/ux-v1/use-ranked-run.ts');

  it('the playlist of a ranked run is theme:ranked and the server accepts it', () => {
    const playlist = btPlaylistId({ kind: 'free', playlist: 'ranked' });
    expect(playlist).toBe('theme:ranked');
    expect(BT_PLAYLIST_RE.test(playlist)).toBe(true);
    expect(btSourceFor('free', '/blindtest/ranked', '')).toBe('other');
  });

  it('a ranked finish with the round placeholders keeps its counts and drops the song entries', () => {
    const songs = Array.from({ length: 10 }, (_, i) => ({ song_id: `round-${i}`, kind: i % 2 ? 'artist' : 'title', correct: i < 7, ms: 2400 + i }));
    const parsed = parseBtEvent({
      event: 'finish', run_id: RUN, anon_id: ANON, playlist: 'theme:ranked', mode: 'ranked', source: 'other', locale: 'en', rounds: 10,
      answered: 10, correct: 7, score: 1840, best_combo: 7, duration_ms: 96_000, completed: true, songs,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok || parsed.event.event !== 'finish') throw new Error('not a finish');
    expect(parsed.event).toMatchObject({ mode: 'ranked', playlist: 'theme:ranked', answered: 10, correct: 7, score: 1840, best_combo: 7, completed: true });
    expect(parsed.event.songs).toEqual([]);
  });

  it('the hook opens the run when it is issued, with the ranked vocabulary', () => {
    expect(hook).toMatch(/tokenRef\.current = got\.token;\n {4}const runId = newBtRunId\(\);\n {4}trackRef\.current = runId \? \{/);
    expect(hook).toMatch(/playlist: btPlaylistId\(\{ kind: 'free', playlist: RANKED_PICK\.playlist \}\),\n {8}mode: 'ranked',\n {8}source: btSourceHere\('free'\),\n {8}locale: btLocale\(\),\n {8}rounds: got\.rounds,/);
  });

  it('start is sent only when a clip really plays, once per run', () => {
    expect(hook).toMatch(/addEventListener\('playing', \(\) => \{\n {8}if \(trackRef\.current !== open \|\| open\.started\) return;\n {8}open\.started = true;\n {8}open\.startedAt = Date\.now\(\);\n {8}trackBtRun\(\{ event: 'start', \.\.\.open\.ctx \}\);\n {6}\}, \{ once: true \}\);/);
  });

  it('finish: completed on the results, abandoned on quit, lost connection, a new start and leaving the page', () => {
    expect(hook).toMatch(/setPhase\('results'\);\n {4}sendFinish\(true\);/);
    expect(hook).toMatch(/const endEarly = useCallback\(\(message: string\) => \{\n {4}sendFinish\(false\);/);
    expect(hook).toMatch(/unlock\(\); \/\/ inside the tap \(iOS Safari\)\n {4}sendFinish\(false\);/);
    expect(hook).toMatch(/const leave = \(\): void => \{\n {6}sendFinish\(false\);/);
    expect(hook.match(/sendFinish\(true\)/g)).toHaveLength(1);
  });

  it('a run whose clip never played is not sent, and a run is closed once', () => {
    const fn = /const sendFinish = useCallback\(\(completed: boolean\) => \{[\s\S]*?\n {2}\}, \[\]\);/.exec(hook)?.[0] ?? '';
    expect(fn).toMatch(/if \(!t\) return;\n {4}trackRef\.current = null;\n {4}if \(!t\.started\) return;/);
    expect(fn).toMatch(/score: t\.score,\n {6}best_combo: t\.bestCombo,/);
  });

  it('the score is the sum of the server points, never recomputed here', () => {
    expect(hook).toMatch(/open\.score \+= r\.points;/);
    expect(hook).not.toMatch(/summarizeRun/);
  });

  it('the ranked API calls are untouched: same four bodies', () => {
    expect(hook).toMatch(/rankedApi\.issue\(\)/);
    expect(hook).toMatch(/rankedApi\.start\(token, n\)/);
    expect(hook).toMatch(/rankedApi\.answer\(token, round, choice, clientMs\)/);
    expect(hook).toMatch(/rankedApi\.submit\(token\)/);
    expect(hook).toMatch(/body: JSON\.stringify\(\{ token \}\),/);
  });
});

// ---------------------------------------------------------------------------
// 2. G3 requests
// ---------------------------------------------------------------------------

describe('bt_fans_today (pending SQL, never applied by the run)', () => {
  const sql = read('../../../../../docs/pending-migrations/v12-g1-bt-fans-today.sql');

  it('has the usual header', () => {
    for (const part of ['NOT APPLIED', '-- WHAT', '-- WHY', '-- ROWS', '-- SAFETY', '-- ORDER', '-- VERIFY', '-- UNDO']) expect(sql).toContain(part);
    expect(sql).toContain('DROP FUNCTION IF EXISTS public.bt_fans_today();');
  });

  it('is one definer function with a pinned search path, idempotent, in a transaction', () => {
    expect(sql).toMatch(/\nBEGIN;\n[\s\S]*\nCOMMIT;\n$/);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.bt_fans_today\(\)\nRETURNS integer\nLANGUAGE sql\nSTABLE\nSECURITY DEFINER\nSET search_path = public, pg_temp\n/);
    expect(sql.match(/CREATE /g)).toHaveLength(1);
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|DROP TABLE|TRUNCATE)\b(?![^\n]*IF EXISTS public\.bt_fans_today)/);
  });

  it('counts distinct players of the UTC day, without test runs and bots', () => {
    expect(sql).toContain('SELECT count(DISTINCT coalesce(player_id, anon_id))::integer');
    expect(sql).toContain('WHERE is_test = false');
    expect(sql).toContain("AND user_agent_class <> 'bot'");
    expect(sql).toContain("AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc') AT TIME ZONE 'utc';");
  });

  it('PUBLIC is revoked, then the three roles may execute', () => {
    const revoke = sql.indexOf('REVOKE ALL ON FUNCTION public.bt_fans_today() FROM PUBLIC;');
    const grant = sql.indexOf('GRANT EXECUTE ON FUNCTION public.bt_fans_today() TO anon, authenticated, service_role;');
    expect(revoke).toBeGreaterThan(0);
    expect(grant).toBeGreaterThan(revoke);
  });

  it('is the function the landing reader calls', () => {
    expect(read('../growth/bt-data.ts')).toContain("db.rpc('bt_fans_today')");
  });
});

describe('source of a run started on a theme page (G3 R2)', () => {
  it.each([
    '/blindtest/girl-groups', '/blindtest/tiktok-viral', '/blindtest/kpop-demon-hunters', '/pt/blindtest/girl-groups', '/blindtest/ranked',
  ])('%s stays other: the theme is in the playlist, not in the source', (path) => {
    expect(btSourceFor('free', path, '')).toBe('other');
  });

  it('the hub itself is still hub, and the vocabulary is the one of the bt_runs check constraint', () => {
    expect(btSourceFor('free', '/blindtest', '')).toBe('hub');
    const sql = read('../../../../../docs/pending-migrations/v12-g1-bt-runs.sql');
    const list = /CONSTRAINT bt_runs_source_chk CHECK \(source IN \(([^)]*)\)\)/.exec(sql)?.[1] ?? '';
    expect(list.split(',').map((s) => s.trim().replace(/'/g, ''))).toEqual([...BT_SOURCES]);
  });

  it('a theme page run is still told apart by its playlist', () => {
    expect(btPlaylistId({ kind: 'free', playlist: 'gg' })).toBe('theme:gg');
    expect(btPlaylistId({ kind: 'free', playlist: 'tiktok-viral' })).toBe('theme:tiktok-viral');
  });
});

describe('use-run.ts: optional strings, English unchanged (G3 R3)', () => {
  it('the defaults are the sentences the hook always wrote', async () => {
    const { RUN_STRINGS_EN, resolveRunStrings } = await import('@/components/blindtest/ux-v1/use-run');
    for (const none of [undefined, null, {}]) {
      const s = resolveRunStrings(none);
      expect(s.errNotEnough).toBe('Not enough songs for this pick. Try another.');
      expect(s.errNoSongs).toBe('No songs found. Try another pick.');
      expect(s.errStart).toBe('Could not start the game. Check your connection.');
      expect(s.announce('correct', 180, { title: 'Supernova', artist: 'aespa' })).toBe('Correct, plus 180 points. Supernova by aespa.');
      expect(s.announce('timeout', 0, { title: 'Supernova', artist: 'aespa' })).toBe('Time is up. Supernova by aespa.');
      expect(s.announce('missed', 0, { title: 'Supernova', artist: 'aespa' })).toBe('Missed. Supernova by aespa.');
      expect(s.announce('correct', 100, null)).toBe('Correct, plus 100 points.');
      expect(s.announce('timeout', 0, null)).toBe('Time is up.');
      expect(s.announce('missed', 0, null)).toBe('Missed.');
    }
    expect(resolveRunStrings()).toEqual(RUN_STRINGS_EN);
  });

  it("G3's English table says the same thing, and the three other languages plug in as they are", async () => {
    const { RUN_STRINGS_EN, resolveRunStrings } = await import('@/components/blindtest/ux-v1/use-run');
    const { BT_STRINGS } = await import('@/lib/growth/bt-strings');
    const song = { title: 'LOVE DIVE', artist: 'IVE' };
    const en = resolveRunStrings(BT_STRINGS.en);
    expect([en.errNotEnough, en.errNoSongs, en.errStart]).toEqual([RUN_STRINGS_EN.errNotEnough, RUN_STRINGS_EN.errNoSongs, RUN_STRINGS_EN.errStart]);
    for (const kind of ['correct', 'timeout', 'missed'] as const) {
      expect(en.announce(kind, 140, song)).toBe(RUN_STRINGS_EN.announce(kind, 140, song));
      expect(en.announce(kind, 140, null)).toBe(RUN_STRINGS_EN.announce(kind, 140, null));
    }
    for (const lang of ['fr', 'es', 'id'] as const) {
      const s = resolveRunStrings(BT_STRINGS[lang]);
      expect(s.errNotEnough).toBe(BT_STRINGS[lang].errNotEnough);
      expect(s.errNoSongs).toBe(BT_STRINGS[lang].errNoSongs);
      expect(s.errStart).toBe(BT_STRINGS[lang].errStart);
      expect(s.errStart).not.toBe(RUN_STRINGS_EN.errStart);
      expect(s.announce('timeout', 0, song)).toBe(BT_STRINGS[lang].announce('timeout', 0, song));
    }
  });

  it('a partial or blank table never blanks a sentence', async () => {
    const { RUN_STRINGS_EN, resolveRunStrings } = await import('@/components/blindtest/ux-v1/use-run');
    const s = resolveRunStrings({ errStart: 'Impossible de lancer la partie.', errNoSongs: '' });
    expect(s.errStart).toBe('Impossible de lancer la partie.');
    expect(s.errNoSongs).toBe(RUN_STRINGS_EN.errNoSongs);
    expect(s.errNotEnough).toBe(RUN_STRINGS_EN.errNotEnough);
    expect(s.announce).toBe(RUN_STRINGS_EN.announce);
  });

  it('the hook writes its sentences through the table, and nowhere else', () => {
    const hook = read('../../components/blindtest/ux-v1/use-run.ts');
    expect(hook).toContain('setError(text.errNotEnough);');
    expect(hook).toContain('setError(text.errNoSongs);');
    expect(hook).toContain('setError(text.errStart);');
    expect(hook).toMatch(/announce\(text\.announce\(a\.correct \? 'correct' : a\.picked === null \? 'timeout' : 'missed', gain, /);
    for (const sentence of ['Not enough songs for this pick. Try another.', 'No songs found. Try another pick.', 'Could not start the game. Check your connection.']) {
      expect(hook.split(sentence)).toHaveLength(2);
    }
    // The callers of today pass no strings: their output is the default table.
    for (const file of ['controller.tsx', 'mode-controller.tsx', 'landing-controller.tsx']) {
      expect(read(`../../components/blindtest/ux-v1/${file}`)).not.toMatch(/useBlindtestRun\(\{[^}]*strings/);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Editorial accounts (G9 R5g, R5h)
// ---------------------------------------------------------------------------

interface DbCall { table: string; op: string; args: unknown[] }

/** A recording stand-in for a Supabase client: every chain resolves to `rows(table)`. */
function fakeDb(calls: DbCall[], rows: (table: string) => unknown[] = () => []): { from: (table: string) => unknown; rpc: (name: string) => Promise<unknown> } {
  const chain = (table: string): unknown => {
    const target: Record<string, unknown> = {};
    const proxy: unknown = new Proxy(target, {
      get(_t, prop: string) {
        if (prop === 'then') return (ok: (v: unknown) => unknown) => Promise.resolve({ data: rows(table), error: null }).then(ok);
        return (...args: unknown[]) => { calls.push({ table, op: prop, args }); return proxy; };
      },
    });
    return proxy;
  };
  return { from: (table) => { calls.push({ table, op: 'from', args: [] }); return chain(table); }, rpc: (name) => { calls.push({ table: name, op: 'rpc', args: [] }); return Promise.resolve({ data: null, error: null }); } };
}

function mockServer(opts: { userId: string | null; editorial: string[]; calls: DbCall[]; service: { made: number }; rows?: (table: string) => unknown[] }): void {
  vi.doMock('@/lib/supabase/server', () => ({
    createServerClient: () => Promise.resolve({ auth: { getUser: () => Promise.resolve({ data: { user: opts.userId ? { id: opts.userId } : null } }) }, ...fakeDb(opts.calls, opts.rows) }),
    createServiceRoleClient: () => { opts.service.made += 1; return fakeDb(opts.calls, (t) => (t === 'bt_runs' ? [{ id: RUN }] : [])); },
    createPublicReadClient: () => fakeDb(opts.calls, opts.rows),
  }));
  vi.doMock('@/lib/editorial/accounts', () => ({
    isEditorialUser: (id: string | null | undefined) => Promise.resolve(Boolean(id) && opts.editorial.includes(String(id))),
    getTeamIds: () => Promise.resolve(new Set(opts.editorial)),
  }));
}

const startBody = { event: 'start', run_id: RUN, anon_id: ANON, playlist: 'all', mode: 'classic', source: 'hub', locale: 'en', rounds: 10, clip_played: true };

function post(url: string, body: unknown, cookie?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'user-agent': BROWSER_UA, 'x-forwarded-for': '203.0.113.9' };
  if (cookie) headers.cookie = cookie;
  const req = new Request(`http://localhost${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  // The routes read cookies through NextRequest; a plain Request has none.
  Object.defineProperty(req, 'cookies', { value: { get: (name: string) => { const m = new RegExp(`(?:^|; )${name}=([^;]*)`).exec(cookie ?? ''); return m ? { name, value: m[1] } : undefined; } } });
  return req as unknown as NextRequest;
}

describe('POST /api/track/bt-run never records an editorial account as a player (G9 R5h)', () => {
  async function run(userId: string | null, editorial: string[]): Promise<{ status: number; body: Record<string, unknown>; calls: DbCall[]; service: number }> {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_BT_TRACKING', '1');
    const calls: DbCall[] = [];
    const service = { made: 0 };
    mockServer({ userId, editorial, calls, service });
    const { POST } = await import('@/app/api/track/bt-run/route');
    const res = await POST(post('/api/track/bt-run', startBody));
    return { status: res.status, body: (await res.json()) as Record<string, unknown>, calls, service: service.made };
  }

  it('an editorial account: the run is dropped before any database client exists, with no error status', async () => {
    const out = await run(TEAM, [TEAM]);
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: false, reason: 'dropped' });
    expect(out.service).toBe(0);
    expect(out.calls).toEqual([]);
  });

  it('a fan is recorded as the player, exactly as before', async () => {
    const out = await run(FAN, [TEAM]);
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ ok: true, recorded: true });
    expect(out.service).toBe(1);
    const upsert = out.calls.find((c) => c.table === 'bt_runs' && c.op === 'upsert');
    expect(upsert?.args[0]).toMatchObject({ id: RUN, player_id: FAN, anon_id: ANON, playlist: 'all', mode: 'classic', source: 'hub' });
  });

  it('a guest is recorded with no player, and nobody is asked who is editorial', async () => {
    const out = await run(null, [TEAM]);
    expect(out.body).toEqual({ ok: true, recorded: true });
    expect(out.calls.find((c) => c.op === 'upsert')?.args[0]).toMatchObject({ player_id: null, anon_id: ANON });
  });

  it('no editorial account yet (flag off, table missing, read error all answer nobody): unchanged', async () => {
    const out = await run(TEAM, []);
    expect(out.body).toEqual({ ok: true, recorded: true });
    expect(out.calls.find((c) => c.op === 'upsert')?.args[0]).toMatchObject({ player_id: TEAM });
  });

  it('the check sits after the player is resolved and before the service role client', () => {
    const route = read('../../app/api/track/bt-run/route.ts');
    expect(route).toMatch(/const player = await playerId\(\);\n {4}if \(player && \(await isEditorialUser\(player\)\)\) return json\(\{ ok: false, reason: 'dropped' \}\);\n {4}const db = createServiceRoleClient\(\);/);
  });

  it('the helper it relies on fails soft to nobody', () => {
    const accounts = read('../editorial/accounts.ts');
    expect(accounts).toMatch(/if \(!isUxV12\(\)\) return \[\];/);
    expect(accounts).toMatch(/if \(isMissingTable\(error, status\)\) return \[\];/);
    expect(accounts).toMatch(/catch \(err\) \{[\s\S]*?return \[\];/);
  });
});

describe('POST /api/claim-runs: an editorial account claims nothing (G9 R5h)', () => {
  async function claim(userId: string | null, editorial: string[]): Promise<{ status: number; body: Record<string, unknown>; calls: DbCall[]; service: number }> {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_BT_TRACKING', '1');
    const calls: DbCall[] = [];
    const service = { made: 0 };
    mockServer({ userId, editorial, calls, service });
    const { POST } = await import('@/app/api/claim-runs/route');
    const res = await POST(post('/api/claim-runs', {}, `nq_anon=${ANON}`));
    return { status: res.status, body: (await res.json()) as Record<string, unknown>, calls, service: service.made };
  }

  it('an editorial account: no table is touched', async () => {
    const out = await claim(TEAM, [TEAM]);
    expect(out.status).toBe(200);
    expect(out.body).toEqual({ claimed: { plays: 0, battles: 0 }, reason: 'editorial_account' });
    expect(out.service).toBe(0);
    expect(out.calls).toEqual([]);
  });

  it('a fan claims as before, bt_runs included', async () => {
    const out = await claim(FAN, [TEAM]);
    expect(out.status).toBe(200);
    expect(out.service).toBe(1);
    expect(out.calls.filter((c) => c.op === 'from').map((c) => c.table)).toEqual(['plays', 'battle_results', 'game_plays', 'bt_runs']);
    for (const c of out.calls.filter((x) => x.op === 'update')) expect(Object.values(c.args[0] as Record<string, unknown>)).toEqual([FAN]);
    expect(out.body).toEqual({ claimed: { plays: 0, battles: 0, games: 0, blindtests: 1 } });
  });

  it('a guest is still refused first', async () => {
    const out = await claim(null, [TEAM]);
    expect(out.status).toBe(401);
    expect(out.calls).toEqual([]);
  });
});

describe('search page People rows: the Team pill for an editorial account (G9 R5g)', () => {
  const people = [
    { id: TEAM, username: 'mina', display_name: 'Mina', avatar_url: null, avatar_bg: '#ffd9ec', avatar_text: '#7a1f4d', xp: 0, follower_count: 1200 },
    { id: FAN, username: 'minari', display_name: null, avatar_url: null, avatar_bg: '#e6f0ff', avatar_text: '#123a7a', xp: 2600, follower_count: 1 },
  ];

  async function render(editorial: string[]): Promise<{ html: string; calls: DbCall[] }> {
    vi.resetModules();
    const calls: DbCall[] = [];
    mockServer({ userId: null, editorial, calls, service: { made: 0 }, rows: (t) => (t === 'profiles' ? people : []) });
    vi.doMock('@/components/profile/follow-button', () => ({ FollowButton: ({ profileUsername }: { profileUsername: string }) => `[follow ${profileUsername}]` }));
    vi.doMock('@/app/(site)/search/search-form', () => ({ SearchForm: () => null }));
    const { default: SearchPage } = await import('@/app/(site)/search/page');
    const html = renderToStaticMarkup(await SearchPage({ searchParams: Promise.resolve({ q: 'mina' }) }));
    vi.doUnmock('@/components/profile/follow-button');
    vi.doUnmock('@/app/(site)/search/search-form');
    return { html, calls };
  }

  const row = (html: string, username: string): string => {
    const at = html.indexOf(`href="/u/${username}"`);
    expect(at).toBeGreaterThan(0);
    return html.slice(html.lastIndexOf('<div', at), html.indexOf(`[follow ${username}]`, at));
  };

  it('the editorial row shows the pill and the follower count, never a level or a fan title', async () => {
    const { html, calls } = await render([TEAM]);
    const team = row(html, 'mina');
    expect(team).toContain('Mina<span class="ux-teamtag" title="Editorial account run by the KpopQuiz team">Team</span>');
    expect(team).toContain('data-team="true"');
    expect(team).toContain('1.2k followers');
    expect(team).not.toMatch(/Lv \d/);
    expect(html.match(/ux-teamtag/g)).toHaveLength(1);
    // The select carries the id the badge keys on.
    expect(calls.find((c) => c.table === 'profiles' && c.op === 'select')?.args[0]).toBe('id, username, display_name, avatar_url, avatar_bg, avatar_text, xp, follower_count');
  });

  it('a fan row is what it was: level, title, followers, no pill', async () => {
    const fan = row((await render([TEAM])).html, 'minari');
    expect(fan).toMatch(/Lv \d+ · [^·<]+ · 1 follower<\/p>/);
    expect(fan).not.toContain('ux-teamtag');
    expect(fan).not.toContain('data-team');
  });

  it('with nobody editorial (v12 off, or before the accounts exist) both rows are fan rows, as today', async () => {
    const { html } = await render([]);
    expect(html).not.toContain('ux-teamtag');
    expect(html).not.toContain('data-team');
    expect(row(html, 'mina')).toMatch(/Mina<\/p><p class="text-xs text-secondary truncate">Lv \d+ · [^·<]+ · 1\.2k followers<\/p>/);
    expect(row(html, 'minari')).toBe(row((await render([TEAM])).html, 'minari'));
  });
});

describe('what this follow-up adds follows the writing rules', () => {
  it('no em or en dash in the new SQL file and in this file', () => {
    const dash = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
    expect(dash.test(read('../../../../../docs/pending-migrations/v12-g1-bt-fans-today.sql'))).toBe(false);
    expect(dash.test(read('./bt-followup.test.ts'))).toBe(false);
  });
});
