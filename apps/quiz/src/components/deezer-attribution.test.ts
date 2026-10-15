import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DEEZER_LINES, DEEZER_LOGO_SRC, DeezerAttribution } from './deezer-attribution';

// Mission U part B (docs/legal/DEEZER-CHECK-2026-10.md): every screen that plays a Deezer
// preview shows the Deezer attribution next to its player. These tests pin the line itself
// (text, accessible name, the clean render while the logo file is absent) and the wiring
// on each player, so a refactor of a game screen cannot drop it silently.

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

describe('DeezerAttribution', () => {
  it('private variant (default): the usage line, in English, on the base class plus the surface class', () => {
    const html = renderToStaticMarkup(h(DeezerAttribution, { className: 'p6-dz' }));
    expect(html).toContain('Song previews by Deezer, for private, personal listening only.');
    expect(html).toMatch(/^<p class="dz-attr p6-dz" lang="en" data-deezer-attribution="private">/);
  });

  it('live variant: the host screen line', () => {
    const html = renderToStaticMarkup(h(DeezerAttribution, { variant: 'live' }));
    expect(html).toContain('Song previews by Deezer. Not for public or commercial events.');
    expect(html).toMatch(/^<p class="dz-attr" lang="en" data-deezer-attribution="live">/);
  });

  it('server markup has no <img>: the logo is created on the client only, so a missing file never shows a broken image', () => {
    for (const variant of ['private', 'live'] as const) {
      const html = renderToStaticMarkup(h(DeezerAttribution, { variant }));
      expect(html).not.toContain('<img');
      expect(html).toContain('Deezer');
    }
  });

  it('the logo points at the asset the owner adds, with "Deezer" as its accessible name', () => {
    expect(DEEZER_LOGO_SRC).toBe('/brand/deezer-logo.svg');
    const src = read('./deezer-attribution.tsx');
    expect(src).toMatch(/<img src=\{DEEZER_LOGO_SRC\} alt="Deezer"/);
    expect(src).toMatch(/onError=\{\(\) => setLogoFailed\(true\)\}/);
  });

  it('no em dash or en dash in the lines', () => {
    const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
    for (const line of Object.values(DEEZER_LINES)) expect(line).not.toMatch(dashes);
  });
});

describe('every Deezer preview player renders the attribution', () => {
  const PLAYERS: Array<[string, RegExp]> = [
    // v11/v12 blindtest game: hub (daily, playlists, challenge links), modes, themes, groups, landings, ranked.
    ['./blindtest/ux-v1/game.tsx', /<DeezerAttribution className="p6-dz" \/>/],
    // v11/v12 results: the per-song preview buttons under "Your songs".
    ['./blindtest/ux-v1/results.tsx', /<DeezerAttribution className="p6-dz" \/>/],
    // Flag-off /blindtest and /pt/blindtest game.
    ['./blind-test/blindtest-game.tsx', /<DeezerAttribution className="bt-dz" \/>/],
    // Flag-off /blindtest/<mode> player.
    ['./blind-test/blind-test-player.tsx', /<DeezerAttribution className="[^"]+" \/>/],
    // Live room host screen: the one screen a group listens to.
    ['./live/stage.tsx', /<DeezerAttribution variant="live" className="ux-live-dz" \/>/],
  ];
  for (const [file, re] of PLAYERS) {
    it(file, () => {
      const src = read(file);
      expect(src).toMatch(/import \{ DeezerAttribution \} from '@\/components\/deezer-attribution';/);
      expect(src).toMatch(re);
    });
  }
});
