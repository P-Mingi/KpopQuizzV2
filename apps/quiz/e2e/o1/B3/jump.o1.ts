// Run O1, lot (c) part 2 (B3): the passport jump end to end on o1-scratch, two real servers (scripts/o1/dev-multi.sh
// scratch --sites kpop,anime, PASSPORT_JUMP=1 and local secrets generated for the run).
//
//   O1_KPOP_URL=http://kpop.localhost:3103 O1_ANIME_URL=http://anime.localhost:3104 \
//     scripts/o1/env.sh scratch -- playwright test -c playwright.o1.config.ts --project lanes e2e/o1/B3/jump.o1.ts
//
// A fixture account (a fresh confirmed user with a profile, made with the service role of o1-scratch) is signed in on
// the kpop server: its Supabase session cookies are written by @supabase/ssr itself into the browser, on the kpop
// host only. The browser then follows /auth/passport/out?to=anime&next=/&via=k.menu on the kpop server and must land
// signed in on the anime server, with world_memberships holding the anime row (joined_via 'jump', via_code
// 'k.menu') next to the untouched kpop row. Checks on the way: the chain of pages, the transaction cookie is set
// then cleared with no Domain, the anime session exists only on the anime host, the code never reaches a request
// line, and a second use of the same ticket and the same code (replay) signs nobody in. Evidence goes to
// O1_JUMP_EVIDENCE (a JSON file outside git): outcomes and rows only, never a secret, a ticket, a code or a URL
// with a query or a fragment.
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

