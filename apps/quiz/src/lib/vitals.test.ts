import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseVital, templateOf, webVitalsOn } from './vitals';

describe('vitals beacon', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is off unless the flag is 1 or true', () => {
    expect(webVitalsOn()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_WEB_VITALS', '0');
    expect(webVitalsOn()).toBe(false);
    vi.stubEnv('NEXT_PUBLIC_WEB_VITALS', '1');
    expect(webVitalsOn()).toBe(true);
  });

  it('turns a pathname into a template enum and never keeps a slug', () => {
    expect(templateOf('/')).toBe('home');
    expect(templateOf('/fr')).toBe('home');
    expect(templateOf('/q/are-you-a-real-coer')).toBe('quiz');
    expect(templateOf('/g/blackpink')).toBe('group');
    expect(templateOf('/quizzes')).toBe('browse');
    expect(templateOf('/blindtest')).toBe('blindtest');
    expect(templateOf('/daily')).toBe('daily');
    expect(templateOf('/embed/q/some-slug')).toBe('embed');
    expect(templateOf('/profile/somebody')).toBe('other');
  });

  it('accepts a well formed sample and rounds it', () => {
    expect(parseVital({ metric: 'LCP', rating: 'good', template: 'quiz', device: 'mobile', value: 1834.6 }))
      .toEqual({ metric: 'LCP', rating: 'good', template: 'quiz', device: 'mobile', value: 1835 });
  });

  it('rejects a value outside its enum or a bad number', () => {
    const ok = { metric: 'INP', rating: 'poor', template: 'home', device: 'desktop', value: 300 };
    expect(parseVital(ok)).not.toBeNull();
    expect(parseVital({ ...ok, template: '/q/are-you-a-real-coer' })).toBeNull();
    expect(parseVital({ ...ok, metric: 'FID' })).toBeNull();
    expect(parseVital({ ...ok, device: 'iPhone 15 Safari' })).toBeNull();
    expect(parseVital({ ...ok, value: -1 })).toBeNull();
    expect(parseVital({ ...ok, value: Number.NaN })).toBeNull();
    expect(parseVital({ ...ok, value: '300' })).toBeNull();
    expect(parseVital(null)).toBeNull();
    expect(parseVital('x')).toBeNull();
  });
});
