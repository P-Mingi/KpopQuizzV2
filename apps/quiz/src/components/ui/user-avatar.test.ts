import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { UserAvatar } from './user-avatar';

// next/image throws during render on a host missing from remotePatterns, so one profile
// with such an avatar took /pt/leaderboard down with a 500 (2026-10-13, a share.google link).

const html = (avatarUrl: string | null): string =>
  renderToStaticMarkup(createElement(UserAvatar, { username: 'mina', avatarUrl, bgColor: '#EEEDFE', textColor: '#3C3489', size: 32 }));

describe('UserAvatar', () => {
  it('an avatar on an unregistered host renders the initials, never throws', () => {
    expect(() => html('https://share.google/MGkG5Rft4Yi93m6Wp')).not.toThrow();
    expect(html('https://share.google/MGkG5Rft4Yi93m6Wp')).toContain('MI');
    expect(html('not a url')).toContain('MI');
  });
  it('a registered host still renders the picture', () => {
    expect(html('https://abc.supabase.co/storage/v1/object/public/avatars/a.png')).toContain('<img');
  });
});
