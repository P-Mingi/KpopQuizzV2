// Daily games step 2: the server side of the Photos tab of the admin of bunnyverse.org/anime. The page has already passed the admin gate
// (app/sites/[site]/(anime)/admin/page.tsx: a signed-in account of ADMIN_USER_IDS, else the site's 404); this reads the lists with the
// service role (the pictures not verified yet and the drafts are the admin's only) and hands them to the board. The fonts are the board's
// and the Bunnyverse home's (DM Sans, DM Mono: components/hub/home/home-font.ts), scoped to this tab.
import { dmMono, dmSans } from '@/components/hub/home/home-font';
import { loadPhotosAdmin } from '@/lib/photos/admin-data';
import { tabOf } from '@/lib/photos/slots';
import { withBasePath } from '@/lib/site/base-path';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { PhotosAdmin } from './photos-admin';

import type { AdminNavItem } from './photos-admin';
import type { PhotosAdminData } from '@/lib/photos/admin-data';

export async function PhotosAdminPage({ nav, kind }: { nav: readonly AdminNavItem[]; kind?: string | string[] | undefined }): Promise<React.ReactElement> {
  let data: PhotosAdminData | null = null;
  try {
    data = await loadPhotosAdmin(createServiceRoleClient());
  } catch (err) {
    console.error('[photos-admin] read failed:', (err as Error)?.message ?? err);
  }
  const fonts = `${dmSans.variable} ${dmMono.variable}`;
  if (!data) {
    return (
      <div className={fonts} data-testid="photos-admin-error" style={{ padding: 24 }}>
        <h1>Photos</h1>
        <p>La base n&apos;a pas pu être lue. Recharge la page dans un instant.</p>
      </div>
    );
  }
  return (
    <div className={fonts} data-testid="photos-admin">
      <PhotosAdmin
        data={data}
        nav={nav}
        initialTab={tabOf(typeof kind === 'string' ? kind : undefined)}
        // The "now" of the server render, so the live, scheduled and draft versions read the same on the server and in the browser.
        now={Date.now()}
        logo={withBasePath('/mascot/mascot-default.png')}
        emptyArt={withBasePath('/mascot/mascot-think.png')}
      />
    </div>
  );
}
