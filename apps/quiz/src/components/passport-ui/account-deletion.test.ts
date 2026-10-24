import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Run O1, lot (e), lane B7 (owner decision of 2026-10-24): the "Delete account" row of kpop Settings. Flag off: the screen keeps today's
// row, today's text (by hand, contact page, 30 days) and today's sheet. Flag on: the row of components/passport-ui/account-deletion
// (loaded with next/dynamic, so a server render shows nothing for it) and no contact-page sheet. The sheet itself needs a browser
// (Sheet renders nothing on the server): e2e/o1/B7/kpop-deletion.o1.ts drives it.

const cap = vi.hoisted(() => ({ on: false, i: 0, presets: [] as unknown[] }));

vi.mock('react', async (orig) => {
  const actual = await orig<typeof import('react')>();
  return {
    ...actual,
    useState: (init: unknown) => {
      if (!cap.on) return (actual.useState as (i: unknown) => unknown)(init);
      const i = cap.i++;
      return i < cap.presets.length ? [cap.presets[i], () => undefined] : (actual.useState as (i: unknown) => unknown)(init);
    },
  };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/settings' }));

afterEach(() => { cap.on = false; vi.unstubAllEnvs(); vi.resetModules(); });

const ROW = {
  username: 'mingi', display_name: 'mingi', avatar_url: null, avatar_bg: '#E8457A', avatar_text: '#FFFFFF', bio: 'STAY since 2019.', ult_groups: ['stray-kids', 'bts'],
  bias: 'Han', profile_theme: 'default', name_accent: 'pink', name_font: 'default', pinned_badge_id: 'perfect_score', avatar_kind: 'photo', avatar_ref: null,
  xp: 1280, stan_since: 2019, header_url: null,
};

async function settings(flag: string | undefined): Promise<string> {
  if (flag !== undefined) vi.stubEnv('NEXT_PUBLIC_NET_DELETION', flag);
  vi.resetModules();
  const { formFromRow } = await import('@/lib/ux-v1/p10/settings-model');
  const { UxSettings } = await import('@/components/profile/ux-v1/settings');
  const base = formFromRow(ROW);
  cap.presets = [
    'ready', { row: ROW, groups: [{ id: 1, slug: 'bts', name: 'BTS' }], earned: [], provider: 'google' },
    base, base, {}, {}, true, ['Han'], '', 'same', '', false, null, false, false, false, true, false,
  ];
  cap.i = 0;
  cap.on = true;
  try {
    return renderToStaticMarkup(h(UxSettings, {}));
  } finally {
    cap.on = false;
  }
}

describe('kpop Settings, Account section', () => {
  it('flag off (unset, 0, empty): today\'s row', async () => {
    for (const flag of [undefined, '0', '']) {
      const html = await settings(flag);
      expect(html, String(flag)).toContain('Delete account');
      expect(html, String(flag)).toContain('Removes your passport. Your published quizzes are deleted with it.');
      expect(html, String(flag)).not.toContain('after 7 days');
    }
  });

  it('flag on: the row is the deletion component\'s (not rendered on the server), not today\'s', async () => {
    const html = await settings('1');
    expect(html).toContain('Sign out');
    expect(html).not.toContain('Removes your passport. Your published quizzes are deleted with it.');
  });
});

async function row(presets: unknown[]): Promise<string> {
  const { AccountDeletion } = await import('./account-deletion');
  cap.presets = presets;
  cap.i = 0;
  cap.on = true;
  try {
    return renderToStaticMarkup(h(AccountDeletion, { username: 'mingi' }));
  } finally {
    cap.on = false;
  }
}

describe('AccountDeletion row', () => {
  it('nothing pending: the Delete action and the 7 days / deleted user hint', async () => {
    const html = await row([]);
    expect(html).toContain('Delete account');
    expect(html).toContain('Removes your passport after 7 days. Your published quizzes stay, credited to a deleted user, unless you ask us to delete them.');
    expect(html).toContain('>Delete</button>');
    expect(html).not.toContain('Cancel deletion');
  });

  it('a deletion pending: the date and the cancel action, no Delete action', async () => {
    const html = await row(['2026-10-31T12:00:00.000Z']);
    expect(html).toContain('Deletion scheduled for 2026-10-31. Cancel before then and nothing is deleted.');
    expect(html).toContain('Cancel deletion');
    expect(html).not.toContain('>Delete</button>');
  });
});
