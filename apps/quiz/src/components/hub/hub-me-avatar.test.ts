// Owner, 2026-11-10: the signed-in fan's photo on Bunnyverse, as on KpopQuiz and OtakuQuiz (the avatar_url of /api/auth/me, read in the
// browser), with the initial as the fallback: no photo, a photo that fails to load, signed out or still loading. Decorative: alt="".
// The real "fails to load" event is proved in a browser (docs/o1/reports/L1/dlecolors/avatar/, a photo URL answering 404); here the rule.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { MeResponse } from '@/lib/auth/use-me';

const me: { value: MeResponse | null } = { value: null };
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => me.value }));

import { HubMeAvatar, mePhoto } from './hub-me-avatar';

const PHOTO = 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/avatars/fan.webp';
const profile = (avatar_url: string | null): MeResponse => ({ profile: { username: 'mingi', display_name: null, avatar_url, avatar_bg: '#E8457A', avatar_text: '#FFFFFF' } });
const html = (): string => renderToStaticMarkup(createElement(HubMeAvatar, { initial: 'M', size: 34 }));

describe('the signed-in fan\'s photo on the hub', () => {
  it('with a photo: draws it, decorative (alt=""), at the size of the box, never the initial', () => {
    me.value = profile(PHOTO);
    const out = html();
    expect(out).toContain(`<img src="${PHOTO}" alt="" width="34" height="34"`);
    expect(out).toContain('referrerPolicy="no-referrer"');
    expect(out).not.toContain('>M<');
    expect(out).not.toMatch(/^M$/);
  });

  it('without a photo, signed out or still loading: the initial, as today', () => {
    for (const v of [profile(null), profile(''), profile('   '), { profile: null }, null] as const) {
      me.value = v;
      expect(html(), JSON.stringify(v)).toBe('M');
    }
  });

  it('a photo that failed to load gives the initial back, and only that URL is dropped', () => {
    expect(mePhoto(PHOTO, null)).toBe(PHOTO);
    expect(mePhoto(PHOTO, PHOTO)).toBeNull();
    expect(mePhoto('https://cdn.test/new.webp', PHOTO)).toBe('https://cdn.test/new.webp');
  });

  it('draws only an https photo (a stored value is checked at the sink)', () => {
    for (const bad of ['http://x.test/a.png', 'javascript:alert(1)', 'data:image/png;base64,AAAA', '/avatars/a.png']) expect(mePhoto(bad, null), bad).toBeNull();
    me.value = profile('javascript:alert(1)');
    expect(html()).toBe('M');
  });
});
