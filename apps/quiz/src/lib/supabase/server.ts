import { createServerClient as createClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';

export async function createServerClient() {
  const cookieStore = await cookies();
  // FandomVerse (security review, 2026-10-28): on the hub and anime builds the session cookies carry Secure over https (the
  // forwarded proto) and always on a production deployment, the rule of lib/auth/session-cookie.ts, written out here so the
  // kpop module graph stays the one of before. kpop passes no cookie option, exactly as before, and reads no header here.
  const world = (process.env.NEXT_PUBLIC_SITE_ID || 'kpop') !== 'kpop';
  const proto = world ? (await headers()).get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase() : undefined;
  const secure = world && (process.env.VERCEL_ENV === 'production' || proto === 'https');

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(secure ? { cookieOptions: { secure: true } } : {}),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // set() fails in Server Components (read-only).
              // Middleware handles session refresh.
            }
          });
        },
      },
    }
  );
}

/** Service role client that bypasses RLS. Use only in admin API routes. */
export function createServiceRoleClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Cookie-free anon-key client for PUBLIC reads in server components. Use this
 * whenever the data is the same for everyone (catalog browse, public Q of the
 * day, groups list, leaderboard rows). Because it never calls cookies(), the
 * caller stays static/ISR-cacheable. RLS still applies (anon role).
 *
 * Do NOT use for user-specific reads or anything that depends on the signed-in
 * session - use createServerClient for those.
 */
export function createPublicReadClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
