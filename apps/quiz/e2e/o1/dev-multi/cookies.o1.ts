// Run O1, lane Q0a, deliverable 4: three hosts, three separate sessions (scripts/o1/dev-multi.sh --test runs it).
//
// Servers: O1_KPOP_URL, O1_ANIME_URL, O1_HUB_URL (http://<site>.localhost:<port>); a missing one skips with the
// reason. One browser context plays one person who visits the three sites. Each host first answers a probe path
// (fulfilled by the test, never sent to a server) that sets the cookies a signed-in visitor of that site carries:
// the Supabase session cookie of @supabase/ssr, the guest id `nq_anon` and the dev name of the passport transaction
// cookie `pp_tx` (cookies.md section 2: HttpOnly, SameSite=Lax, Path=/, no Domain), plus one script cookie. Then a
// real request to each server must carry that host's cookies and none of the other two hosts' (the Cookie header as
// sent on the wire), the browser jar of each host must hold only its own, and no Set-Cookie of the three servers may
// carry a Domain attribute (a `Domain=localhost` cookie would be shared by every *.localhost host in dev, as a
// parent-domain cookie would be in production).
// The `__Host-` fallback name itself is B4's helper (cookies.md section 2): its conformance table is below, and runs
// when the module exists (O1_TX_COOKIE_MODULE, default the path asked of B4 in Q0a's request 19).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test, expect, type Page, type Response } from '@playwright/test';

const SITES = ['kpop', 'anime', 'hub'] as const;
type Site = (typeof SITES)[number];
const PROBE = '/o1-dev-multi-probe';
const REAL = '/robots.txt';

function base(site: Site): string | null {
  const v = process.env[`O1_${site.toUpperCase()}_URL`];
  return v ? v.replace(/\/+$/, '') : null;
}

/** The Supabase session cookie name @supabase/ssr derives from the project URL (sb-<first label>-auth-token). */
function sessionCookie(): string {
  let host = '127';
  try { host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:9').hostname.split('.')[0] || host; } catch { /* default */ }
  return `sb-${host}-auth-token`;
}

function expected(site: Site): Record<string, string> {
  return {
    [sessionCookie()]: `base64-${site}-session`,
    nq_anon: { kpop: '00000000-0000-4000-8000-00000000000a', anime: '00000000-0000-4000-8000-00000000000b', hub: '00000000-0000-4000-8000-00000000000c' }[site],
    pp_tx: `${site}-tx`,
    o1_probe: site,
  };
}

/** Every value sent under each name (a second cookie of the same name, from a parent domain, shows as a second value). */
function parseCookieHeader(h: string | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const part of (h ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) (out[part.slice(0, i).trim()] ??= []).push(part.slice(i + 1).trim());
  }
  return out;
}

async function plant(page: Page, site: Site, b: string): Promise<void> {
  const want = expected(site);
  const httpOnly = Object.entries(want).filter(([k]) => k !== 'o1_probe');
  await page.route(`${b}${PROBE}`, (route) => route.fulfill({
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'set-cookie': httpOnly.map(([k, v]) => `${k}=${v}; HttpOnly; SameSite=Lax; Path=/; Max-Age=300`).join('\n'),
    },
    body: '<!doctype html><title>probe</title><p>probe</p>',
  }));
  await page.goto(`${b}${PROBE}`);
  await page.evaluate((v) => { document.cookie = `o1_probe=${v}; Path=/; SameSite=Lax`; }, site);
}

