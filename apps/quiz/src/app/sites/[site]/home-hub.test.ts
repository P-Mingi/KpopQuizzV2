import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COPY } from '@/copy/hub/h1';

// Lot (d), H1: the network page of fanquiz.org. Supabase is a fake; no network, no write. The registry reads the site of
// the build when it loads, so each test loads the modules after setting NEXT_PUBLIC_SITE_ID.

const fake = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: { data: { username: 'mina', xp: 120 }, error: null } as { data: unknown; error: unknown },
  memberships: { data: [] as unknown[], error: null } as { data: unknown; error: unknown },
  throwOn: null as null | 'client' | 'auth' | 'from',
}));

function query(table: string): unknown {
  const result = table === 'profiles' ? fake.profile : fake.memberships;
  const q = {
    select: () => q,
    eq: () => q,
    maybeSingle: () => Promise.resolve(result),
    then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
  };
  return q;
}
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => {
    if (fake.throwOn === 'client') throw new Error('database unreachable');
    return {
      auth: { getUser: async () => { if (fake.throwOn === 'auth') throw new Error('fetch failed'); return { data: { user: fake.user }, error: null }; } },
      from: (t: string) => { if (fake.throwOn === 'from') throw new Error('boom'); return query(t); },
    };
  },
}));

// Built from code points so this file holds neither dash.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

const MEMBERSHIPS = [
  { site_id: 'kpop', xp: null, activated_at: '2026-01-01T00:00:00Z', banned_at: null },
  { site_id: 'anime', xp: 80, activated_at: '2026-10-01T00:00:00Z', banned_at: null },
];

async function load(site: 'hub' | 'anime' = 'hub') {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const [home, privacy, registry, network] = await Promise.all([
    import('./home-hub'), import('./privacy/page'), import('@/lib/site/registry'), import('@/lib/site/hub/network-page'),
  ]);
  return { home, privacy, registry, network };
}

async function renderHome(): Promise<string> {
  const { home } = await load();
  return renderToStaticMarkup(await home.default());
}

/** The markup of the shares block (its root div, nested divs counted). */
function sharesBlock(html: string): string {
  const start = html.indexOf('<div class="hub-h1-shares"');
  expect(start, 'no shares block').toBeGreaterThan(-1);
  let depth = 0;
  for (const m of html.slice(start).matchAll(/<(\/?)div\b/g)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, start + m.index! + '</div>'.length);
  }
  throw new Error('unclosed shares block');
}
const lines = (html: string): string[] => html.replace(/<[^>]+>/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean);

beforeEach(() => {
  fake.user = null;
  fake.profile = { data: { username: 'mina', xp: 120 }, error: null };
  fake.memberships = { data: MEMBERSHIPS, error: null };
  fake.throwOn = null;
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the hero', () => {
  it('has one h1 and the line on what the network is', async () => {
    const html = await renderHome();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain(`<h1>${COPY['home.h1']}</h1>`);
    expect(html).toContain('FanQuiz is the home of one account shared by the fan quiz sites.');
  });
});

describe('the sites', () => {
  it('shows one card per site other than the hub, linked to the registry origin', async () => {
    const { registry, network } = await load();
    const html = renderToStaticMarkup(await (await load()).home.default());
    expect(html).toContain(COPY['home.sitesTitle']);
    for (const id of network.networkSiteIds()) {
      const s = registry.REGISTRY[id];
      expect(html, id).toContain(`href="${s.url}"`);
      expect(html, id).toContain(`aria-label="Open ${s.brand.name}"`);
      expect(html, id).toContain(`>${s.brand.name}</span>`);
    }
    expect(html).not.toContain(`href="${registry.REGISTRY.hub.url}"`);
    expect(html.match(/class="hub-h1-card"/g)).toHaveLength(network.networkSiteIds().length);
    expect(html.match(/>Open</g)).toHaveLength(network.networkSiteIds().length);
  });

  it('sets the accent of each card from the theme of its site', async () => {
    const { registry, network } = await load();
    const html = renderToStaticMarkup(await (await load()).home.default());
    for (const id of network.networkSiteIds()) {
      const pink = registry.REGISTRY[id].theme.light.pink!;
      expect(html, id).toContain(`--hub-accent-light:${pink}`);
    }
  });
});

