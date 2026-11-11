import { readFileSync } from 'node:fs';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sent: Array<{ name: string; props: Record<string, unknown> }> = [];
vi.mock('@vercel/analytics', () => ({
  track: (name: string, props: Record<string, unknown>) => { sent.push({ name, props }); },
}));

function store() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear() };
}

beforeEach(() => {
  sent.length = 0;
  vi.resetModules();
  const ls = store();
  const ss = store();
  vi.stubGlobal('window', { location: { search: '', pathname: '/q/x', hostname: 'kpopquiz.org' }, localStorage: ls, sessionStorage: ss });
  vi.stubGlobal('localStorage', ls);
  vi.stubGlobal('sessionStorage', ss);
});

const debate = { date: '2026-11-11', question: 'Fansite photos or official photoshoot', sideA: 'Fansite', sideB: 'Official' };
const slot = { signedIn: true, voted: false, debate };
const base = { rand: 0.1, site: 'kpop' as const, slot, votedOnDevice: false, shownThisVisit: false };

describe('decideResultDebate', () => {
  it('shows below one in three, not at or above (boundaries)', async () => {
    const { decideResultDebate, RESULT_DEBATE_ODDS } = await import('./decide');
    expect(RESULT_DEBATE_ODDS).toBe(1 / 3);
    expect(decideResultDebate({ ...base, rand: 0 })).toBe(true);
    expect(decideResultDebate({ ...base, rand: 1 / 3 - 1e-9 })).toBe(true);
    expect(decideResultDebate({ ...base, rand: 1 / 3 })).toBe(false);
    expect(decideResultDebate({ ...base, rand: 0.5 })).toBe(false);
    expect(decideResultDebate({ ...base, rand: 0.999 })).toBe(false);
  });
  it('is about one in three over many draws', async () => {
    const { decideResultDebate } = await import('./decide');
    let shown = 0;
    for (let k = 0; k < 3000; k++) if (decideResultDebate({ ...base, rand: k / 3000 })) shown++;
    expect(shown).toBe(1000);
  });
  it('never twice in a visit: the first shown block marks the visit', async () => {
    const m = await import('./decide');
    const ask = () => m.decideResultDebate({ ...base, shownThisVisit: m.readShownThisVisit() });
    expect(ask()).toBe(true);
    m.markShownThisVisit();
    expect(m.readShownThisVisit()).toBe(true);
    expect(ask()).toBe(false);
  });
  it('never a debate already voted: database answer', async () => {
    const { decideResultDebate } = await import('./decide');
    expect(decideResultDebate({ ...base, slot: { ...slot, voted: true } })).toBe(false);
  });
  it('never a debate already voted: device memory, set by a vote, also by the community surfaces key', async () => {
    const m = await import('./decide');
    expect(m.readVotedOnDevice(debate.date)).toBe(false);
    localStorage.setItem(`kq_debate_${debate.date}`, 'b');
    expect(m.readVotedOnDevice(debate.date)).toBe(true);
    expect(m.decideResultDebate({ ...base, votedOnDevice: m.readVotedOnDevice(debate.date) })).toBe(false);
    expect(m.readVotedOnDevice('2026-11-12')).toBe(false);
  });
  it('blocked storage never breaks it', async () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    vi.stubGlobal('sessionStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    const m = await import('./decide');
    expect(m.readVotedOnDevice('d')).toBe(false);
    expect(m.readShownThisVisit()).toBe(false);
    expect(() => { m.markShownThisVisit(); m.markVotedOnDevice('d', 'a'); }).not.toThrow();
  });
  it('nothing when there is no open debate, no answer yet, or a guest', async () => {
    const { decideResultDebate, RESULT_DEBATE_FOR_GUESTS } = await import('./decide');
    expect(decideResultDebate({ ...base, slot: { signedIn: true, voted: false, debate: null } })).toBe(false);
    expect(decideResultDebate({ ...base, slot: null })).toBe(false);
    expect(RESULT_DEBATE_FOR_GUESTS).toBe(false);
    expect(decideResultDebate({ ...base, slot: { signedIn: false, voted: false, debate } })).toBe(false);
  });
  it('nothing on the anime or hub site, even with a debate in hand', async () => {
    const { decideResultDebate } = await import('./decide');
    expect(decideResultDebate({ ...base, site: 'anime' })).toBe(false);
    expect(decideResultDebate({ ...base, site: 'hub' })).toBe(false);
  });
});

