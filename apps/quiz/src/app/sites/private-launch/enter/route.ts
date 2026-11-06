// Private launch (lib/private-launch/enter.ts): GET /auth/private-launch of the hub and anime builds, reached through the gate's rewrite
// (lib/private-launch/config.ts privateLaunchRewrites). A 404 with the gate off. On kpopquiz.org no rewrite leads here and every /sites
// path keeps its unknown-route answer in the middleware.
import { handleEnter } from '@/lib/private-launch/enter';
import { SITE_ID } from '@/lib/site/registry';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return handleEnter({
    site: SITE_ID,
    env: process.env,
    userId: async () => {
      const supabase = await createServerClient();
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
  });
}
