import { beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  const m = new Map<string, string>();
  vi.stubGlobal('window', { sessionStorage: { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); } } });
});

describe('Analytics beforeSend', () => {
  it('cleans the address of every event', async () => {
    const { beforeSend } = await import('./analytics-filter');
    const r = beforeSend({ type: 'event', url: 'https://kpopquiz.org/q/x?via=k.menu&t=abc&daily=quiz' });
    expect(r?.url).toBe('https://kpopquiz.org/q/x?daily=quiz');
  });
  it('drops the page views of /embed/ and keeps the others', async () => {
    const { beforeSend, isEmbedUrl } = await import('./analytics-filter');
    expect(beforeSend({ type: 'pageview', url: 'https://kpopquiz.org/embed/q/some-quiz' })).toBeNull();
    expect(beforeSend({ type: 'pageview', url: 'https://bunnyverse.org/anime/embed/q/a' })).toBeNull();
    expect(beforeSend({ type: 'pageview', url: 'https://kpopquiz.org/q/some-quiz' })).not.toBeNull();
    expect(isEmbedUrl('https://kpopquiz.org/embedded-things')).toBe(false);
  });
  it('counts the kept page views for the depth bucket', async () => {
    const { beforeSend } = await import('./analytics-filter');
    const a = await import('./analytics');
    for (let i = 0; i < 3; i++) beforeSend({ type: 'pageview', url: 'https://kpopquiz.org/' });
    beforeSend({ type: 'pageview', url: 'https://kpopquiz.org/embed/q/x' });
    expect(a.visitDepth()).toBe('2-3');
  });
});
