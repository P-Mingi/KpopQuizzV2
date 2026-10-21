// Run O1, lot (c), lane B6: the account menu and the top bar of kpop must stay what they were. UxNavActions and AccountBody
// got one optional prop (accountExtra, the "Your sites" slot of the network menu); with it absent the markup and the
// Flight shape of the element are the ones of the base commit f4416b4. The files of __o1_kpop_nav__/ are written ONLY from
// that base (O1_WRITE_TREE=1), a plain run compares.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { flightTree } from '@/lib/o1-flight-tree';

import type { MeProfile } from '@/lib/auth/use-me';

const DIR = fileURLToPath(new URL('./__o1_kpop_nav__/', import.meta.url));
const WRITE = process.env.O1_WRITE_TREE === '1';

const PROFILE: MeProfile = {
  username: 'fan1', display_name: 'Fan One', avatar_url: null, avatar_bg: '#222222', avatar_text: '#ffffff', xp: 1200,
  daily_streak: 3, last_daily_date: '2026-10-20',
};

vi.mock('next/image', () => ({ default: (p: Record<string, unknown>) => h('img', { src: p.src as string, alt: p.alt as string }) }));
vi.mock('@/components/ux-v1/use-ux-me', () => ({ useUxMe: () => ({ profile: PROFILE }) }));
vi.mock('@/components/ux-v1/sign-in-sheet', () => ({ useSignIn: () => () => undefined }));
vi.mock('@/components/ux-v1/toast', () => ({ useUxToast: () => () => undefined }));
vi.mock('@/lib/notifications-store', () => ({ refetchUnread: () => Promise.resolve(), useUnreadCount: () => 2 }));
vi.mock('./ux-search', () => ({ useUxSearch: () => () => undefined }));
vi.mock('./slots', () => ({ BellPanel: () => null }));

async function check(name: string, actual: string): Promise<void> {
  const file = `${DIR}${name}`;
  if (WRITE) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, actual);
    return;
  }
  await expect(actual).toMatchFileSnapshot(file);
}

describe('kpop account menu and top bar (no accountExtra)', () => {
  // The streak pill reads the clock (is-risk, hours left): pin it so the snapshot does not depend on the day it is run.
  beforeAll(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-20T12:00:00Z')); });
  afterAll(() => { vi.useRealTimers(); });

  it('AccountBody markup', async () => {
    const { AccountBody } = await import('./ux-nav-actions');
    const html = renderToString(h(AccountBody, { profile: PROFILE, close: () => undefined, onSignOut: () => undefined }));
    await check('account-body.html', html);
  });

  it('UxNavActions markup', async () => {
    const { UxNavActions } = await import('./ux-nav-actions');
    await check('nav-actions.html', renderToString(h(UxNavActions)));
  });

  it('Flight shape of both elements (functions left out)', async () => {
    const { AccountBody, UxNavActions } = await import('./ux-nav-actions');
    const refs = new Map<unknown, string>([[AccountBody, 'AccountBody'], [UxNavActions, 'UxNavActions']]);
    const tree = JSON.stringify([
      await flightTree(h(AccountBody, { profile: PROFILE, close: undefined as unknown as () => void, onSignOut: undefined as unknown as () => void }), { client: refs }),
      await flightTree(h(UxNavActions), { client: refs }),
    ], null, 1);
    await check('flight.json', tree);
  });
});
