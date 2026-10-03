// C1 (V12 run): drive the flag-on build to one v12 state and measure it. No production write: every
// mutating request to /api/** or Supabase is answered locally (recorded in `writes`) before the driver's
// own fixtures are installed (later routes win in Playwright).
import { measureInPage, masksInPage } from './lib.mjs';

const PHONE_UA = 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';

export async function newCtx(browser, { BASE, AUTH_FILE, width, theme, auth, reduced = false }) {
  const phone = width < 500;
  const ctx = await browser.newContext({
    baseURL: BASE, viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1,
    ...(reduced ? { reducedMotion: 'reduce' } : {}),
    ...(auth === 'user' ? { storageState: AUTH_FILE } : {}), ...(phone ? { userAgent: PHONE_UA } : {}),
  });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, theme);
  return ctx;
}

export async function guard(page) {
  const writes = [];
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
    const req = route.request();
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method())) { await route.continue(); return; }
    writes.push({ method: req.method(), path: new URL(req.url()).pathname, body: (req.postData() || '').slice(0, 300) });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return writes;
}

export async function implRun(browser, { BASE, AUTH_FILE, width, theme, st, props }) {
  const ctx = await newCtx(browser, { BASE, AUTH_FILE, width, theme, auth: st.auth });
  const page = await ctx.newPage();
  page.setDefaultTimeout(45_000);
  const writes = await guard(page);
  const s = {};
  try {
    await st.open(page, s);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await page.mouse.move(1, 1);
    await page.evaluate(() => document.fonts.ready);
    // lazy images in, then the reference framing
    const hgt = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < Math.min(hgt, 6000); y += 700) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(80); }
    await page.evaluate((sel) => { const e = sel && document.querySelector(sel); if (e) { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); } else window.scrollTo(0, 0); }, st.anchor);
    await page.waitForTimeout(700);
    const m = await page.evaluate(measureInPage, { lms: st.lm.map((l) => ({ ...l, side: l.impl })), props, scope: null });
    const sy = await page.evaluate(() => scrollY);
    const masks = (await page.evaluate(masksInPage)).map(([x, y, w, h]) => [x, y - sy, w, h]);
    const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const png = await page.screenshot({ fullPage: false, timeout: 60_000 });
    const u = new URL(page.url());
    const signedIn = await page.evaluate(() => Boolean(document.querySelector('.ux-avabtn, .ux-nav-r button[aria-label^="Notifications"]')));
    await ctx.close();
    if (st.auth === 'user' && !signedIn) return { error: 'signed-in state expected, the page rendered as a guest', writes };
    return { m, masks, png, overflowX, writes, url: u.pathname + u.search, signedIn, hidden: s.hidden ?? (s.hiddenStatus ? { status: s.hiddenStatus } : null) };
  } catch (e) {
    let png = null;
    try { png = await page.screenshot({ fullPage: false }); } catch { /* closed */ }
    await ctx.close();
    return { error: String((e && e.message) || e).split('\n')[0].slice(0, 300), png, writes, hidden: s.hidden ?? (s.hiddenStatus ? { status: s.hiddenStatus } : null) };
  }
}
