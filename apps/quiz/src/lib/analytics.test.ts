import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: Array<{ name: string; props: Record<string, unknown> }> = [];
vi.mock('@vercel/analytics', () => ({
  track: (name: string, props: Record<string, unknown>) => { sent.push({ name, props }); },
}));

// A tiny browser: window with a location, localStorage and sessionStorage.
function installBrowser(url = 'https://kpopquiz.org/q/some-quiz'): void {
  const mk = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear() };
  };
  const u = new URL(url);
  vi.stubGlobal('window', { location: { search: u.search, pathname: u.pathname, hostname: u.hostname }, localStorage: mk(), sessionStorage: mk() });
  vi.stubGlobal('localStorage', (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage);
  vi.stubGlobal('sessionStorage', (globalThis as unknown as { window: { sessionStorage: unknown } }).window.sessionStorage);
}

beforeEach(() => {
  sent.length = 0;
  vi.resetModules();
  installBrowser();
});

async function load() {
  const a = await import('./analytics');
  const d = await import('./daily-played');
  const g = await import('./guest-streak');
  return { ...a, ...d, ...g };
}

describe('score and bucket helpers', () => {
  it('bands the score', async () => {
    const { scoreBand } = await load();
    expect(scoreBand(0, 10)).toBe('0-39');
    expect(scoreBand(3, 10)).toBe('0-39');
    expect(scoreBand(4, 10)).toBe('40-69');
    expect(scoreBand(7, 10)).toBe('70-99');
    expect(scoreBand(9, 10)).toBe('70-99');
    expect(scoreBand(10, 10)).toBe('100');
    expect(scoreBand(5, 0)).toBeNull();
    expect(scoreBand(Number.NaN, 10)).toBeNull();
  });
  it('buckets streaks and depths', async () => {
    const { streakBucket, depthBucket } = await load();
    expect([0, 1, 2, 3, 6, 7, 40].map(streakBucket)).toEqual(['1', '1', '2', '3-6', '3-6', '7+', '7+']);
    expect([0, 1, 2, 3, 4, 7, 8, 99].map(depthBucket)).toEqual(['1', '1', '2-3', '2-3', '4-7', '4-7', '8+', '8+']);
  });
  it('reads the from enum, direct by default and for any unknown value', async () => {
    const { parseFrom } = await load();
    for (const f of ['home', 'result', 'nav', 'hub', 'share', 'direct']) expect(parseFrom(`?daily=quiz&from=${f}`)).toBe(f);
    expect(parseFrom('?daily=quiz')).toBe('direct');
    expect(parseFrom('?daily=quiz&from=evil-slug')).toBe('direct');
    expect(parseFrom('?from=')).toBe('direct');
  });
  it('derives the quiz mode', async () => {
    const { quizRunMode } = await load();
    expect(quizRunMode({})).toBe('classic');
    expect(quizRunMode({ daily: true })).toBe('daily');
    expect(quizRunMode({ challenge: true, daily: true })).toBe('challenge');
    expect(quizRunMode({ relaxed: true })).toBe('relaxed');
    expect(quizRunMode({ embed: true, daily: true })).toBe('embed');
  });
  it('maps the blind test runs to a family, never a playlist', async () => {
    const { btRunAnalytics } = await load();
    expect(btRunAnalytics('daily', 'all', false)).toEqual({ mode: 'daily', kind: 'bt_daily' });
    expect(btRunAnalytics('challenge', 'blackpink', true)).toEqual({ mode: 'challenge', kind: 'bt_challenge' });
    expect(btRunAnalytics('free', 'ranked', false)).toEqual({ mode: 'ranked', kind: 'bt_ranked' });
    expect(btRunAnalytics('free', 'blackpink', true)).toEqual({ mode: 'classic', kind: 'bt_group' });
    expect(btRunAnalytics('free', 'gg', false)).toEqual({ mode: 'classic', kind: 'bt_mix' });
    expect(btRunAnalytics('free', 'all', false)).toEqual({ mode: 'classic', kind: 'bt_all' });
  });
});

