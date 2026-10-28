import { createBrowserClient as createClient } from '@supabase/ssr';

// FandomVerse (security review, 2026-10-28): on the hub and anime builds the session cookies carry Secure when the page is
// served over https. The test is the build-time constant (inlined), so the kpop bundle keeps today's call, with no option.
const IS_WORLD_BUILD = (process.env.NEXT_PUBLIC_SITE_ID || 'kpop') !== 'kpop';

export function createBrowserClient() {
  if (IS_WORLD_BUILD) {
    const secure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, secure ? { cookieOptions: { secure: true } } : {});
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
