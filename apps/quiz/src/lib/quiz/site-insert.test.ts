// Run O1, lot (e) part 2 (E1a): the quiz insert of a build that is not kpop, and the spoiler level of a quiz.
import { describe, expect, it } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

import { insertQuizForSite, spoilerColumnsFor } from './site-insert';

import type { RecordedQuery } from '@/lib/site/test-recorder';

const PAYLOAD = {
  creator_id: 'u1', group_id: 7, title: 'A title', slug: 'a-title', quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en',
  questions: [{ question: 'q', spoiler: { arc: 4, scope: 'anime' } }], settings: {}, question_count: 1, cover_image_url: null,
};

describe('spoilerColumnsFor', () => {
  it('is spoiler-free without a tag above 0 and reads no arcs', async () => {
    const db = recordingDb();
    expect(await spoilerColumnsFor(db, 7, [{ question: 'q' }, { question: 'r', spoiler: { arc: 0, scope: 'both' } }])).toEqual({ spoiler_arc_ord: 0, spoiler_scope: null });
    expect(db.queries).toHaveLength(0);
  });

  it('takes the highest tagged arc and the scope of the tags', async () => {
    const db = recordingDb({ arcs: [] });
    expect(await spoilerColumnsFor(db, 7, [{ spoiler: { arc: 2, scope: 'anime' } }, { spoiler: { arc: 5, scope: 'anime' } }])).toEqual({ spoiler_arc_ord: 5, spoiler_scope: 'anime' });
    expect(db.calls('arcs', 'eq')).toContainEqual(['group_id', 7]);
  });

  it('counts a tag in a manga-only arc of the series as manga', async () => {
    const db = recordingDb({ arcs: [{ ord: 5 }] });
    expect(await spoilerColumnsFor(db, 7, [{ spoiler: { arc: 5, scope: 'both' } }])).toEqual({ spoiler_arc_ord: 5, spoiler_scope: 'manga' });
  });

  it('keeps going when the arcs read fails', async () => {
    const db = { from: () => { throw new Error('no table'); } };
    expect(await spoilerColumnsFor(db, 7, [{ spoiler: { arc: 5, scope: 'anime' } }])).toEqual({ spoiler_arc_ord: 5, spoiler_scope: 'anime' });
  });
});

describe('insertQuizForSite', () => {
  it('inserts the row with the site and the level and returns id and slug', async () => {
    const db = recordingDb({ arcs: [], quizzes: (r: RecordedQuery) => (r.ops.some(([m]) => m === 'insert') ? { id: 'q1', slug: 'a-title' } : null) });
    const out = await insertQuizForSite(db, 'anime', PAYLOAD);
    expect(out).toEqual({ data: { id: 'q1', slug: 'a-title' }, error: null });
    expect(db.calls('quizzes', 'insert')[0]![0]).toMatchObject({ ...PAYLOAD, site_id: 'anime', spoiler_arc_ord: 4, spoiler_scope: 'anime' });
  });
});
