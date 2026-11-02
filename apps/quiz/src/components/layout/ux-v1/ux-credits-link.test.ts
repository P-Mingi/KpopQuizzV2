// CR-021: the footer's Credits link asks /api/site-credits once per session, draws only on a clear yes, and fails closed.
import { renderToString } from 'react-dom/server';
import { createElement as h } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: (p: Record<string, unknown>) => h('a', { href: p.href as string }, p.children as string) }));

import { UxCreditsLink, loadShowCredits } from './ux-credits-link';

const memory = (init: Record<string, string> = {}): Pick<Storage, 'getItem' | 'setItem'> & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
};
const answer = (body: unknown, ok = true): typeof fetch => (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe('the Credits link of the footer', () => {
  it('draws nothing on the server, so the served HTML does not depend on it', () => {
    expect(renderToString(h(UxCreditsLink))).toBe('');
  });

  it('asks the API once and keeps the answer for the session', async () => {
    const fetchMock = vi.fn(answer({ show: true }));
    const store = memory();
    expect(await loadShowCredits(fetchMock as unknown as typeof fetch, store, '/anime')).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/anime/api/site-credits', { credentials: 'omit' });
    expect(store.data).toEqual({ 'kpq-site-credits': '1' });
    expect(await loadShowCredits(fetchMock as unknown as typeof fetch, store, '/anime')).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await loadShowCredits(answer({ show: false }), memory(), '')).toBe(false);
  });

  it('fails closed: a refusal, a malformed answer, a network error, blocked storage', async () => {
    expect(await loadShowCredits(answer({ show: true }, false), memory(), '')).toBe(false);
    expect(await loadShowCredits(answer({ show: 'yes' }), memory(), '')).toBe(false);
    expect(await loadShowCredits(answer(null), memory(), '')).toBe(false);
    expect(await loadShowCredits((async () => { throw new Error('offline'); }) as unknown as typeof fetch, memory(), '')).toBe(false);
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(await loadShowCredits(answer({ show: true }), blocked, '')).toBe(true);
    expect(await loadShowCredits(answer({ show: true }), null, '')).toBe(true);
  });
});
