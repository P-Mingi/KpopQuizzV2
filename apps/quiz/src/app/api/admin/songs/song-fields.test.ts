// ADMIN-1 review: PUT /api/admin/songs/[id] writes with the service role, so only the columns the POST route inserts go through.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({ updates: [] as Array<Record<string, unknown>>, ids: [] as unknown[] }));

vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: { id: 'admin-1' }, aal: 'aal2' })) }),
  createServiceRoleClient: () => ({
    from: () => ({
      update: (row: Record<string, unknown>) => {
        s.updates.push(row);
        return { eq: (_c: string, id: unknown) => { s.ids.push(id); return { select: () => ({ single: async () => ({ data: { id }, error: null }) }) }; } };
      },
    }),
  }),
}));

import { pickSongFields, SONG_WRITE_FIELDS } from './song-fields';
import { PUT } from './[id]/route';

const put = (body: unknown): Promise<Response> => PUT(
  new NextRequest('http://localhost:3021/api/admin/songs/song-1', { method: 'PUT', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
  { params: Promise.resolve({ id: 'song-1' }) },
);

beforeEach(() => { vi.stubEnv('ADMIN_USER_IDS', 'admin-1'); s.updates = []; s.ids = []; });
afterEach(() => { vi.unstubAllEnvs(); });

describe('PUT /api/admin/songs/[id]', () => {
  it('ignores id, created_at, updated_at and unknown columns; the row of the URL is the one written', async () => {
    const res = await put({ id: 'other-song', created_at: '2000-01-01', updated_at: '2000-01-01', site_id: 'x', is_admin: true, title: 'New title', year: 2020 });
    expect(res.status).toBe(200);
    expect(s.ids).toEqual(['song-1']);
    const { updated_at: stamp, ...rest } = s.updates[0]!;
    expect(rest).toEqual({ title: 'New title', year: 2020 });
    expect(stamp).not.toBe('2000-01-01');
  });

  it('keeps every field the edit form sends, null included', async () => {
    const body = {
      title: 't', artist: 'a', group_id: null, youtube_id: 'y', year: 2021, is_title_track: false, gender: 'mixed', generation: null,
      status: 'active', clip_intro: null, clip_chorus: 1, clip_verse: 2, clip_bridge: 3, wrong_answers: ['x'],
    };
    await put(body);
    const { updated_at: _stamp, ...rest } = s.updates[0]!;
    expect(rest).toEqual(body);
  });

  it.each([[null], [[1]], ['text'], [3]])('refuses a body that is not an object (%j) with a 400 and writes nothing', async (body) => {
    expect((await put(body)).status).toBe(400);
    expect(s.updates).toEqual([]);
  });

  it('pickSongFields reads own fields only', () => {
    expect(pickSongFields(JSON.parse('{"__proto__": {"title": "x"}, "constructor": "y"}') as Record<string, unknown>)).toEqual({});
    expect(SONG_WRITE_FIELDS).not.toContain('id');
  });
});
