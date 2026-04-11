import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/create', '/onboarding', '/settings', '/admin'];

// Known route prefixes - anything else from the old site gets 301 to homepage
const KNOWN_ROUTES = [
  '/', '/q/', '/g/', '/games', '/blind-test', '/create', '/group/', '/u/', '/trending', '/new', '/most-liked',
  '/terms', '/privacy', '/search', '/guess-the-kpop-idol', '/kpop-true-or-false',
  '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
  '/login', '/onboarding', '/settings', '/admin', '/banned', '/auth/', '/api/',
  '/sitemap.xml', '/robots.txt',
  // New Phase 4 routes
  '/hall-of-fame', '/quizzes', '/profile',
];

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

  // Middleware runs on every request and MUST NOT throw. On any Supabase
  // hiccup (rate limit, transient network, schema cache) we treat the user
  // as anonymous and let the request proceed to the page handler.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
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

  // Redirect old/unknown paths to homepage (preserves link equity)
  const isKnownRoute = pathname === '/'
    || KNOWN_ROUTES.some((r) => r !== '/' && pathname.startsWith(r))
    || pathname.endsWith('-quiz') // /bts-quiz, /blackpink-quiz, etc.
    || pathname.endsWith('-trivia'); // /bts-trivia, /blackpink-trivia, etc.
  if (!isKnownRoute) {
    return NextResponse.redirect(new URL('/', request.url), 301);
  }

  return response;
}
