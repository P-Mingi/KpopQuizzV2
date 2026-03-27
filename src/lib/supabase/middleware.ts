import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/create', '/onboarding', '/settings', '/admin'];

// Known route prefixes - anything else from the old site gets 301 to homepage
const KNOWN_ROUTES = [
  '/', '/q/', '/g/', '/create', '/group/', '/u/', '/trending', '/new', '/most-liked',
  '/terms', '/privacy', '/search', '/guess-the-kpop-idol', '/kpop-true-or-false',
  '/easy-kpop-quizzes', '/hard-kpop-quizzes', '/kpop-quiz-2026',
  '/login', '/onboarding', '/settings', '/admin', '/banned', '/auth/', '/api/',
  '/sitemap.xml', '/robots.txt',
];

export async function updateSession(request: NextRequest): Promise<NextResponse> {
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

  const { data: { user } } = await supabase.auth.getUser();

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
    // Check if they have a profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

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