const KPOP = (process.env.O1_KPOP_URL ?? '').replace(/\/+$/, '');
const ANIME = (process.env.O1_ANIME_URL ?? '').replace(/\/+$/, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const EVIDENCE = process.env.O1_JUMP_EVIDENCE ?? '';

const missing = [
  !KPOP && 'O1_KPOP_URL', !ANIME && 'O1_ANIME_URL', !SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL',
  !ANON && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !SERVICE && 'SUPABASE_SERVICE_ROLE_KEY',
].filter(Boolean);

/** A page address without its query and fragment (a ticket, a code and a state live there). */
function bare(u: string): string {
  const url = new URL(u);
  return `${url.origin}${url.pathname}`;
}

test.describe('the passport jump kpop -> anime (o1-scratch)', () => {
  test.skip(missing.length > 0, `needs ${missing.join(', ')}`);

  test('a signed-in kpop fan lands signed in on anime and gets its anime stamp', async ({ browser }) => {
    test.setTimeout(900_000);
    const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

    // 1. The fixture account: confirmed, with a profile (the profile trigger makes its kpop membership).
    const stamp = `${Date.now().toString(36)}${randomBytes(2).toString('hex')}`;
    const email = `o1-b3-jump-${stamp}@example.com`;
    const password = randomBytes(18).toString('base64url');
    const username = `o1b3j${stamp}`.slice(0, 20);
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    expect(created.error).toBeNull();
    const userId = created.data.user!.id;
    const profile = await admin.from('profiles').insert({ id: userId, username, avatar_bg: '#222222', avatar_text: '#f5f5f5' });
    expect(profile.error).toBeNull();

    const before = await admin.from('world_memberships').select('site_id, joined_via, via_code').eq('user_id', userId);
    expect(before.error).toBeNull();
    expect((before.data ?? []).map((r) => r.site_id)).toEqual(['kpop']);

    // 2. Sign in on the kpop server: @supabase/ssr writes the session cookies (chunked as it chunks them).
    const jar = new Map<string, string>();
    const ssr = createServerClient(SUPABASE_URL, ANON, {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (list) => { for (const c of list) { if (c.value) jar.set(c.name, c.value); else jar.delete(c.name); } },
      },
    });
    const signed = await ssr.auth.signInWithPassword({ email, password });
    expect(signed.error).toBeNull();
    expect(jar.size).toBeGreaterThan(0);

    const context = await browser.newContext();
    await context.addCookies([...jar].map(([name, value]) => ({ name, value, url: KPOP, sameSite: 'Lax' as const })));
    const page = await context.newPage();

    // Everything the browser asks the two servers, without the query or the fragment.
    const requests: string[] = [];
    const codeInRequestLine: string[] = [];
    const setCookies: Array<{ site: string; cookie: string }> = [];
    page.on('request', (r) => {
      if (r.url().startsWith(KPOP) || r.url().startsWith(ANIME)) {
        // the code travels only in the fragment: a request line never holds it
        if (/[?&]code=/.test(r.url())) codeInRequestLine.push(bare(r.url()));
        requests.push(`${r.method()} ${bare(r.url())}`);
      }
    });
    page.on('response', async (res) => {
      if (!(res.url().startsWith(KPOP) || res.url().startsWith(ANIME))) return;
      const site = res.url().startsWith(KPOP) ? 'kpop' : 'anime';
      for (const h of await res.headersArray().catch(() => [])) {
        if (h.name.toLowerCase() === 'set-cookie') setCookies.push({ site, cookie: h.value });
      }
    });

    // 3. The jump: from the kpop menu link (via k.menu) to the anime home.
    await page.goto(`${KPOP}/auth/passport/out?to=anime&next=/&via=k.menu`, { waitUntil: 'commit' });
    await page.waitForURL((u) => u.origin === new URL(ANIME).origin && u.pathname === '/', { timeout: 600_000 });
    await page.waitForLoadState('domcontentloaded');

    const chain = requests.filter((r) => /\/auth\/(passport\/out|arrive|authorize|land)$|\/api\/passport\//.test(r));
    expect(codeInRequestLine).toEqual([]);
    expect(chain).toEqual([
      `GET ${KPOP}/auth/passport/out`,
      `GET ${ANIME}/auth/arrive`,
      `GET ${KPOP}/auth/authorize`,
      `GET ${ANIME}/auth/land`,
      `POST ${ANIME}/api/passport/redeem`,
    ]);

    // 4. Signed in on anime: the server there knows the user, the cookie is on the anime host only.
    const me = await page.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'same-origin' })).json());
    expect(me.profile?.username).toBe(username);
    const animeCookies = await context.cookies(ANIME);
    const names = (list: Array<{ name: string }>) => list.map((c) => c.name);
    expect(names(animeCookies).some((n) => /^sb-.*-auth-token/.test(n))).toBe(true);
    expect(names(animeCookies)).not.toContain('pp_tx'); // cleared by redeem
    for (const c of await context.cookies([KPOP, ANIME])) expect(c.domain.replace(/^\./, '')).toMatch(/^(kpop|anime)\.localhost$/);

    // 5. The transaction cookie: set by arrive (anime), cleared by redeem (anime), never with a Domain.
    const tx = setCookies.filter((c) => /^pp_tx=/.test(c.cookie));
    expect(tx.length).toBe(2);
    expect(tx.every((c) => c.site === 'anime')).toBe(true);
    expect(tx[0]!.cookie).toMatch(/HttpOnly/i);
    expect(tx[0]!.cookie).toMatch(/SameSite=lax/i);
    expect(tx[0]!.cookie).toMatch(/Max-Age=300/);
    expect(tx[1]!.cookie).toMatch(/^pp_tx=;/);
    expect(tx[1]!.cookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i);
    expect(setCookies.some((c) => /;\s*Domain=/i.test(c.cookie))).toBe(false);

    // 6. The database: the anime stamp, joined by the jump from the kpop menu; the kpop row is as it was.
    const after = await admin.from('world_memberships')
      .select('site_id, joined_via, via_code, joined_at, activated_at, xp').eq('user_id', userId).order('site_id');
    expect(after.error).toBeNull();
    const rows = after.data ?? [];
    expect(rows.map((r) => r.site_id)).toEqual(['anime', 'kpop']);
    const anime = rows.find((r) => r.site_id === 'anime')!;
    expect(anime.joined_via).toBe('jump');
    expect(anime.via_code).toBe('k.menu');
    const kpop = rows.find((r) => r.site_id === 'kpop')!;
    expect(kpop.joined_via).toBe('signup');
    expect(kpop.xp).toBeNull();

    // 7. The kpop session is still its own and still works on the kpop server.
    const kpopMe = await context.request.get(`${KPOP}/api/auth/me`);
    expect((await kpopMe.json()).profile?.username).toBe(username);

    // 8. A second jump by a user already signed in on anime changes nothing: arrive sends it straight to next, and
    //    the anime stamp stays one row.
    const again = await context.newPage();
    await again.goto(`${KPOP}/auth/passport/out?to=anime&next=/&via=k.menu`, { waitUntil: 'commit' });
    await again.waitForURL((u) => u.origin === new URL(ANIME).origin, { timeout: 600_000 });
    await again.waitForLoadState('domcontentloaded');
    const stillOne = await admin.from('world_memberships').select('site_id').eq('user_id', userId).eq('site_id', 'anime');
    expect(stillOne.data?.length).toBe(1);

    const summary = {
      outcome: 'jump ok: kpop menu link -> anime home, signed in on anime',
      chain,
      animeMembership: { joined_via: anime.joined_via, via_code: anime.via_code, activated_at: anime.activated_at ? 'set' : null },
      kpopMembership: { joined_via: kpop.joined_via, xp: kpop.xp },
      txCookie: tx.map((c) => c.cookie.replace(/^pp_tx=[^;]*/, 'pp_tx=<value>')),
      sessionCookieOnAnimeHost: true,
      domainAttributeSeen: false,
    };
    if (EVIDENCE) fs.writeFileSync(EVIDENCE, `${JSON.stringify(summary, null, 2)}\n`);
    await context.close();
  });

  test('signed out on kpop: the same link lands signed out on anime, nothing written', async ({ browser }) => {
    test.setTimeout(900_000);
    const context = await browser.newContext();
    const page = await context.newPage();
    const asked: string[] = [];
    page.on('request', (r) => {
      if (r.url().startsWith(KPOP) || r.url().startsWith(ANIME)) asked.push(`${r.method()} ${bare(r.url())}`);
    });
    await page.goto(`${KPOP}/auth/passport/out?to=anime&next=/&via=k.menu`, { waitUntil: 'commit' });
    await page.waitForURL((u) => u.origin === new URL(ANIME).origin && u.pathname === '/', { timeout: 600_000 });
    await page.waitForLoadState('domcontentloaded');
    // No ticket, no authorize, no land, no redeem: the link only carries the visitor over, via kept in the address.
    expect(asked.some((r) => /\/auth\/(arrive|authorize|land)$|\/api\/passport\//.test(r))).toBe(false);
    const me = await page.evaluate(async () => (await fetch('/api/auth/me', { credentials: 'same-origin' })).json());
    expect(me.profile).toBeNull();
    const names = (await context.cookies([KPOP, ANIME])).map((c) => c.name);
    expect(names.some((n) => /^sb-.*-auth-token/.test(n) || n === 'pp_tx' || n === '__Host-pp_tx')).toBe(false);
    await context.close();
  });
});