describe('the typed events reject non-enum values', () => {
  it('sends a well formed start and complete', async () => {
    const { analytics } = await load();
    expect(analytics.gameStart({ game: 'quiz', mode: 'classic', kind: 'multiple_choice' })).toBe(true);
    expect(analytics.gameComplete({ game: 'quiz', mode: 'classic', kind: 'multiple_choice', score: 8, max: 10 })).toBe(true);
    expect(sent[0]).toEqual({ name: 'game_start', props: { site: 'kpop', game: 'quiz', mode: 'classic', kind: 'multiple_choice' } });
    expect(sent[1]!.props).toEqual({ site: 'kpop', game: 'quiz', mode: 'classic', kind: 'multiple_choice', score_band: '70-99', depth: '1' });
  });
  it('drops an event with a slug, an id, a username or free text', async () => {
    const { analytics } = await load();
    const bad = (v: string) => v as never;
    expect(analytics.gameStart({ game: 'quiz', mode: 'classic', kind: bad('are-you-a-real-coer') })).toBe(false);
    expect(analytics.gameStart({ game: bad('blackpink'), mode: 'classic', kind: 'multiple_choice' })).toBe(false);
    expect(analytics.gameStart({ game: 'quiz', mode: bad('louis'), kind: 'multiple_choice' })).toBe(false);
    expect(analytics.gameStart({ game: 'quiz', mode: 'daily', kind: 'multiple_choice', from: bad('https://x.test/?u=bob') })).toBe(false);
    expect(analytics.gameStart({ game: 'quiz', mode: 'classic', kind: 'multiple_choice', site: bad('example.com') })).toBe(false);
    expect(analytics.gameComplete({ game: 'quiz', mode: 'classic', kind: 'multiple_choice', score: 3, max: 0 })).toBe(false);
    expect(analytics.shareClick(bad('/q/a-slug'), 'quiz')).toBe(false);
    expect(analytics.shareClick('result', bad('someone'))).toBe(false);
    expect(analytics.signinClick(bad('quiz-id-123'))).toBe(false);
    expect(analytics.crossPromo('quiz', bad('/q/other'))).toBe(false);
    expect(analytics.claimFunnel('refused', 'stats', { reason: bad('free text here') })).toBe(false);
    expect(analytics.claimFunnel('completed', 'stats', { moved: Number.NaN })).toBe(false);
    expect(sent).toEqual([]);
  });
  it('carries from only on a daily play', async () => {
    const { analytics } = await load();
    analytics.gameStart({ game: 'quiz', mode: 'daily', kind: 'true_false', from: 'home' });
    analytics.gameStart({ game: 'quiz', mode: 'classic', kind: 'true_false', from: 'home' });
    expect(sent[0]!.props.from).toBe('home');
    expect(sent[1]!.props.from).toBeUndefined();
  });
  it('every property of every event is an enum string, a boolean or a small number', async () => {
    const { analytics } = await load();
    analytics.gameStart({ game: 'dle', mode: 'daily', kind: 'kpopdle-idol', site: 'hub' });
    analytics.shareClick('fancard');
    analytics.claimFunnel('completed', 'stats', { moved: 3 });
    for (const e of sent) for (const v of Object.values(e.props)) expect(['string', 'boolean', 'number']).toContain(typeof v);
    expect(sent.map((e) => e.name)).toEqual(['game_start', 'share_click', 'claim_funnel']);
    expect(sent[1]!.props).toEqual({ site: 'kpop', surface: 'fancard' });
  });
});

describe('visit depth (P2-3)', () => {
  it('counts the page views of the tab and reports a bucket on game_complete', async () => {
    const { countPageView, analytics } = await load();
    for (let i = 0; i < 5; i++) countPageView();
    analytics.gameComplete({ game: 'quiz', mode: 'classic', kind: 'image', score: 10, max: 10 });
    expect(sent[0]!.props.depth).toBe('4-7');
    expect(sent[0]!.props.score_band).toBe('100');
  });
});

// The callers' sequence for a daily: recordGuestDaily(), then completeDaily() (which marks the day played).
function stubFetch(answer: unknown | 'fail'): void {
  vi.stubGlobal('fetch', async () => {
    if (answer === 'fail') throw new Error('offline');
    return { ok: true, json: async () => answer };
  });
}

describe('daily_complete: once per game per UTC day per browser', () => {
  it('a guest: daily quiz then daily blind test gives 2 events, a replay gives 0', async () => {
    const { completeDaily, recordGuestDaily } = await load();
    stubFetch({ signed_in: false, awarded: 0, base: 0, milestone: 0, streak: 0, already_today: false });
    recordGuestDaily();
    await completeDaily('quiz');
    recordGuestDaily();
    await completeDaily('blindtest');
    expect(sent.map((e) => [e.name, e.props.game, e.props.signed_in])).toEqual([['daily_complete', 'quiz', false], ['daily_complete', 'blindtest', false]]);
    // replays
    recordGuestDaily();
    await completeDaily('quiz');
    await completeDaily('blindtest');
    expect(sent).toHaveLength(2);
  });
  it('a member: the server idempotence across kinds does not hide the blind test', async () => {
    const { completeDaily, recordGuestDaily } = await load();
    const first = { signed_in: true, awarded: 10, base: 10, milestone: 0, streak: 8, already_today: false };
    stubFetch(first);
    recordGuestDaily();
    await completeDaily('quiz');
    stubFetch({ ...first, awarded: 0, already_today: true });
    await completeDaily('blindtest');
    await completeDaily('blindtest');
    expect(sent.map((e) => [e.props.game, e.props.signed_in, e.props.streak_bucket])).toEqual([['quiz', true, '7+'], ['blindtest', true, '7+']]);
  });
  it('fires when the request fails, with the local streak', async () => {
    const { completeDaily, recordGuestDaily } = await load();
    stubFetch('fail');
    recordGuestDaily();
    expect(await completeDaily('quiz', { signedIn: true })).toBeNull();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.props).toMatchObject({ game: 'quiz', signed_in: true, streak_bucket: '1' });
  });
  it('a caller that marked the day before (the blind test hook) passes first computed earlier', async () => {
    const { completeDaily, hasPlayedDaily, markDailyPlayed } = await load();
    stubFetch({ signed_in: false, awarded: 0, base: 0, milestone: 0, streak: 0, already_today: false });
    const first = !hasPlayedDaily('blindtest');
    markDailyPlayed('blindtest');
    await completeDaily('blindtest', { first });
    expect(sent).toHaveLength(1);
    // without the early read, the mark would hide the event
    const later = await load();
    expect(later.hasPlayedDaily('blindtest')).toBe(true);
  });
  it('reads from the link', async () => {
    installBrowser('https://kpopquiz.org/q/x?daily=quiz&from=result');
    const { completeDaily } = await load();
    stubFetch({ signed_in: false, awarded: 0, base: 0, milestone: 0, streak: 0, already_today: false });
    await completeDaily('quiz');
    expect(sent[0]!.props.from).toBe('result');
  });
});
