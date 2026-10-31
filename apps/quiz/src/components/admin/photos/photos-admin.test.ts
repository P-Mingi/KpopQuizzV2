// Daily games step 2: the Photos tab of the admin of bunnyverse.org/anime (board Admin.dc.html). Behind the gate of the anime admin; the
// board's tabs, filters, columns and words; the honest sentence of a table that is not there; no fake row.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminRow, PhotosAdminData } from '@/lib/photos/admin-data';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, loads: 0, data: null as unknown }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }),
  createServiceRoleClient: () => ({}),
}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); }, redirect: () => { throw new Error('redirect'); }, usePathname: () => '/admin', useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/app/(site)/admin/page', () => ({ default: () => h('div', { 'data-testid': 'dashboard' }, 'dashboard') }));
// next/font only runs inside the Next compiler: the font module is replaced by the one field the tab reads.
vi.mock('@/components/hub/home/home-font', () => ({ dmSans: { variable: 'f-sans' }, dmMono: { variable: 'f-mono' } }));
vi.mock('@/lib/photos/admin-data', async (orig) => ({ ...(await orig<typeof import('@/lib/photos/admin-data')>()), loadPhotosAdmin: async () => { auth.loads += 1; return auth.data; } }));

import { blockedOf, filterRows, flagOf, pictureState } from './photos-admin';

const row = (over: Partial<AdminRow>): AdminRow => ({ kind: 'idol', slug: '1', name: 'Soojin', context: '(G)I-DLE', legacy: null, review: true, fresh: false, image: null, ...over });
const img = { url: 'https://s/a.webp', thumbUrl: 'https://s/a-96.webp', focalX: 50, focalY: 40, sourceUrl: 'https://commons.wikimedia.org/a', author: 'A', license: 'cc_by', licenseNote: null, verified: false };

function data(over: Partial<PhotosAdminData> = {}): PhotosAdminData {
  return {
    schema: { entityImages: '022', agencies: true, siteAssets: true, anime: true },
    rows: {
      idols: [row({ slug: '1' }), row({ slug: '2', name: 'CL', context: '2NE1' }), row({ slug: '3', name: 'RM', context: 'BTS', review: false, legacy: { url: '/idols/RM BTS.jpg', sourceUrl: null, author: null } })],
      groups: [row({ kind: 'group', slug: '7', name: 'NCT WISH', context: 'SM Entertainment', review: false })],
      labels: [row({ kind: 'agency', slug: '9', name: 'JYP Entertainment', context: 'TWICE, Stray Kids', review: false, fresh: true })],
      chars: [], series: [],
    },
    assets: [], agencies: [],
    ...over,
  };
}

beforeEach(() => { vi.stubEnv('ADMIN_USER_IDS', 'admin-1'); auth.user = null; auth.loads = 0; auth.data = data(); });
afterEach(() => { vi.unstubAllEnvs(); });

async function open(params: Record<string, string> = { tab: 'photos' }): Promise<string> {
  const { default: Page } = await import('@/app/sites/[site]/(anime)/admin/page');
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) }));
}

