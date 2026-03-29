import { createMiddlewareClient } from '@kpopquiz/shared/supabase/middleware';

import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase, getResponse } = createMiddlewareClient(request);

  // Refresh session (required for Supabase auth to work with SSR)
  await supabase.auth.getUser();

  return getResponse();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
