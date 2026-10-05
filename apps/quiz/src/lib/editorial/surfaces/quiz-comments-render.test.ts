// V12 F5a: the author of a quiz comment or reply (components/quiz/ux-v1/comments.tsx,
// the REAL P4CommentAvatar and P4CommentName the list renders for every comment and
// reply). An editorial account gets the team avatar and the Team pill, no fan flair
// (accent, font, bias) and no level; with the v12 flag off the same props render
// byte for byte like v11. Which usernames are editorial comes from the shared
// useTeamUsernames hook (GET /api/ux-v1/p11/team), which sends no request at all
// with the flag off.

import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/q/x' }));

async function render(v12: boolean, team: boolean): Promise<string> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  const { P4CommentAvatar, P4CommentName } = await import('@/components/quiz/ux-v1/comments');
  return renderToStaticMarkup(createElement(Fragment, null,
    createElement(P4CommentAvatar, { username: 'kpophistory', src: 'https://example.com/a.png', team }),
    createElement(P4CommentName, { username: 'kpophistory', accent: 'pink', font: 'serif', bias: 'Jungkook', team }),
  ));
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('quiz comment and reply author (F5a)', () => {
  it('flag on, editorial account: team avatar, Team pill, no photo, no bias tag, no level', async () => {
    const html = await render(true, true);
    expect(html).toContain('ux-ava-team');
    expect(html).toContain('class="ux-teamtag"');
    expect(html).toContain('href="/u/kpophistory"');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('Jungkook');
    expect(html).not.toMatch(/Lv \d/);
  });

  it('flag on, fan: photo and flair, no Team pill (unchanged)', async () => {
    const html = await render(true, false);
    expect(html).toContain('<img');
    expect(html).not.toContain('ux-teamtag');
    expect(html).toBe(await render(false, false));
  });

  it('flag off: a team author renders exactly like v11', async () => {
    expect(await render(false, true)).toBe(await render(false, false));
  });
});