describe('the rules of the photo tabs', () => {
  it('sorts a record into the board filters and flags', () => {
    expect(pictureState(row({}))).toBe('none');
    expect(pictureState(row({ legacy: { url: '/x.jpg', sourceUrl: null, author: null } }))).toBe('tocheck');
    expect(pictureState(row({ image: img }))).toBe('tocheck');
    expect(pictureState(row({ image: { ...img, verified: true } }))).toBe('ok');
    expect(flagOf(row({}))).toEqual({ text: 'À relire', review: true });
    expect(flagOf(row({ review: false }))).toEqual({ text: 'Sans photo', review: false });
    expect(flagOf(row({ kind: 'agency', review: false, fresh: true }))).toEqual({ text: 'Nouvelle fiche', review: false });
    expect(flagOf(row({ image: img }))).toEqual({ text: 'Licence à préciser', review: true });
    expect(flagOf(row({ image: { ...img, verified: true } }))).toEqual({ text: 'Licence vérifiée', review: false });
    const rows = data().rows.idols;
    expect(filterRows(rows, 'none', '').map((r) => r.name)).toEqual(['Soojin', 'CL']);
    expect(filterRows(rows, 'tocheck', '').map((r) => r.name)).toEqual(['RM']);
    expect(filterRows(rows, 'all', '2ne1').map((r) => r.name)).toEqual(['CL']);
  });

  it('says which migration a save waits for, and nothing once it is there', () => {
    expect(blockedOf('idols', data())).toBeNull();
    expect(blockedOf('banners', data())).toBeNull();
    expect(blockedOf('idols', data({ schema: { entityImages: '018', agencies: false, siteAssets: false, anime: true } }))).toMatch(/019 et 022/);
    expect(blockedOf('stickers', data({ schema: { entityImages: '018', agencies: false, siteAssets: false, anime: true } }))).toMatch(/migration 022/);
    expect(blockedOf('idols', data({ schema: { entityImages: 'missing', agencies: false, siteAssets: false, anime: false } }))).toMatch(/migration 018/);
  });
});

describe('/admin?tab=photos on bunnyverse.org/anime', () => {
  it('is the 404 of the site for a visitor and for a signed-in non-admin, before anything is read', async () => {
    await expect(open()).rejects.toThrow('NEXT_NOT_FOUND');
    auth.user = { id: 'user-9' };
    await expect(open()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(auth.loads).toBe(0);
  });

  it('opens the board for an admin: its header, one h1, the eight tabs, the filters, the table, the drawer', async () => {
    auth.user = { id: 'admin-1' };
    const html = await open();
    expect(html).toContain('data-testid="photos-admin"');
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('Photos à compléter');
    for (const t of ['Idols', 'Groupes', 'Agences', 'Personnages anime', 'Séries anime', 'Bannières et images', 'Icônes du jeu', 'Stickers']) expect(html).toContain(`>${t} <`);
    for (const f of ['Sans photo', 'Licence à préciser', 'Toutes']) expect(html).toContain(`>${f}</button>`);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('>Soojin</td>');
    expect(html).toContain('>À relire</span>');
    expect(html).not.toContain('>RM</td>'); // the "Sans photo" filter first, as the board
    expect(html).toContain('2 sur 2 idols sans photo. Toutes ces fiches sont aussi à relire.');
    expect(html).toContain('Ajouter une photo');
    expect(html).toContain('J&#x27;ai vérifié que cette licence autorise l&#x27;usage sur le site, avec le crédit affiché.');
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(auth.loads).toBe(1);
  });

  it('opens a deep-linked tab, and draws no row for a table that is not there', async () => {
    auth.user = { id: 'admin-1' };
    auth.data = data({ schema: { entityImages: '018', agencies: false, siteAssets: false, anime: false } });
    const chars = await open({ tab: 'photos', kind: 'chars' });
    expect(chars).toContain('Les personnages arrivent avec la migration 011.');
    expect(chars).not.toContain('<table');
    const banners = await open({ tab: 'photos', kind: 'banners' });
    expect(banners).toContain('Bannières et images');
    expect(banners).toContain('La table site_assets arrive avec la migration 022');
    expect(banners).toContain('Aucune image');
    expect(banners).toContain('Reprend Otakudle');
    const icons = await open({ tab: 'photos', kind: 'icons' });
    expect(icons).toContain('Kpopdle, étapes');
    expect(icons).toContain('En cours');
    const stickers = await open({ tab: 'photos', kind: 'stickers' });
    expect(stickers).toContain('Ajouter un sticker PNG');
    expect(stickers).toContain('Les stickers restent dans les espaces vides et se cachent sous 1 240 px de large');
  });

  it('keeps the other tabs as they were', async () => {
    auth.user = { id: 'admin-1' };
    expect(await open({})).toContain('data-testid="images-admin"');
    expect(await open({ tab: 'overview' })).toContain('data-testid="dashboard"');
    expect(auth.loads).toBe(0);
  });
});
