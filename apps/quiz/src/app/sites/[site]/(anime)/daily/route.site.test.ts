// Run O1, lane O1 (lot a, finishing): the anime /daily is kpop's: a redirect to the play of the quiz of the day of THIS site
// (getQuizOfTheDay(SITE.id), the same /q/{slug}?daily=quiz play, result and streak), the catalog when there is none; the hub
// has no daily quiz and answers 404. The quiz of the day is published for 'anime' by ensure_daily_quiz_v2 (lib/daily-quiz.ts).
import { afterEach, describe, expect, it, vi } from 'vitest';

const asked = vi.hoisted(() => ({ sites: [] as unknown[], qotd: { slug: 'one-piece-opening-quiz' } as { slug: string } | null }));
vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizOfTheDay: async (site?: unknown) => { asked.sites.push(site); return asked.qotd; } }));
vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); asked.sites.length = 0; asked.qotd = { slug: 'one-piece-opening-quiz' }; });

async function get(site: 'anime' | 'hub'): Promise<{ status: number; location: string | null }> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const { GET } = await import('./route');
  try {
    const res = await GET();
    return { status: res.status, location: res.headers.get('location') };
  } catch (e) {
    const digest = String((e as { digest?: unknown }).digest ?? '');
    if (digest.startsWith('NEXT_REDIRECT')) return { status: 307, location: digest.split(';')[2] ?? null };
    if (digest.includes('NOT_FOUND') || digest.includes(';404')) return { status: 404, location: null };
    throw e;
  }
}

describe('GET /daily', () => {
  it('anime: asks for the quiz of the day of anime and redirects to its daily play', async () => {
    const r = await get('anime');
    expect(asked.sites).toEqual(['anime']);
    expect(r).toEqual({ status: 307, location: '/q/one-piece-opening-quiz?daily=quiz' });
  });

  it('anime: no quiz of the day sends to the catalog', async () => {
    asked.qotd = null;
    expect(await get('anime')).toEqual({ status: 307, location: '/quizzes' });
  });

  it('hub: 404, nothing is read', async () => {
    expect(await get('hub')).toEqual({ status: 404, location: null });
    expect(asked.sites).toEqual([]);
  });
});