describe('what your passport shares', () => {
  it('reads word for word the same on the home and on the privacy page of the hub', async () => {
    const { home, privacy } = await load();
    const homeHtml = renderToStaticMarkup(await home.default());
    const privacyHtml = renderToStaticMarkup(privacy.default());
    const a = sharesBlock(homeHtml);
    const b = sharesBlock(privacyHtml);
    expect(b).toBe(a);
    expect(lines(a)).toEqual([
      COPY['home.sharesTitle'],
      COPY['shares.seesTitle'], COPY['shares.seesUsername'], COPY['shares.seesAvatar'], COPY['shares.seesLevel'], COPY['shares.seesSites'],
      COPY['shares.hidesTitle'], COPY['shares.hidesEmail'], COPY['shares.hidesSignIn'], COPY['shares.hidesHistory'],
    ]);
    expect(privacyHtml.match(/<h1\b/g)).toHaveLength(1);
  });

  it('is not on the privacy page of the other builds', async () => {
    const { privacy } = await load('anime');
    expect(renderToStaticMarkup(privacy.default())).not.toContain('data-hub-shares');
  });
});

describe('the account block', () => {
  it('signed out: a sign-in button and nothing of a passport', async () => {
    const html = await renderHome();
    expect(html).toContain(COPY['home.accountTitle']);
    expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"[^>]*>Sign in<\/button>/);
    expect(html).not.toContain(COPY['home.passportTitle']);
    expect(html).not.toContain('href="/passport"');
  });

  it('signed in: the username, the level and the sites joined, and a link to /passport', async () => {
    fake.user = { id: 'u-1' };
    const html = await renderHome();
    const { getLevelInfo } = await import('@/lib/constants');
    expect(html).toContain(COPY['home.passportTitle']);
    expect(html).toContain('@mina');
    expect(html).toContain(`Level ${getLevelInfo(200, 'hub').level}`);
    expect(html).toContain('KpopQuiz, OtakuQuiz');
    expect(html).toMatch(/<a [^>]*href="\/passport"[^>]*>Open your passport/);
    expect(html).not.toContain('>Sign in<');
  });

  it('signed in with no site joined yet', async () => {
    fake.user = { id: 'u-1' };
    fake.memberships = { data: [], error: null };
    expect(await renderHome()).toContain(`<dd>${COPY['home.passportNoSites']}</dd>`);
  });

  it('falls back to the signed out view on any error', async () => {
    const signedOut = await renderHome();
    fake.user = { id: 'u-1' };
    const failures: Array<() => void> = [
      () => { fake.throwOn = 'client'; },
      () => { fake.throwOn = 'auth'; },
      () => { fake.throwOn = 'from'; },
      () => { fake.profile = { data: null, error: { message: 'rls' } }; },
      () => { fake.memberships = { data: null, error: { message: 'no such table' } }; },
    ];
    for (const [i, fail] of failures.entries()) {
      fake.profile = { data: { username: 'mina', xp: 1 }, error: null };
      fake.memberships = { data: MEMBERSHIPS, error: null };
      fake.throwOn = null;
      fail();
      expect(await renderHome(), `failure ${i}`).toBe(signedOut);
    }
  });
});

describe('the metadata', () => {
  it('is indexable, canonical on the network origin, with the title and description of the copy', async () => {
    const { home, registry } = await load();
    const m = home.metadata;
    expect(m.robots).toEqual({ index: true, follow: true });
    expect(m.alternates?.canonical).toBe(`${registry.NETWORK.url}/`);
    expect(m.alternates?.canonical).toBe('https://fanquiz.org/');
    const title = (m.title as { absolute: string }).absolute;
    expect(title).toBe('FanQuiz: one account for the fan quiz sites');
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(m.description).length).toBeGreaterThanOrEqual(120);
    expect(String(m.description).length).toBeLessThanOrEqual(160);
    expect(m.openGraph).toMatchObject({ url: `${registry.NETWORK.url}/`, title, siteName: 'FanQuiz' });
    expect(JSON.stringify(m)).not.toMatch(DASHES);
  });
});
