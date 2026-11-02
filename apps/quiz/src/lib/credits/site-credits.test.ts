// CR-021: "does this site have a credit to show?" asked by the footer, the page and the games' footers. Every read is a stand-in; no network.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  views: {} as Record<string, unknown[] | { error: { code?: string; message: string } }>,
  calls: [] as string[],
  ownerRows: [] as { kind: string; slug: string; license: string }[],
}));

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => ({
    from(view: string) {
      const filters: string[] = [];
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(`${c}=${String(v)}`); return q; },
        in: (c: string, v: unknown[]) => { filters.push(`${c} in ${v.join(',')}`); return q; },
        limit: async () => {
          state.calls.push(`${view}?${filters.join('&')}`);
          const v = state.views[view];
          if (!v) return { data: null, error: { code: '42P01', message: `relation "${view}" does not exist` } };
          if (!Array.isArray(v)) return { data: null, error: v.error };
          return { data: v, error: null };
        },
      };
      return q;
    },
  }),
}));
vi.mock('@/lib/anime/entity-images-read', () => ({ getEntityImageRows: async () => state.ownerRows }));

import { CREDIT_KINDS, siteHasCredits } from './site-credits';

beforeEach(() => { state.views = {}; state.calls = []; state.ownerRows = []; });

describe('siteHasCredits', () => {
  it('kpopquiz.org: an idol or group picture that needs a credit, and nothing else', async () => {
    state.views = { entity_images_public: [{ kind: 'idol' }] };
    expect(await siteHasCredits('kpop')).toBe(true);
    expect(state.calls).toEqual(['entity_images_public?needs_credit=true&kind in idol,group']);
    state.views = { entity_images_public: [] };
    expect(await siteHasCredits('kpop')).toBe(false);
    expect(CREDIT_KINDS.kpop).toEqual(['idol', 'group']);
  });

  it('the hub: a picture or a banner that needs a credit', async () => {
    state.views = { entity_images_public: [], site_assets_public: [{ key: 'banner:kpopdle' }] };
    expect(await siteHasCredits('hub')).toBe(true);
    expect(state.calls).toEqual(['entity_images_public?needs_credit=true', 'site_assets_public?needs_credit=true&type in banner,card_image']);
    state.views = { entity_images_public: [{ kind: 'series' }] };
    state.calls = [];
    expect(await siteHasCredits('hub')).toBe(true);
    expect(state.calls).toHaveLength(1);
    state.views = { entity_images_public: [], site_assets_public: [] };
    expect(await siteHasCredits('hub')).toBe(false);
  });

  it('OtakuQuiz: an upload under CC BY or CC BY-SA, and no other licence', async () => {
    state.ownerRows = [{ kind: 'series', slug: 'a', license: 'cc0' }, { kind: 'character', slug: 'a/b', license: 'public_domain' }];
    expect(await siteHasCredits('anime')).toBe(false);
    state.ownerRows = [...state.ownerRows, { kind: 'character', slug: 'a/c', license: 'cc_by_sa' }];
    expect(await siteHasCredits('anime')).toBe(true);
  });

  it('fails closed: a view that is not there yet, an error, a read that throws', async () => {
    expect(await siteHasCredits('kpop')).toBe(false);
    expect(await siteHasCredits('hub')).toBe(false);
    state.views = { entity_images_public: { error: { code: 'XX000', message: 'boom' } } };
    expect(await siteHasCredits('kpop')).toBe(false);
    state.views = { entity_images_public: { error: { code: 'PGRST205', message: 'Could not find the table' } } };
    expect(await siteHasCredits('kpop')).toBe(false);
  });
});
