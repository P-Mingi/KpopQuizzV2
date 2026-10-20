// Run O1, lot (e) part 2 (E1a): the editorial store reads and writes the build's site. kpop with SITE_SCOPE off: today's
// queries and insert payloads (no site_id anywhere). Anime: every read filtered, every insert carries site_id anime.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

const state = vi.hoisted(() => ({ site: 'kpop' }));

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => { throw new Error('the test passes its own client'); } }));
vi.mock('@/lib/ux-v1/p8/write', () => ({ insertCommunityDebate: async () => ({ id: 1 }) }));

import { supabaseStore } from './store';

import type { RecordingDb } from '@/lib/site/test-recorder';

const DRAFT = { account_id: 'a', kind: 'blog', group_id: 7, title: 'T', body: 'B', options: null, sources: [], debate_days: null, created_by: null, template_key: null } as never;

function store(): { db: RecordingDb; s: ReturnType<typeof supabaseStore> } {
  const db = recordingDb({ editorial_accounts: [], editorial_drafts: { id: 3 }, editorial_posts: { id: 4 } });
  return { db, s: supabaseStore(db as never) };
}

async function everyRead(s: ReturnType<typeof supabaseStore>): Promise<void> {
  await s.accounts();
  await s.listDrafts(10);
  await s.getDraft(1);
  await s.updateDraft(1, { title: 'x' } as never, { status: ['draft'], unclaimed: true });
  await s.approvedDue('2026-10-20T00:00:00Z');
  await s.publishedCount('2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z');
  await s.lastPublishedAccount();
}

describe('supabaseStore', () => {
  beforeEach(() => { delete process.env.SITE_SCOPE; });

  it('kpop with SITE_SCOPE off: no read carries a site and the insert payloads are today\'s', async () => {
    state.site = 'kpop';
    const { db, s } = store();
    await everyRead(s);
    await s.insertDraft({ ...(DRAFT as object), created_by: null, template_key: null } as never);
    await s.insertPost({ draft_id: 3, kind: 'blog', group_id: 7, author: 'a', title: 'T', body: 'B', sources: [] } as never);
    expect(db.queries.length).toBe(9);
    for (const t of ['editorial_accounts', 'editorial_drafts', 'editorial_posts']) expect(db.calls(t, 'eq').some((a) => a[0] === 'site_id')).toBe(false);
    for (const a of [...db.calls('editorial_drafts', 'insert'), ...db.calls('editorial_posts', 'insert')]) expect(Object.keys(a[0] as object)).not.toContain('site_id');
  });

  it('anime: the 7 reads and the update are filtered to anime', async () => {
    state.site = 'anime';
    const { db, s } = store();
    await everyRead(s);
    expect(db.queries.length).toBe(7);
    for (const q of db.queries) expect(q.ops.some(([m, a]) => m === 'eq' && a[0] === 'site_id' && a[1] === 'anime')).toBe(true);
  });

  it('anime: a draft and a post are inserted with site_id anime', async () => {
    state.site = 'anime';
    const { db, s } = store();
    await s.insertDraft({ ...(DRAFT as object), created_by: null, template_key: null } as never);
    await s.insertPost({ draft_id: 3, kind: 'blog', group_id: 7, author: 'a', title: 'T', body: 'B', sources: [] } as never);
    expect((db.calls('editorial_drafts', 'insert')[0]![0] as Record<string, unknown>).site_id).toBe('anime');
    expect((db.calls('editorial_posts', 'insert')[0]![0] as Record<string, unknown>).site_id).toBe('anime');
  });
});
