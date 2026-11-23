// Integrator, lot LAUNCH-POLISH-2 E (2026-11-23): kpopquiz.org ready for AdSense, no ad shown. With NEXT_PUBLIC_ADSENSE_PUB_ID set on the kpopquiz
// project it serves the meta tag and /ads.txt from the hub's code; robots.txt lets Mediapartners-Google in; /privacy has the hub's Advertising
// section; no ad slot anywhere on the kpop build.
import { readdirSync, readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const ID = 'ca-pub-1234567890123456';
const LINE = 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function build(site: 'kpop' | 'anime' | 'hub'): Promise<void> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
}

describe('kpopquiz.org /ads.txt', () => {
  const route = () => import('@/app/ads.txt/route');
  it('kpop with a good id: 200, the hub\'s line, text/plain', async () => {
    await build('kpop');
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', ID);
    const res = await (await route()).GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    expect(await res.text()).toBe(`${LINE}\n`);
  });
  it('kpop unset or malformed: 404; the anime and hub builds: 404 from this handler (theirs is rewritten)', async () => {
    await build('kpop');
    expect((await (await route()).GET()).status).toBe(404);
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', 'pub-1234567890123456');
    expect((await (await route()).GET()).status).toBe(404);
    for (const site of ['anime', 'hub'] as const) {
      await build(site);
      vi.stubEnv('NEXT_PUBLIC_ADSENSE_PUB_ID', ID);
      expect((await (await route()).GET()).status, site).toBe(404);
    }
  });
  it('the same code as the hub: both handlers read adsTxtBody of lib/site/adsense.ts', () => {
    for (const f of ['../../app/ads.txt/route.ts', '../../app/sites/[site]/ads.txt/route.ts']) {
      expect(readFileSync(new URL(f, import.meta.url), 'utf8'), f).toContain("import { adsTxtBody } from '@/lib/site/adsense';");
    }
  });
});

describe('kpopquiz.org robots.txt', () => {
  it('lets Mediapartners-Google in', async () => {
    await build('kpop');
    const robots = (await import('@/app/robots')).default();
    const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
    const r = rules.find((x) => x.userAgent === 'Mediapartners-Google');
    expect(r).toBeDefined();
    expect([r!.allow].flat()).toContain('/');
    expect([r!.disallow ?? []].flat()).not.toContain('/');
  });
});

describe('kpopquiz.org /privacy', () => {
  it('has the Advertising section, its shared sentences equal to the hub\'s, AdSense among the services, no "no advertising"', async () => {
    await build('kpop');
    const { COPY } = (await import('@/copy/hub/h1')) as { COPY: Record<string, string> };
    const { KPOP_ADS_PRIVACY } = await import('@/lib/privacy/kpop-ads-privacy');
    for (const k of ['p2', 'p4', 'p5', 'p6'] as const) expect(KPOP_ADS_PRIVACY[k], k).toBe(COPY[`privacy.ads.${k}`]);
    // p3: the hub's two sentences on the consent tool, then the end without the KpopCards ad button.
    expect(COPY['privacy.ads.p3']!.startsWith(KPOP_ADS_PRIVACY.p3.replace(' If you refuse, no ad is requested.', ''))).toBe(true);
    const Page = (await import('@/app/(site)/privacy/page')).default;
    const html = renderToStaticMarkup(createElement(Page));
    expect(html).toContain('>Advertising</h2>');
    expect(html).toContain('Google AdSense - ads, once they run');
    for (const p of Object.values(KPOP_ADS_PRIVACY)) expect(html).toContain(p.replace(/'/g, '&#x27;'));
    expect(html).not.toMatch(/no advertising/i);
    expect(html).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`));
  });
});

describe('no ad slot on kpopquiz.org', () => {
  it('no kpop page or component loads the ad script or draws an ad unit', () => {
    const root = new URL('../../', import.meta.url);
    const walk = (dir: URL): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(new URL(`${e.name}/`, dir)) : /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [new URL(e.name, dir).pathname] : []));
    const files = [...walk(new URL('app/(site)/', root)), ...walk(new URL('components/home/', root))];
    expect(files.length).toBeGreaterThan(10);
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/pagead2\.googlesyndication|adsbygoogle/);
  });
});