describe('the prefetch', () => {
  it('asks once, reads synchronously, and a failure or odd answer is no debate', async () => {
    const m = await import('./decide');
    expect(m.peekResultDebate()).toBeNull();
    const f = vi.fn(async () => ({ ok: true, json: async () => slot }) as unknown as Response);
    m.prefetchResultDebate('', f as unknown as typeof fetch);
    m.prefetchResultDebate('', f as unknown as typeof fetch);
    expect(f).toHaveBeenCalledTimes(1);
    expect(m.peekResultDebate()).toBeNull(); // not arrived yet: never waited for
    await new Promise((r) => setTimeout(r, 0));
    expect(m.peekResultDebate()).toEqual(slot);
    m.noteResultDebateVoted();
    expect(m.peekResultDebate()?.voted).toBe(true);

    m.resetResultDebatePrefetch();
    m.prefetchResultDebate('', (async () => { throw new Error('net'); }) as unknown as typeof fetch);
    await new Promise((r) => setTimeout(r, 0));
    expect(m.peekResultDebate()).toBeNull();
    expect(m.parseSlot({ signedIn: true, voted: false, debate: { date: 1 } })?.debate).toBeNull();
  });
});

describe('the vote', () => {
  it('posts to the normal debate API, returns the percentages, remembers it, records from=result', async () => {
    const m = await import('./vote');
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const f = (async (url: string, init: RequestInit) => { calls.push({ url, init }); return { ok: true, json: async () => ({ a: 3, b: 1 }) }; }) as unknown as typeof fetch;
    const out = await m.castResultDebateVote('a', debate.date, '', f);
    expect(out).toEqual({ ok: true, side: 'a', pct: [75, 25] });
    // the only call: the normal vote, nothing about score, XP or streak
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('/api/debate/vote');
    expect(calls[0]!.init.method).toBe('POST');
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ side: 'a' });
    expect(localStorage.getItem(`kq_debate_${debate.date}`)).toBe('a');
    expect(sent).toEqual([{ name: 'debate_vote', props: { site: 'kpop', from: 'result' } }]);
  });
  it('a refused or failed vote records nothing and stores nothing', async () => {
    const m = await import('./vote');
    const refuse = (async () => ({ ok: false, json: async () => ({ error: 'not_authenticated' }) })) as unknown as typeof fetch;
    expect(await m.castResultDebateVote('b', debate.date, '', refuse)).toEqual({ ok: false });
    const boom = (async () => { throw new Error('net'); }) as unknown as typeof fetch;
    expect(await m.castResultDebateVote('b', debate.date, '', boom)).toEqual({ ok: false });
    expect(localStorage.getItem(`kq_debate_${debate.date}`)).toBeNull();
    expect(sent).toEqual([]);
  });
  it('the analytics event only takes the from enum', async () => {
    const { buildEvent } = await import('../analytics');
    expect(buildEvent('debate_vote', { from: 'result', site: 'kpop' })).toEqual({ site: 'kpop', from: 'result' });
    expect(buildEvent('debate_vote', { from: 'a-debate-id', site: 'kpop' })).toBeNull();
  });
});

