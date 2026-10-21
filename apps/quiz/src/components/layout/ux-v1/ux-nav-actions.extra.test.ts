// Run O1, lot (c), lane B6: the accountExtra slot of the account menu. Filled, its content sits after Settings and receives
// the menu's close; the Flight shape of the element without the prop is pinned by ux-nav-actions.net.test.ts.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { MeProfile } from '@/lib/auth/use-me';

const PROFILE: MeProfile = { username: 'fan1', display_name: 'Fan One', avatar_url: null, avatar_bg: '#222222', avatar_text: '#ffffff', xp: 1200 };

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => ({ profile: PROFILE }) }));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => () => undefined }));
vi.mock('@/components/ux-v1/toast', () => ({ useUxToast: () => () => undefined }));
vi.mock('@/lib/notifications-store', () => ({ refetchUnread: () => Promise.resolve(), useUnreadCount: () => 0 }));
vi.mock('./ux-search', () => ({ useUxSearch: () => () => undefined }));
vi.mock('./slots', () => ({ BellPanel: () => null }));

describe('AccountBody accountExtra', () => {
  it('renders the slot between Settings and the theme switch, with the close function', async () => {
    const { AccountBody } = await import('./ux-nav-actions');
    let got: unknown;
    const close = (): void => undefined;
    const html = renderToString(h(AccountBody, {
      profile: PROFILE, close, onSignOut: () => undefined,
      accountExtra: (c) => { got = c; return h('p', { id: 'extra' }, 'Your sites'); },
    }));
    expect(got).toBe(close);
    expect(html.indexOf('Settings')).toBeLessThan(html.indexOf('id="extra"'));
    expect(html.indexOf('id="extra"')).toBeLessThan(html.indexOf('mode'));
  });
  it('a slot that renders nothing leaves the menu exactly as without it', async () => {
    const { AccountBody } = await import('./ux-nav-actions');
    const base = { profile: PROFILE, close: () => undefined, onSignOut: () => undefined };
    expect(renderToString(h(AccountBody, { ...base, accountExtra: () => null }))).toBe(renderToString(h(AccountBody, base)));
  });
});
