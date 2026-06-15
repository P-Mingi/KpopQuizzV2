import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

// Called only for paths that actually need a session: /login + PROTECTED_PATHS
// (/onboarding, /settings, /admin). Public traffic is gated in middleware.ts
// and never reaches this function, so it never pays the Supabase round trip.
const PROTECTED_PATHS = ['/onboarding', '/settings', '/admin'];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  try {
    return await updateSessionInner(request);
  } catch (err) {
    // Last-resort safety net: if anything in the middleware throws, let the
    // request through untouched rather than returning a 500. Auth / SEO
    // redirects won't apply for this request, but at least the page loads.
    console.error('[middleware] unhandled error, passing request through:', err);
    return NextResponse.next({ request: { headers: request.headers } });
  }
}

async function updateSessionInner(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Middleware runs on every request and MUST NOT throw or hang. Defense in
  // depth: an inner 1500ms race sits BELOW the top-level 2500ms cap in
  // middleware.ts so a hung auth call degrades to "anonymous" while still
  // letting the redirect logic below run (protected paths, /login bounce).
  let user: { id: string } | null = null;
  try {
    const AUTH_TIMEOUT_MS = 1500;
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<{ data: { user: null } }>((resolve) =>
        setTimeout(() => {
          console.warn('[middleware] auth.getUser timed out after', AUTH_TIMEOUT_MS, 'ms - anonymous');
          resolve({ data: { user: null } });
        }, AUTH_TIMEOUT_MS),
      ),
    ]);
    user = result?.data?.user ?? null;
  } catch (err) {
    console.error('[middleware] auth.getUser failed, treating as anonymous:', err);
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));

  // Redirect unauthenticated users from protected paths to login
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from login page
  if (pathname === '/login' && user) {
    // Check if they have a profile (swallow any error and assume they do)
    let profile: { id: string } | null = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();
      profile = data;
    } catch (err) {
      console.error('[middleware] profile lookup failed:', err);
    }

    if (!profile) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
