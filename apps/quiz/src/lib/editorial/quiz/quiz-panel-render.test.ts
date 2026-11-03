// Run O1, lot E1b: the Quizzes panel of /admin/editorial rendered on the server (no database, no network). It proves the panel shows
// what an admin needs to decide (the caps, the batch and its sample, the queue, the dates in UTC) and that the editorial page
// renders exactly its old self when the quiz lane is off (no quiz panel at all).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { drawSample } from './rules';
import { ACCOUNTS, GROUPS, MINA, NOW, draftFor, iso, memoryQuizStore, seedDrafts } from './test-fixtures';

import type { QuizPanel } from './panel';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/admin/editorial' }));
vi.mock('@/components/community/ux-v1/feed-card', () => ({ FeedCard: () => null }));
vi.mock('@/components/community/ux-v1/post-view', () => ({ PostView: () => null }));
vi.mock('@/components/community/ux-v1/viewer', () => ({ P8ViewerProvider: ({ children }: { children: unknown }) => children }));

const groups = GROUPS.map((g) => ({ id: g.id, name: g.name, slug: g.slug, fandom: null, photo: null }));

async function panel(): Promise<QuizPanel> {
  const m = memoryQuizStore();
  await m.createReviewBatch({ label: 'First ten', size: 4, sample_size: 1 });
  await seedDrafts(m, [draftFor(GROUPS[0]!, 1), draftFor(GROUPS[1]!, 2), draftFor(GROUPS[2]!, 3), draftFor(GROUPS[3]!, 4)], 1);
  Object.assign(m.drafts[3]!, { status: 'approved', reviewed_by: MINA, reviewed_at: iso(NOW), scheduled_at: '2026-11-06T13:15:00.000Z' });
  return { drafts: m.drafts, batches: m.batches, stats: { publishedToday: 3, cap: 10, perGroupCap: 1 } };
}

describe('the Quizzes panel', () => {
  it('shows the caps, the day count, the three steps and the queue with its batch', async () => {
    const { QuizAdmin } = await import('@/app/(site)/admin/editorial/quiz-admin');
    const p = await panel();
    const html = renderToStaticMarkup(createElement(QuizAdmin, { panel: p, accounts: ACCOUNTS, groups }));
    expect(html).toContain('Quizzes');
    expect(html).toContain('at most 10 a day and 1 per group a day');
    expect(html).toContain('Published today (UTC): 3 of 10.');
    expect(html).toContain('1. Paste quiz drafts');
    expect(html).toContain('2. Read the sample, then close the review');
    expect(html).toContain('3. Spread the approved quizzes again');
    expect(html).toContain('Queue (3)');
    expect(html).toContain('Approved (1)');
    expect(html).toContain('Close the review');
    expect(html).toContain('First ten');
    expect(html).toContain('4 drafts');
    expect(html).toContain('Spread 1 approved over 7 days');
    // the queue shows the three queued quizzes, not the approved one
    expect(html).toContain('How well do you know aespa era 1?');
    expect(html).not.toContain('How well do you know ITZY era 4?');
  });

  it('the sample of the batch is the seeded draw (a quarter, at least one) and is marked in the queue', async () => {
    const { QuizAdmin } = await import('@/app/(site)/admin/editorial/quiz-admin');
    const p = await panel();
    Object.assign(p.drafts[3]!, { status: 'draft', reviewed_by: null, reviewed_at: null, scheduled_at: null }); // the whole batch is still in the queue
    const sample = drawSample(p.drafts.map((d) => d.id), 1);
    expect(sample).toHaveLength(1);
    const html = renderToStaticMarkup(createElement(QuizAdmin, { panel: p, accounts: ACCOUNTS, groups }));
    expect(html.match(/\(sample\)/g)).toHaveLength(1);
    const row = html.split('<tr data-e1b-draft="').find((r) => r.includes('(sample)'));
    expect(Number(row?.slice(0, row.indexOf('"')))).toBe(sample[0]);
  });

  it('an empty panel says so and has no dash', async () => {
    const { QuizAdmin } = await import('@/app/(site)/admin/editorial/quiz-admin');
    const html = renderToStaticMarkup(createElement(QuizAdmin, { panel: { drafts: [], batches: [], stats: { publishedToday: 0, cap: 10, perGroupCap: 1 } }, accounts: ACCOUNTS, groups }));
    expect(html).toContain('The quiz queue is empty.');
    expect(html).toContain('No batch is waiting for its review.');
    expect(html).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });
});

describe('the editorial page with the lane off', () => {
  it('renders no quiz panel at all: with quiz null or absent the markup is the same', async () => {
    const { EditorialAdminRoot } = await import('@/app/(site)/admin/editorial/editorial-admin');
    const base = { live: true, failed: false, drafts: [], accounts: ACCOUNTS, groups, now: NOW };
    const absent = renderToStaticMarkup(createElement(EditorialAdminRoot, base));
    const off = renderToStaticMarkup(createElement(EditorialAdminRoot, { ...base, quiz: null }));
    expect(off).toBe(absent);
    expect(absent).not.toContain('data-e1b');
    expect(absent).not.toContain('Close the review');
    const on = renderToStaticMarkup(createElement(EditorialAdminRoot, { ...base, quiz: { drafts: [], batches: [], stats: { publishedToday: 0, cap: 10, perGroupCap: 1 } } }));
    expect(on).toContain('data-e1b="quizzes"');
    expect(on.startsWith(absent.slice(0, 200))).toBe(true);
  });
});
