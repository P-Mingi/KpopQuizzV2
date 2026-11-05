// ADMIN-2: the pages of the hub admin rendered for a perfect admin behind the door, on the recording stand-in of the database (no network, no
// account). Proven: the three sections and the tools of each, the site carried on every link, the site-scoped reads (explicit site, never the
// build's), the journal page, the escaping of what a user typed, and that an unknown ?site= is never taken as a site.
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

import type { RecordingDb } from '@/lib/site/test-recorder';

const st = vi.hoisted(() => ({ db: null as unknown, headers: {} as Record<string, string> }));
const dbOf = (): RecordingDb => st.db as RecordingDb;

vi.mock('next/headers', () => ({ headers: async () => new Headers(st.headers) }));
vi.mock('next/navigation', () => ({
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
  useRouter: () => ({ refresh: () => undefined }),
}));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => st.db, createServiceRoleClient: () => st.db }));

const DOOR = 'test-door-not-a-secret';
const P = `/${DOOR}`;
const render = async (page: () => Promise<React.ReactElement>): Promise<string> => renderToStaticMarkup(await page());

async function open(): Promise<void> {
  const { adminDoorValue } = await import('@/lib/admin/door');
  st.headers = { 'x-admin-door': (await adminDoorValue())! };
}

beforeEach(async () => {
  vi.stubEnv('ADMIN_PATH', DOOR);
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
  st.db = recordingDb({
    quizzes: [{ id: 'q-1', title: 'Naruto <script>alert(1)</script> quiz', slug: 'naruto-quiz', status: 'published', play_count: 1200, report_count: 2, created_at: '2026-11-01T10:00:00Z' }],
    reports: [{ id: 'r-1', reason: 'Wrong answer <b>bold</b>', created_at: '2026-11-02T10:00:00Z', quizzes: { title: 'Naruto quiz', slug: 'naruto-quiz' } }],
    admin_actions: [{ id: 9, at: '2026-11-03T09:08:07Z', admin_id: '00000000-0000-4000-8000-000000000001', site_id: 'anime', action: 'quiz.remove', target_type: 'quiz', target_id: 'q-1', detail: { cache: 'ok', quiz_ids: ['a', 'b'] }, request_id: null }],
    world_memberships: [],
  });
  await open();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the menu', () => {
  it('shows the three sections, the tools of each, and carries the site on every link', async () => {
    const { default: Page } = await import('./page');
    const html = await render(() => Page({ searchParams: Promise.resolve({ site: 'anime' }) }) as Promise<React.ReactElement>);
    for (const label of ['Bunnyverse', 'KpopQuiz', 'OtakuQuiz']) expect(html).toContain(label);
    expect(html).toContain(`href="${P}/quizzes?site=anime"`);
    expect(html).toContain(`href="${P}/quizzes?site=kpop"`);
    expect(html).toContain(`href="${P}/journal?site=hub"`);
    expect(html).not.toContain(`href="${P}/quizzes?site=hub"`);
    expect(html).toContain(`href="${P}"`);
    expect(html).toContain('aria-current="page"');
  });

  it('opens on the three sections side by side when no site is chosen, and never takes an unknown site for one', async () => {
    const { default: Page } = await import('./page');
    for (const search of [{}, { site: 'evil' }, { site: ['nope', 'kpop'] }, { site: '' }]) {
      const html = await render(() => Page({ searchParams: Promise.resolve(search) }) as Promise<React.ReactElement>);
      expect(html, JSON.stringify(search)).toContain('Pick a site.');
      expect(html).not.toContain('overview</h1>');
    }
  });

  it('reads the numbers of each site with the site named, never the build\'s', async () => {
    const { default: Page } = await import('./page');
    await render(() => Page({ searchParams: Promise.resolve({ site: 'kpop' }) }) as Promise<React.ReactElement>);
    expect(dbOf().scopedTo('quizzes', 'kpop')).toBe(true);
    expect(dbOf().scopedTo('quizzes', 'hub')).toBe(false);
    expect(dbOf().scopedTo('reports', 'kpop')).toBe(true);
    expect(dbOf().calls('world_memberships', 'eq').some((a) => a[0] === 'site_id' && a[1] === 'kpop')).toBe(true);
  });

  it('the hub overview reads members only: it has no quizzes', async () => {
    const { default: Page } = await import('./page');
    const html = await render(() => Page({ searchParams: Promise.resolve({ site: 'hub' }) }) as Promise<React.ReactElement>);
    expect(html).toContain('Bunnyverse overview');
    expect(html).toContain('Members');
    expect(html).not.toContain('Published quizzes');
    expect(dbOf().queries.some((q) => q.table === 'quizzes')).toBe(false);
  });
});

