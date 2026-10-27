// Run O1, lane H1 (brief H1-legal.md): the "Legal notice" link of the footer, beside Privacy. Fusion A5 (main wins for kpop): main
// shows it on kpopquiz.org, so all three sites show it whatever NEXT_PUBLIC_NET_PRIVACY says.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/quizzes' }));

async function footer(site: 'kpop' | 'anime' | 'hub', flag: string | null): Promise<string> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  if (flag !== null) vi.stubEnv('NEXT_PUBLIC_NET_PRIVACY', flag);
  const { UxFooter } = await import('./ux-footer');
  return renderToString(h(UxFooter, { showFandoms: true, year: 2026 }));
}

const LEGAL = '<a href="/legal">Legal notice</a>';
const PRIVACY = '<a href="/privacy">Privacy</a>';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('UxFooter legal notice link', () => {
  for (const site of ['kpop', 'anime', 'hub'] as const) {
    it(`${site}: the link is right after Privacy, whatever the flag says`, async () => {
      const off = await footer(site, null);
      for (const flag of [null, '0', '1', 'true']) {
        const html = await footer(site, flag);
        expect(html, String(flag)).toContain(`${PRIVACY}${LEGAL}`);
        expect(html.match(/href="\/legal"/g), String(flag)).toHaveLength(1);
        expect(html, String(flag)).toBe(off);
      }
    });
  }
});
