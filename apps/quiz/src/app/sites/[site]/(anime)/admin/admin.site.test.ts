// Run O1 (ADM front): /admin of the anime build. The gate is on the server and the same for every tab: a visitor, and any account that is not
// in ADMIN_USER_IDS, get the 404 of the site before anything is read; an admin gets the tabs, Images first.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({ user: null as { id: string } | null, reads: 0 }));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => { auth.reads += 1; return { data: { user: auth.user } }; } } }),
}));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NEXT_NOT_FOUND'); }, redirect: () => { throw new Error('redirect'); }, usePathname: () => '/admin' }));
vi.mock('@/app/(site)/admin/page', () => ({ default: () => h('div', { 'data-testid': 'dashboard' }, 'dashboard') }));

beforeEach(() => { vi.stubEnv('ADMIN_USER_IDS', 'admin-1, admin-2'); auth.user = null; auth.reads = 0; });
afterEach(() => { vi.unstubAllEnvs(); });

async function open(tab?: string): Promise<string> {
  const { default: Page } = await import('./page');
  const el = await Page({ searchParams: Promise.resolve(tab === undefined ? {} : { tab }) });
  return renderToStaticMarkup(el);
}

describe('/admin on bunnyverse.org/anime', () => {
  it('is a 404 for a visitor who is not signed in, on every tab', async () => {
    for (const tab of [undefined, 'images', 'overview', 'zzz']) await expect(open(tab)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is a 404 for a signed-in account that is not an admin', async () => {
    auth.user = { id: 'user-9' };
    for (const tab of [undefined, 'images', 'overview']) await expect(open(tab)).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('is a 404 when no admin is configured at all', async () => {
    vi.stubEnv('ADMIN_USER_IDS', '');
    auth.user = { id: 'user-9' };
    await expect(open()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('opens an admin on the Images tab first, with the other tab one link away', async () => {
    auth.user = { id: 'admin-2' };
    const out = await open();
    expect(out).toContain('data-testid="images-admin"');
    expect(out).not.toContain('data-testid="dashboard"');
    expect(out).toContain('aria-label="Admin sections"');
    expect(out.indexOf('>Images<')).toBeLessThan(out.indexOf('>Overview<'));
    expect(out).toContain('href="/admin?tab=images"');
    expect(out).toContain('href="/admin?tab=overview"');
    expect(out).toMatch(/aria-current="page"[^>]*>Images</);
  });

  it('shows the dashboard on the Overview tab, and falls back to Images for an unknown tab', async () => {
    auth.user = { id: 'admin-1' };
    expect(await open('overview')).toContain('data-testid="dashboard"');
    expect(await open('nope')).toContain('data-testid="images-admin"');
  });

  it('is never indexed', async () => {
    const { metadata } = await import('./page');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