test.describe('dev-multi: three hosts, three sessions', () => {
  test('each host keeps its own session cookies; a real request carries only its host\'s', async ({ browser }) => {
    test.setTimeout(900_000);
    const missing = SITES.filter((s) => !base(s));
    test.skip(missing.length > 0, `no server for ${missing.join(', ')} (O1_<SITE>_URL; scripts/o1/dev-multi.sh --test sets them)`);
    const hosts = SITES.map((s) => new URL(base(s)!).host);
    expect(new Set(hosts).size, 'three different hosts').toBe(3);

    const context = await browser.newContext();
    const setCookies: Array<{ site: Site; url: string; value: string }> = [];
    context.on('response', async (r: Response) => {
      if (r.url().includes(PROBE)) return;
      const site = SITES.find((s) => r.url().startsWith(base(s)!));
      if (!site) return;
      const v = await r.headerValue('set-cookie').catch(() => null);
      if (v) setCookies.push({ site, url: r.url(), value: v });
    });
    const page = await context.newPage();
    for (const s of SITES) await plant(page, s, base(s)!);

    // The jar: each host holds exactly its own cookies.
    for (const s of SITES) {
      const jar = Object.fromEntries((await context.cookies(base(s)!)).map((c) => [c.name, c.value]));
      expect(jar, `cookies the browser holds for ${s}`).toEqual(expected(s));
    }

    // The wire: a real request to each server carries that host's cookies and nothing of the other two.
    for (const s of SITES) {
      const res = await page.goto(`${base(s)}${REAL}`, { timeout: 600_000 });
      expect(res, `${s} answered ${REAL}`).not.toBeNull();
      expect(res!.status(), `${s} ${REAL} status`).toBeLessThan(500);
      const sent = parseCookieHeader((await res!.request().allHeaders())['cookie']);
      for (const [k, v] of Object.entries(expected(s))) expect(sent[k], `${s} request carries its ${k}, once`).toEqual([v]);
      for (const other of SITES.filter((o) => o !== s)) {
        for (const [k, v] of Object.entries(expected(other))) expect(sent[k] ?? [], `${s} request must not carry ${other}'s ${k}`).not.toContain(v);
      }
    }

    // No cookie of the three servers is shared across hosts by a Domain attribute.
    const withDomain = setCookies.filter((c) => /;\s*domain=/i.test(c.value));
    expect(withDomain, 'Set-Cookie with a Domain attribute').toEqual([]);
    await context.close();
  });
});

// cookies.md section 2: the name follows the request. Rows: [url, VERCEL_ENV, expected name].
const TX_NAME_CASES: ReadonlyArray<readonly [string, string | undefined, string]> = [
  ['https://fandomverse.org/anime/auth/arrive', undefined, '__Host-pp_tx'],
  ['https://kpopquiz.org/auth/land', 'production', '__Host-pp_tx'],
  ['https://fandomverse.org/auth/authorize', 'preview', '__Host-pp_tx'],
  ['http://anime.localhost:3107/auth/arrive', undefined, 'pp_tx'],
  ['http://kpop.localhost:3106/auth/land', 'development', 'pp_tx'],
  ['http://localhost:3000/auth/arrive', undefined, 'pp_tx'],
  ['http://anime.localhost:3107/auth/arrive', 'production', '__Host-pp_tx'],
  ['https://anime.localhost:3107/auth/arrive', undefined, '__Host-pp_tx'],
  ['http://127.0.0.1:3107/auth/arrive', undefined, '__Host-pp_tx'],
  ['http://fandomverse.org/anime/auth/arrive', undefined, '__Host-pp_tx'],
  ['http://evil-localhost.com/auth/arrive', undefined, '__Host-pp_tx'],
  ['http://localhost.evil.com/auth/arrive', undefined, '__Host-pp_tx'],
];

const TX_MODULE = process.env.O1_TX_COOKIE_MODULE || 'src/lib/passport/tx-cookie.ts';
const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

test('the dev fallback name of the __Host- transaction cookie (B4 helper, cookies.md section 2)', async () => {
  const file = path.resolve(APP_DIR, TX_MODULE);
  test.skip(!fs.existsSync(file), `B4's helper ${TX_MODULE} does not exist yet (Q0a request 19; O1_TX_COOKIE_MODULE overrides the path)`);
  const mod = (await import(pathToFileURL(file).href)) as { txCookieName?: (url: string | URL, env?: { VERCEL_ENV?: string }) => string };
  expect(typeof mod.txCookieName, `${TX_MODULE} exports txCookieName(url, env)`).toBe('function');
  for (const [url, vercelEnv, name] of TX_NAME_CASES) {
    expect(mod.txCookieName!(url, vercelEnv === undefined ? {} : { VERCEL_ENV: vercelEnv }), `${url} (VERCEL_ENV ${vercelEnv ?? 'unset'})`).toBe(name);
  }
});