describe('the quizzes of a site', () => {
  it('reads that site\'s quizzes, escapes the title, and gives the buttons the site', async () => {
    const { default: Page } = await import('./quizzes/page');
    const html = await render(() => Page({ searchParams: Promise.resolve({ site: 'anime' }) }) as Promise<React.ReactElement>);
    expect(dbOf().scopedTo('quizzes', 'anime')).toBe(true);
    expect(dbOf().scopedTo('quizzes', 'kpop')).toBe(false);
    expect(html).toContain('OtakuQuiz quizzes');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('href="https://bunnyverse.org/anime/q/naruto-quiz"');
    expect(html).toContain('Remove');
  });

  it('asks to pick a quiz site for the hub and for no site, and reads nothing', async () => {
    const { default: Page } = await import('./quizzes/page');
    for (const search of [{}, { site: 'hub' }, { site: 'evil' }]) {
      st.db = recordingDb({});
      const html = await render(() => Page({ searchParams: Promise.resolve(search) }) as Promise<React.ReactElement>);
      expect(html, JSON.stringify(search)).toContain('Pick KpopQuiz or OtakuQuiz');
      expect(dbOf().queries).toHaveLength(0);
    }
  });

  it('applies the status and the search, and ignores a status it does not know', async () => {
    const { default: Page } = await import('./quizzes/page');
    await render(() => Page({ searchParams: Promise.resolve({ site: 'kpop', status: 'removed', q: 'bts' }) }) as Promise<React.ReactElement>);
    expect(dbOf().calls('quizzes', 'eq')).toContainEqual(['status', 'removed']);
    expect(dbOf().calls('quizzes', 'ilike')[0]).toEqual(['title', '%bts%']);
    st.db = recordingDb({ quizzes: [] });
    await render(() => Page({ searchParams: Promise.resolve({ site: 'kpop', status: 'x; drop table', q: 'a' }) }) as Promise<React.ReactElement>);
    expect(dbOf().calls('quizzes', 'eq').some((a) => a[0] === 'status')).toBe(false);
    expect(dbOf().calls('quizzes', 'ilike')).toEqual([]);
  });
});

describe('the reports of a site', () => {
  it('reads that site\'s pending reports and escapes what a reporter typed', async () => {
    const { default: Page } = await import('./reports/page');
    const html = await render(() => Page({ searchParams: Promise.resolve({ site: 'kpop' }) }) as Promise<React.ReactElement>);
    expect(dbOf().scopedTo('reports', 'kpop')).toBe(true);
    expect(dbOf().calls('reports', 'eq')).toContainEqual(['status', 'pending']);
    expect(html).not.toContain('<b>bold</b>');
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(html).toContain('Dismiss');
  });
});

describe('the journal', () => {
  it('lists the lines read only, newest first, filtered by the chosen site, showing ids and counts, a short admin id and no link to edit', async () => {
    const { default: Page } = await import('./journal/page');
    const html = await render(() => Page({ searchParams: Promise.resolve({ site: 'anime' }) }) as Promise<React.ReactElement>);
    expect(dbOf().calls('admin_actions', 'eq')).toContainEqual(['site_id', 'anime']);
    expect(dbOf().calls('admin_actions', 'limit')[0]).toEqual([200]);
    expect(html).toContain('quiz.remove');
    expect(html).toContain('2026-11-03 09:08:07');
    expect(html).toContain('00000000');
    expect(html).not.toContain('00000000-0000-4000-8000-000000000001');
    expect(html).toContain('quiz_ids=2 items');
    expect(html).not.toContain('<form');
    expect(dbOf().queries.every((q) => q.ops.every(([m]) => ['select', 'order', 'limit', 'eq'].includes(m)))).toBe(true);
  });

  it('reads all sites without a site, and says so when the table is not there yet', async () => {
    const { default: Page } = await import('./journal/page');
    await render(() => Page({ searchParams: Promise.resolve({}) }) as Promise<React.ReactElement>);
    expect(dbOf().calls('admin_actions', 'eq')).toEqual([]);
    st.db = recordingDb({ admin_actions: [] });
    const html = await render(() => Page({ searchParams: Promise.resolve({}) }) as Promise<React.ReactElement>);
    expect(html).toContain('Nothing recorded yet.');
  });
});
