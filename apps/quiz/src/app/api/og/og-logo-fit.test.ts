// Run O1, lane LOGOS: the group OG cards draw groups.logo_url in a fixed square. The rows used to point at the
// deleted bucket game-images (HTTP 400 -> the abbreviation pill); they are repointed (docs/pending-migrations/logos)
// at the Commons group photo of the site, a WIDE picture. Satori stretches an <img> to its width and height unless
// objectFit is set, so the photo would be squashed. These tests pin what both routes hand to ImageResponse:
// the logo <img> carries objectFit "cover", and a logo that does not load (400, not an image, off-list host) still
// falls back to the pill, never a broken <img>.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { VERSE_LOGO_DATA_URI } from './verse/logo-data';

import type { ReactElement, ReactNode } from 'react';

type El = { type: unknown; props: { children?: ReactNode; style?: Record<string, unknown>; src?: string } };

let LOGO_URL: string | null = null;

vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(
      public element: ReactElement,
      public options: unknown,
    ) {}
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              name: 'TWICE', slug: 'twice', fandom_name: 'ONCE', display_color: '#ff5fa2', text_color: '#ffffff',
              logo_url: LOGO_URL, quiz_count: 12, total_plays: 3400,
            },
          }),
        }),
      }),
    }),
  }),
}));

function findImgs(node: ReactNode, out: El[] = []): El[] {
  if (Array.isArray(node)) {
    for (const n of node) findImgs(n, out);
    return out;
  }
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as unknown as El;
    if (el.type === 'img') out.push(el);
    findImgs(el.props.children, out);
  }
  return out;
}

/** The <img> tags that draw the group logo (the Verse card also carries its own brand mark, which is not one). */
function groupLogoImgs(el: ReactElement): El[] {
  return findImgs(el).filter((i) => i.props.src !== VERSE_LOGO_DATA_URI);
}

const PHOTO = 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/images/group-photos/twice.jpg';
const DEAD = 'https://rdkgouofytwfdpbxbzio.supabase.co/storage/v1/object/public/game-images/group/twice.jpg';

function stubFetch(status: number, type: string): void {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(new Uint8Array([1, 2, 3, 4]), { status, headers: { 'content-type': type } })));
}

async function elementOf(routePath: 'group' | 'verse'): Promise<ReactElement> {
  const mod = routePath === 'group' ? await import('./group/[slug]/route') : await import('./verse/[slug]/route');
  const res = (await mod.GET({} as never, { params: Promise.resolve({ slug: 'twice' }) })) as unknown as { element: ReactElement };
  return res.element;
}

describe.each(['group', 'verse'] as const)('og %s route logo', (which) => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    LOGO_URL = null;
  });

  it('draws a loaded logo with objectFit cover (a wide group photo is cropped, not squashed)', async () => {
    LOGO_URL = PHOTO;
    stubFetch(200, 'image/jpeg');
    const imgs = groupLogoImgs(await elementOf(which));
    expect(imgs).toHaveLength(1);
    expect(imgs[0]?.props.src).toMatch(/^data:image\/jpeg;base64,/);
    expect(imgs[0]?.props.style?.objectFit).toBe('cover');
  });

  it('falls back to the pill (no <img>) when the logo url answers 400, as the dead game-images rows did', async () => {
    LOGO_URL = DEAD;
    stubFetch(400, 'application/json');
    expect(groupLogoImgs(await elementOf(which))).toHaveLength(0);
  });

  it('falls back to the pill when the logo is null', async () => {
    LOGO_URL = null;
    stubFetch(200, 'image/jpeg');
    expect(groupLogoImgs(await elementOf(which))).toHaveLength(0);
  });

  it('falls back to the pill for a host next/image does not accept', async () => {
    LOGO_URL = 'https://example.invalid/logo.jpg';
    stubFetch(200, 'image/jpeg');
    expect(groupLogoImgs(await elementOf(which))).toHaveLength(0);
  });
});
