import { NextResponse } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

import type { NextRequest } from 'next/server';

// Hard wall-clock cap on the middleware. Supabase auth + any redirect logic
// must complete inside this window or we fail OPEN (anonymous) so a slow DB
// degrades auth instead of 504-ing the whole site.
const MIDDLEWARE_TIMEOUT_MS = 2500;

export async function middleware(request: NextRequest) {
  const passthrough = (): NextResponse =>
    NextResponse.next({ request: { headers: request.headers } });

  try {
    const result = await Promise.race([
      updateSession(request),
      new Promise<NextResponse>((resolve) => {
        setTimeout(() => {
          console.warn('[middleware] timeout after', MIDDLEWARE_TIMEOUT_MS, 'ms - failing open');
          resolve(passthrough());
        }, MIDDLEWARE_TIMEOUT_MS);
      }),
    ]);
    return result;
  } catch (err) {
    console.error('[middleware] top-level error - failing open:', err);
    return passthrough();
  }
}

export const config = {
  matcher: [
    // Skip Next internals, API routes, static assets, sitemap/robots, OG images.
    // Middleware only runs where a session might actually be needed.
    '/((?!api/|_next/static|_next/image|_next/data|favicon.ico|apple-touch-icon.png|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
