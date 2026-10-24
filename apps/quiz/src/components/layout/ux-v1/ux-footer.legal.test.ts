// Run O1, lane H1 (brief H1-legal.md): the "Legal notice" link of the footer, beside Privacy. OtakuQuiz and FanQuiz always show it; kpop
// shows it only with NEXT_PUBLIC_NET_PRIVACY on, and with the flag off the markup is the one pinned by ux-footer.site.test.ts.
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
  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: the link is right after Privacy, whatever the flag says`, async () => {
      for (const flag of [null, '0', '1']) {
        const html = await footer(site, flag);
        expect(html, String(flag)).toContain(`${PRIVACY}${LEGAL}`);
        expect(html.match(/href="\/legal"/g), String(flag)).toHaveLength(1);
      }
    });
  }

  it('kpop: flag off or any value but 1 or true: no link, the same markup', async () => {
    const off = await footer('kpop', null);
    expect(off).not.toContain('/legal');
    expect(await footer('kpop', '0')).toBe(off);
    expect(await footer('kpop', 'yes')).toBe(off);
  });

  it('kpop: flag on: the link after Privacy, and only that is added', async () => {
    const on = await footer('kpop', '1');
    const off = await footer('kpop', null);
    expect(on).toContain(`${PRIVACY}${LEGAL}`);
    expect(on.replace(LEGAL, '')).toBe(off);
    expect(await footer('kpop', 'true')).toBe(on);
  });
});
