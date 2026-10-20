import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Lot (b), P1: the READY state of the kpop settings page (components/profile/ux-v1/settings.tsx), which a server render never
// reaches because it loads after mount. The parent component's own useState calls (the first 18, in source order) are given
// the values below, effects do not run, and the HTML is compared with the file of __o1_p1_kpop_tree__/ written ONLY from the
// base commit f7366ec (O1_WRITE_TREE=1; the base file was put back for that run). The child components keep their real hooks.

const DIR = fileURLToPath(new URL('./__o1_p1_kpop_tree__/', import.meta.url));
const WRITE = process.env.O1_WRITE_TREE === '1';

const cap = vi.hoisted(() => ({ on: false, i: 0, presets: [] as unknown[] }));

vi.mock('react', async (orig) => {
  const actual = await orig<typeof import('react')>();
  return {
    ...actual,
    useState: (init: unknown) => {
      if (!cap.on) return (actual.useState as (i: unknown) => unknown)(init);
      const i = cap.i++;
      return i < cap.presets.length ? [cap.presets[i], () => undefined] : (actual.useState as (i: unknown) => unknown)(init);
    },
  };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/settings' }));

const ROW = {
  username: 'mingi', display_name: 'mingi', avatar_url: null, avatar_bg: '#E8457A', avatar_text: '#FFFFFF', bio: 'STAY since 2019.', ult_groups: ['stray-kids', 'bts'],
  bias: 'Han', profile_theme: 'default', name_accent: 'pink', name_font: 'default', pinned_badge_id: 'perfect_score', avatar_kind: 'photo', avatar_ref: null,
  xp: 1280, stan_since: 2019, header_url: null,
};
const GROUPS = [{ id: 1, slug: 'bts', name: 'BTS' }, { id: 2, slug: 'stray-kids', name: 'Stray Kids' }];

function render(form: Record<string, unknown>, extra: Record<number, unknown> = {}): Promise<string> {
  return (async () => {
    const { formFromRow } = await import('@/lib/ux-v1/p10/settings-model');
    const { UxSettings } = await import('@/components/profile/ux-v1/settings');
    const base = formFromRow(ROW);
    const presets: unknown[] = [
      'ready', { row: ROW, groups: GROUPS, earned: [{ id: 'perfect_score', name: 'Perfect score' }, { id: 'first_steps', name: 'First steps' }], provider: 'google' },
      base, { ...base, ...form }, {}, {}, true, ['Bang Chan', 'Han'], '', 'same', '', false, null, false, false, false, true, false,
    ];
    for (const [k, v] of Object.entries(extra)) presets[Number(k)] = v;
    cap.on = true;
    cap.i = 0;
    cap.presets = presets;
    try {
      return renderToStaticMarkup(h(UxSettings, {}));
    } finally {
      cap.on = false;
    }
  })();
}

function compare(name: string, got: string): void {
  const file = `${DIR}${name}.html`;
  if (WRITE) { mkdirSync(DIR, { recursive: true }); writeFileSync(file, `${got}\n`); return; }
  const want = readFileSync(file, 'utf8').trimEnd();
  if (got === want) return;
  let at = 0;
  while (at < Math.min(got.length, want.length) && got[at] === want[at]) at += 1;
  const around = (s: string): string => s.slice(Math.max(0, at - 90), at + 110);
  expect({ name, bytes: got.length, firstDifferenceAt: at, around: around(got) }).toEqual({ name, bytes: want.length, firstDifferenceAt: at, around: around(want) });
}

describe('the kpop settings page, ready, keeps its HTML', () => {
  it('nothing changed', async () => {
    const html = await render({});
    expect(html).toContain('Fandom');
    expect(html).toContain('Bias tag');
    compare('settings-ready', html);
  });

  it('with unsaved changes (the save bar) and a taken username', async () => {
    const html = await render({ bio: 'New bio', bias: 'Bang Chan', username: 'taken_name' }, { 9: 'taken', 10: 'Already taken' });
    expect(html).toContain('Unsaved changes');
    compare('settings-dirty', html);
  });
});