describe('the block at first paint (no layout jump)', () => {
  it('mounts with the question, both sides and the status room already there', async () => {
    const { ResultDebate } = await import('@/components/quiz/ux-v1/result-debate');
    const html = renderToStaticMarkup(createElement(ResultDebate, { debate }));
    expect(html).toContain(debate.question);
    expect(html).toContain('>Fansite<');
    expect(html).toContain('>Official<');
    expect(html).toContain('ux-rdb-pc'); // the split's seat exists before the vote, empty
    expect(html).toContain('data-state="open"');
    expect(html).toContain('ux-rdb-f'); // status line with its reserved height
  });
  it('the stylesheet reserves the final size: option height, no growth of the status line', () => {
    const css = readFileSync(new URL('../../styles/ux-v12/g7.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.ux-rdb-o \{[^}]*min-height: 72px/);
    expect(css).toMatch(/\.ux-rdb-f \{[^}]*min-height: 48px/);
    expect(css).toMatch(/\.ux-rdb-pc \{[^}]*position: absolute/);
  });
});

describe('the result screen wiring', () => {
  const results = readFileSync(new URL('../../components/quiz/ux-v1/results.tsx', import.meta.url), 'utf8');
  it('decides once in a lazy state initializer and renders the block only when decided', () => {
    expect(results).toMatch(/const \[debate\] = useState\(\(\) => \{/);
    expect(results).toContain('{debate ? <ResultDebate debate={debate} /> : null}');
    expect(results).toContain('if (!isUxV12()) return null;');
  });
  it('the block and its vote touch no score, XP, streak or play endpoint', () => {
    for (const f of ['../../components/quiz/ux-v1/result-debate.tsx', './vote.ts', './decide.ts']) {
      const src = readFileSync(new URL(f, import.meta.url), 'utf8');
      expect(src).not.toMatch(/\/api\/(ux-v1\/p4|play|xp|streak|quiz)/);
      expect(src).not.toMatch(/xpEarned|recordGuestDaily|completeDaily|markDailyScore|streakView|guest-streak/);
    }
  });
  it('the prefetch is asked from the run page, signed-in, K-pop, v12 only', () => {
    const run = readFileSync(new URL('../../components/quiz/ux-v1/quiz-run.tsx', import.meta.url), 'utf8');
    expect(run).toContain("if (signedIn === true && SITE.id === 'kpop' && isUxV12()) prefetchResultDebate(BASE_PATH);");
  });
});

describe('GET /api/debate/open', () => {
  function mockDb(opts: { user: boolean; today: boolean; voted: boolean; siteId: string }) {
    vi.doMock('@/lib/site/registry', () => ({ SITE: { id: opts.siteId } }));
    const chain = (data: unknown) => {
      const c: Record<string, unknown> = {};
      c.select = () => c; c.eq = () => c; c.maybeSingle = async () => ({ data });
      return c;
    };
    vi.doMock('@/lib/supabase/server', () => ({
      createServerClient: async () => ({
        auth: { getUser: async () => ({ data: { user: opts.user ? { id: 'u1' } : null } }) },
        from: () => chain(opts.voted ? { side: 'a' } : null),
      }),
      createPublicReadClient: () => ({
        from: (t: string) => chain(t === 'daily_debates' ? (opts.today ? { date: 'd', question_id: 'q' } : null) : { question: ' Q? ', side_a: 'A', side_b: 'B' }),
      }),
    }));
  }
  it('a signed-in kpop fan gets today\'s debate and has-voted', async () => {
    mockDb({ user: true, today: true, voted: false, siteId: 'kpop' });
    const { GET } = await import('@/app/api/debate/open/route');
    const j = await (await GET()).json() as { signedIn: boolean; voted: boolean; debate: { question: string; sideA: string } };
    expect(j.signedIn).toBe(true);
    expect(j.voted).toBe(false);
    expect(j.debate.question).toBe('Q?');
    expect(j.debate.sideA).toBe('A');
  });
  it('voted is true after a vote', async () => {
    mockDb({ user: true, today: true, voted: true, siteId: 'kpop' });
    const { GET } = await import('@/app/api/debate/open/route');
    expect(((await (await GET()).json()) as { voted: boolean }).voted).toBe(true);
  });
  it('no debate today, a guest, or the anime site: debate null', async () => {
    for (const o of [{ user: true, today: false, voted: false, siteId: 'kpop' }, { user: false, today: true, voted: false, siteId: 'kpop' }, { user: true, today: true, voted: false, siteId: 'anime' }]) {
      vi.resetModules();
      mockDb(o);
      const { GET } = await import('@/app/api/debate/open/route');
      expect(((await (await GET()).json()) as { debate: unknown }).debate).toBeNull();
    }
  });
});
