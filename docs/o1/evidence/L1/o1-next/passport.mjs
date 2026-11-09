// Lot o1/next C: the Passport doors of OtakuQuiz (account menu, streak popover) and /anime/profile. GET only; "signed in" is the
// client view only (the cookie getter shows a fixture name, /api/auth/me answered in the browser).
import { chromium } from '@playwright/test'; // run with NODE_PATH=apps/quiz/node_modules, or copy into apps/quiz
import fs from 'node:fs';
const [base, outDir] = process.argv.slice(2);
const PROFILE = { id: '00000000-0000-4000-8000-000000000001', username: 'fixture_fan', display_name: 'Mina', avatar_url: null, avatar_bg: '#E8457A', avatar_text: '#ffffff', xp: 1200, daily_streak: 3, last_daily_date: new Date().toISOString().slice(0, 10) };
const browser = await chromium.launch();
const out = {};
async function ctxFor(signedIn) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  if (signedIn) await page.addInitScript(() => { const d = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie'); Object.defineProperty(document, 'cookie', { configurable: true, get() { const c = d.get.call(document); return `${c}${c ? '; ' : ''}sb-fixture-auth-token=fixture`; }, set(v) { d.set.call(document, v); } }); });
  await page.route('**/*', (route) => { const r = route.request(); if (r.method() !== 'GET') return route.abort(); if (new URL(r.url()).pathname.endsWith('/api/auth/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: signedIn ? PROFILE : null }) }); return route.continue(); });
  return { ctx, page };
}
{ // signed in: the account menu and the streak popover
  const { ctx, page } = await ctxFor(true);
  await page.goto(`${base}/anime`, { waitUntil: 'networkidle', timeout: 240000 }).catch(() => null);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.locator('button.ux-avabtn').first().click({ timeout: 60000 });
  const row = page.getByRole('link', { name: 'Passport', exact: true }).first();
  await row.waitFor({ timeout: 30000 });
  out.accountMenuPassport = await row.getAttribute('href');
  await page.screenshot({ path: `${outDir}/anime-account-menu-passport.png` });
  await page.keyboard.press('Escape');
  const streak = page.locator('button.ux-streak, a.ux-streak').first();
  if (await streak.count()) {
    await streak.click().catch(() => null);
    const see = page.getByRole('link', { name: 'See your passport' }).first();
    if (await see.count()) { out.streakPopoverPassport = await see.getAttribute('href'); await page.screenshot({ path: `${outDir}/anime-streak-popover-passport.png` }); }
  }
  await ctx.close();
}
{ // signed out: /anime/profile lands on the OtakuQuiz passport page (/anime/me), noindex
  const { ctx, page } = await ctxFor(false);
  const res = await page.goto(`${base}/anime/profile`, { waitUntil: 'networkidle', timeout: 240000 }).catch(() => null);
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  out.profileFinalUrl = page.url().replace(base, '');
  out.profileStatus = res ? res.status() : null;
  out.profileRobots = await page.locator('meta[name="robots"]').first().getAttribute('content').catch(() => null);
  out.profileTitle = await page.title();
  await page.screenshot({ path: `${outDir}/anime-profile-guest.png` });
  await ctx.close();
}
fs.writeFileSync(`${outDir}/passport-anime.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out));
await browser.close();
