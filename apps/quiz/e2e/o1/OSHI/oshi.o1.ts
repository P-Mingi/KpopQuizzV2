// Run O1, lane OSHI: "Set as oshi" under a Which character are you result on otakuquiz.org, on o1-dev with the dual fixture
// (a member of KpopQuiz and OtakuQuiz), in a real browser (Chromium of the installed Playwright).
//
//   O1_KPOP_URL O1_ANIME_URL O1_HUB_URL   the three servers (scripts/o1-tools/dev-up.sh prints them); a missing one skips the suite.
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY   o1-dev, from scripts/o1/env.sh dev.
//
// What it covers: signed out the offer opens the sign-in sheet and saves nothing; the dual fan takes the Death Note quiz, sets the
// result as their oshi, the row of the series and the tag of the anime membership are there, the oshi shows on their OtakuQuiz profile,
// and it is absent on fanquiz.org and on kpopquiz.org (pages, the network payload, the shared profile's bias).
//
// Writes: o1-dev is written through the app and through the fan's own session (RLS: own rows), never with the service role, which
// only asks the admin API for a one-time sign-in link (no email is sent). The oshi of the fan is put back as it was at the end.
// Tests print outcomes only: never a key, a link, a token or an address with a query.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';

const trim = (v: string | undefined): string => (v ?? '').replace(/\/+$/, '');
const URLS = { kpop: trim(process.env.O1_KPOP_URL), anime: trim(process.env.O1_ANIME_URL), hub: trim(process.env.O1_HUB_URL) };
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const SERIES = 'death-note';
const QUIZ = `/which-${SERIES}-character-are-you`;

const missing = [!URLS.kpop && 'O1_KPOP_URL', !URLS.anime && 'O1_ANIME_URL', !URLS.hub && 'O1_HUB_URL', !SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL', !ANON && 'NEXT_PUBLIC_SUPABASE_ANON_KEY', !SERVICE && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean) as string[];
test.skip(missing.length > 0, `needs ${missing.join(', ')}`);
test.describe.configure({ mode: 'serial' });

interface Fixture { key: string; username: string; email: string; id: string }
function fixture(key: string): Fixture {
  const list = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/o1/fixtures-dev.json'), 'utf8')).users as Fixture[];
  const f = list.find((u) => u.key === key);
  if (!f) throw new Error(`fixture ${key} is not in docs/o1/fixtures-dev.json`);
  return f;
}

/** The session of a fixture account: the cookies the browser gets, and the fan's own Supabase client (RLS, no service role). */
async function session(key: string) {
  const f = fixture(key);
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: f.email });
  expect(link.error, `sign-in link for ${key}`).toBeNull();
  const hashed = link.data.properties?.hashed_token;
  expect(hashed, `sign-in token for ${key}`).toBeTruthy();
  const jar = new Map<string, string>();
  const ssr = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (list) => { for (const c of list) { if (c.value) jar.set(c.name, c.value); else jar.delete(c.name); } },
    },
  });
  const signed = await ssr.auth.verifyOtp({ type: 'email', token_hash: hashed! });
  expect(signed.error, `session for ${key}`).toBeNull();
  return { fixture: f, db: ssr, cookies: [...jar].map(([name, value]) => ({ name, value })) };
}

async function contextFor(browser: Browser, cookies: Array<{ name: string; value: string }>, sites: Array<keyof typeof URLS>): Promise<BrowserContext> {
  const context = await browser.newContext();
  for (const s of sites) await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: URLS[s], sameSite: 'Lax' as const })));
  return context;
}

/** Takes the quiz: Start, then the first answer of each question, until the result shows. */
async function takeQuiz(page: Page): Promise<string> {
  await page.goto(`${URLS.anime}${QUIZ}`);
  await page.getByRole('button', { name: 'Start' }).click();
  for (let i = 1; i <= 8; i++) {
    await expect(page.locator('[data-testid="pers-question"]')).toHaveAttribute('data-step', String(i));
    await page.locator('.ux-pers-opt').first().click();
  }
  const offer = page.locator('[data-testid="pers-bias"]');
  await expect(offer, 'the oshi offer under the result').toBeVisible({ timeout: 30_000 });
  await expect(offer).toContainText('Make');
  await expect(offer.getByRole('button', { name: 'Set as oshi' })).toBeVisible();
  return (await offer.locator('b').first().innerText()).trim();
}

const word = (name: string): RegExp => new RegExp(`(^|[^A-Za-z])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`);
const text = async (page: Page): Promise<string> => {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  return page.evaluate(() => document.body.innerText);
};

test('signed out: "Set as oshi" opens the sign-in sheet and saves nothing', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await takeQuiz(page);
  await page.locator('[data-testid="pers-bias"]').getByRole('button', { name: 'Set as oshi' }).click();
  await expect(page.getByRole('dialog'), 'the sign-in sheet').toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('oshi tag');
  await expect(page.locator('[data-testid="pers-bias"]'), 'still the offer, nothing saved').toContainText('Make');
  await context.close();
});

