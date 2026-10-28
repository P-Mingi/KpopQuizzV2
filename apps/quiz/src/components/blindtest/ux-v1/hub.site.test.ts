// Run O1, lane O1: the v11 blindtest hub speaks the genre of its site, offers the kpop theme playlists, the generation
// menu and the language row only on kpop, and keeps the Live band only where the registry has live rooms. kpop renders what
// it rendered before (the files of __o1_kpop_blindtest__/, written once from the base commit a22664c, never from the head:
// a plain run compares), with the V12 flag off and on.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const flags = vi.hoisted(() => ({ v12: false }));
const Slot = (name: string) => (p: { children?: React.ReactNode }) => h('div', { 'data-slot': name }, p.children);

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.v12 }));
vi.mock('./loader', () => ({
  BtBoardLoader: Slot('board'), BtChallengeCardLoader: Slot('challenge'), BtDailyCardLoader: Slot('daily'),
  BtGroupIndexLoader: Slot('group-index'), BtHubControllerLoader: Slot('controller'), BtLiveCountLoader: Slot('live-count'),
  BtRankedFootLoader: Slot('ranked-foot'), BtSetupLoader: Slot('setup'),
}));
vi.mock('@/lib/ux-v1/p6/hub-data', async (orig) => ({ ...(await orig<object>()), hasDbEnv: () => false }));
vi.mock('@/lib/growth/bt-data', () => ({
  getThemeState: async () => ({
    playable: new Set(['kpop-hits-2026', '5th-gen', 'tiktok-viral', 'kpop-legends', '4th-gen-gg', '4th-gen-bg', 'recent-hits', 'kpop-demon-hunters', '4th-gen']),
    counts: { 'kpop-hits-2026': 40, '5th-gen': 55 },
  }),
}));

const FAQ = [{ q: 'A question?', a: 'An answer.' }];
const LD = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] };

async function render(site: 'kpop' | 'anime', v12: boolean): Promise<string> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site !== 'kpop') vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  flags.v12 = v12;
  const { BlindtestHubV11 } = await import('./hub');
  return renderToString(await BlindtestHubV11({ faq: FAQ, faqJsonLd: LD, webAppJsonLd: LD }));
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); flags.v12 = false; });

describe('BlindtestHubV11', () => {
  for (const v12 of [false, true]) {
    it(`kpop, V12 ${v12 ? 'on' : 'off'}: the markup of the base commit`, async () => {
      await expect(await render('kpop', v12)).toMatchFileSnapshot(`./__o1_kpop_blindtest__/hub-v12-${v12 ? 'on' : 'off'}.html`);
    });
    it(`anime, V12 ${v12 ? 'on' : 'off'}: its genre and its word for a song, no kpop theme, no live band, its origin`, async () => {
      const html = await render('anime', v12);
      expect(html).not.toMatch(/K-?pop|kpopquiz|girl groups|boy groups|\b[1-5](st|nd|rd|th) gen|Adivina|Tebak|TikTok/i);
      expect(html).toContain('anime opening');
      expect(html).not.toContain('/live');
      expect(html).not.toContain('/guess-the-kpop-song');
      expect(html).toContain('https://fandomverse.org/anime/');
    });
  }
});
