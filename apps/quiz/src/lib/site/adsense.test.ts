// Launch polish, lane ADS: the AdSense verification of the hub. NEXT_PUBLIC_ADSENSE_PUB_ID is `ca-pub-` and 16 digits; the meta tag takes it as it is,
// /ads.txt takes it without "ca-". Neither depends on any ad flag. A malformed value serves nothing. The hub and kpopquiz.org (2026-11-23). robots.txt lets Google's crawlers in.
import { afterEach, describe, expect, it, vi } from 'vitest';

const ID = 'ca-pub-1234567890123456';
const LINE = 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const ctx = (site: string): { params: Promise<{ site: string }> } => ({ params: Promise.resolve({ site }) });
const req = new Request('http://localhost/ads.txt');

async function build(site: 'kpop' | 'anime' | 'hub'): Promise<void> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
}

describe('the variable', () => {
  it('a well formed id gives the client (meta tag) and the pub (ads.txt), derived one from the other', async () => {
    const { parseAdsenseAccount, adsTxtLine } = await import('./adsense');
    expect(parseAdsenseAccount(ID)).toEqual({ client: ID, pub: 'pub-1234567890123456' });
    expect(parseAdsenseAccount(`  ${ID}\n`)).toEqual({ client: ID, pub: 'pub-1234567890123456' });
    expect(adsTxtLine(parseAdsenseAccount(ID))).toBe(LINE);
  });
  it.each([undefined, null, '', ' ', 'pub-1234567890123456', 'ca-pub-123456789012345', 'ca-pub-12345678901234567', 'ca-pub-12345678901234ab', 'CA-PUB-1234567890123456',
    'ca-pub-1234 567890123456', 'ca-pub-1234567890123456, DIRECT', 'ca-pub-1234567890123456\ngoogle.com', 'ca_pub_1234567890123456', 'ca-pub-'])(
    'malformed %j: nothing is served', async (raw) => {
      const { parseAdsenseAccount, adsTxtBody, adsenseMetaOther } = await import('./adsense');
      expect(parseAdsenseAccount(raw)).toBeNull();
      expect(adsTxtBody(raw)).toBeNull();
      expect(adsenseMetaOther(raw)).toEqual({});
    });
  it('the ads.txt body is the one line with a final newline', async () => {
    const { adsTxtBody, adsenseMetaOther } = await import('./adsense');
    expect(adsTxtBody(ID)).toBe(`${LINE}\n`);
    expect(adsenseMetaOther(ID)).toEqual({ 'google-adsense-account': ID });
  });
});

describe('the verification meta tag, hub only, with no ad flag', () => {
  it('hub: present with a well formed id even while NET_CARDS_ADS and NEXT_PUBLIC_NET_CARDS_ADS are off', async () => {
    await build('hub');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', ID);
    vi.stubEnv('NET_CARDS_ADS', '');
    vi.stubEnv('NEXT_PUBLIC_NET_CARDS_ADS', '');
    const { siteRootMetadata } = await import('./metadata');
    const { SITE } = await import('./registry');
    expect(siteRootMetadata({}, SITE).other).toEqual({ 'google-adsense-account': ID });
  });
  it('hub: no tag when the variable is unset or malformed', async () => {
    await build('hub');
    const { siteRootMetadata } = await import('./metadata');
    const { SITE } = await import('./registry');
    expect(siteRootMetadata({}, SITE).other).toBeUndefined();
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', 'pub-1234567890123456');
    expect(siteRootMetadata({}, SITE).other).toBeUndefined();
  });
  // Integrator, LAUNCH-POLISH-2 E (2026-11-23): kpopquiz.org carries the tag too (this case said "kpop (returned untouched) and anime never").
  it('kpop gets the tag on its own object with a good id (untouched without one); anime never carries it', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', ID);
    const { siteRootMetadata } = await import('./metadata');
    const { REGISTRY } = await import('./registry');
    const kpopRoot = { title: 'x', other: { 'p:domain_verify': 'abc' } };
    expect(siteRootMetadata(kpopRoot, REGISTRY.kpop)).toEqual({ title: 'x', other: { 'p:domain_verify': 'abc', 'google-adsense-account': ID } });
    expect(siteRootMetadata({}, REGISTRY.anime).other).toBeUndefined();
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', 'ca-pub-12');
    expect(siteRootMetadata(kpopRoot, REGISTRY.kpop)).toBe(kpopRoot);
  });
});

describe('/ads.txt', () => {
  const route = () => import('@/app/sites/[site]/ads.txt/route');
  it('hub with a well formed id: 200, the one line, text/plain, with no ad flag on', async () => {
    await build('hub');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', ID);
    vi.stubEnv('NET_CARDS_ADS', '');
    const res = await (await route()).GET(req, ctx('hub'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(await res.text()).toBe(`${LINE}\n`);
  });
  it('hub with the variable unset or malformed: 404', async () => {
    await build('hub');
    expect((await (await route()).GET(req, ctx('hub'))).status).toBe(404);
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', 'ca-pub-12');
    expect((await (await route()).GET(req, ctx('hub'))).status).toBe(404);
  });
  it('another site name, the anime build and the kpop build: 404 even with a good id', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', ID);
    await build('hub');
    expect((await (await route()).GET(req, ctx('anime'))).status).toBe(404);
    await build('anime');
    expect((await (await route()).GET(req, ctx('anime'))).status).toBe(404);
    await build('kpop');
    expect((await (await route()).GET(req, ctx('hub'))).status).toBe(404);
  });
  it('is a per-site root file, rewritten on the hub and known to its router, and absent from the kpop build', async () => {
    const { PER_SITE_ROOT_FILES, rewritesFor } = await import('./routing');
    expect(PER_SITE_ROOT_FILES).toContain('/ads.txt');
    expect(rewritesFor('hub')).toContainEqual({ source: '/ads.txt', destination: '/sites/hub/ads.txt' });
    expect(rewritesFor('kpop')).toEqual([]);
  });
});

describe('robots.txt', () => {
  it('lets Mediapartners-Google (AdSense) and Googlebot in, and never lists them under a disallow of /', async () => {
    const robots = (await import('@/app/robots')).default();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    for (const ua of ['Mediapartners-Google', 'Googlebot']) {
      const r = rules.find((x) => x.userAgent === ua);
      expect(r, ua).toBeDefined();
      expect([r!.allow].flat()).toContain('/');
      expect([r!.disallow ?? []].flat()).not.toContain('/');
    }
    expect([rules.find((x) => x.userAgent === '*')!.disallow].flat()).not.toContain('/');
  });
});