test('the dual fan sets the oshi from the result: saved, shown on the OtakuQuiz profile, absent on fanquiz.org and kpopquiz.org', async ({ browser }) => {
  test.setTimeout(300_000);
  const { fixture: f, db, cookies } = await session('dual');
  const group = await db.from('groups').select('id').eq('slug', SERIES).eq('site_id', 'anime').maybeSingle();
  expect(group.error, 'series read').toBeNull();
  const groupId = (group.data as { id: number } | null)?.id;
  expect(groupId, 'the Death Note series exists on o1-dev').toBeTruthy();

  // As it was: the oshi row of the series, the tag of the anime membership, the bias of the shared profile.
  const beforeRow = await db.from('favourite_characters').select('character_id').eq('group_id', groupId!).maybeSingle();
  const beforeMember = await db.from('world_memberships').select('tag_text').eq('user_id', f.id).eq('site_id', 'anime').maybeSingle();
  const beforeBias = await db.from('profiles').select('bias').eq('id', f.id).maybeSingle();
  expect(beforeBias.error, 'profile read').toBeNull();
  const biasBefore = (beforeBias.data as { bias: string | null } | null)?.bias ?? null;

  const context = await contextFor(browser, cookies, ['anime', 'kpop', 'hub']);
  try {
    const page = await context.newPage();
    const name = await takeQuiz(page);
    expect(name.length).toBeGreaterThan(0);
    await page.locator('[data-testid="pers-bias"]').getByRole('button', { name: 'Set as oshi' }).click();
    await expect(page.locator('[data-testid="pers-bias"]'), 'the offer says it is done').toContainText('is your oshi tag', { timeout: 30_000 });
    await expect(page.locator('[data-testid="pers-bias"]')).toContainText('on your profile');

    // Stored: one row for the series, the tag of the anime membership; the shared profile's bias is untouched.
    const row = await db.from('favourite_characters').select('character_id, characters(name)').eq('group_id', groupId!).maybeSingle();
    expect(row.error, 'oshi row read').toBeNull();
    const ch = (row.data as { characters: { name: string } | Array<{ name: string }> | null } | null)?.characters;
    expect(Array.isArray(ch) ? ch[0]?.name : ch?.name, 'the oshi of the series is the result').toBe(name);
    const member = await db.from('world_memberships').select('tag_text').eq('user_id', f.id).eq('site_id', 'anime').maybeSingle();
    expect((member.data as { tag_text: string | null } | null)?.tag_text, 'the tag of the anime membership').toBe(name);
    const bias = await db.from('profiles').select('bias').eq('id', f.id).maybeSingle();
    expect((bias.data as { bias: string | null } | null)?.bias ?? null, 'the shared profile bias is as it was').toBe(biasBefore);

    // Shown: the fan's own OtakuQuiz profile, and the public one on the same site.
    await page.goto(`${URLS.anime}/me`);
    await expect(page.locator('.ux-bias').first(), 'the oshi tag on /me').toContainText(name);
    await page.goto(`${URLS.anime}/u/${f.username}`);
    await expect(page.locator('.ux-bias').first(), 'the oshi tag on /u').toContainText(name);

    // Absent: fanquiz.org (home, passport, network payload) and kpopquiz.org (home, own profile, the public profile, the shared bias).
    const elsewhere: Array<[string, keyof typeof URLS, string]> = [
      ['hub /', 'hub', '/'], ['hub /privacy', 'hub', '/privacy'], ['kpop /', 'kpop', '/'], ['kpop /me', 'kpop', '/me'], ['kpop /u', 'kpop', `/u/${f.username}`],
    ];
    for (const [label, site, p] of elsewhere) {
      const res = await page.goto(`${URLS[site]}${p}`);
      expect(res?.status() ?? 0, `${label} answers`).toBeLessThan(500);
      expect(await text(page), `${label}: no oshi`).not.toMatch(word(name));
      expect(await page.locator('.ux-bias').filter({ hasText: name }).count(), `${label}: no oshi tag`).toBe(0);
    }
    for (const site of ['hub', 'kpop'] as const) {
      await page.goto(`${URLS[site]}/`);
      const payloads = await page.evaluate(async () => {
        const out: string[] = [];
        for (const u of ['/api/n/me', '/api/auth/me']) { try { out.push(await (await fetch(u, { credentials: 'same-origin' })).text()); } catch { out.push(''); } }
        return out;
      });
      for (const body of payloads) expect(body, `${site}: network and session payloads`).not.toMatch(word(name));
    }
    test.info().annotations.push({ type: 'oshi', description: `${f.username}: saved for ${SERIES}, on the anime profile, absent on hub and kpop` });
  } finally {
    // Put it back as it was, through the fan's own session.
    if (beforeRow.data) await db.from('favourite_characters').upsert({ user_id: f.id, group_id: groupId!, character_id: (beforeRow.data as { character_id: number }).character_id }, { onConflict: 'user_id,group_id' });
    else await db.from('favourite_characters').delete().eq('group_id', groupId!).eq('user_id', f.id);
    await db.rpc('update_my_membership', { p_site: 'anime', p_patch: { tag_text: (beforeMember.data as { tag_text: string | null } | null)?.tag_text ?? null } });
    await context.close();
  }
});
